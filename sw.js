// Tegn — service worker (TG-012, PWA offline). Vanilla, fara framework.
//
// Strategie: cache-first pentru tot ce e in TEGN_LISTA_OFFLINE (js/lista_offline.js,
// GENERAT de unelte/genereaza_lista_offline.py — nu se editeaza de mana), retea ca
// rezerva pentru orice altceva. Instalarea pune fisierele in cache in LOTURI (nu
// intr-un singur cache.addAll pe ~900 de fisiere) — un lot care pica nu trebuie sa
// darame instalarea intreaga; aplicatia trebuie sa ramana utila si cu cache partial.
//
// Cai RELATIVE peste tot (GitHub Pages serveste dintr-un subfolder /<depozit>/):
// niciun "/" la inceputul unei cai aici.

"use strict";

importScripts("js/lista_offline.js");

var VERSIUNE = (self.TEGN_LISTA_OFFLINE_VERSIUNE || "necunoscuta");
var NUME_CACHE = "tegn-offline-" + VERSIUNE;
var FISIERE = self.TEGN_LISTA_OFFLINE || [];
var MARIME_LOT = 40;

function loturi(lista, marime) {
  var rezultat = [];
  for (var i = 0; i < lista.length; i += marime) {
    rezultat.push(lista.slice(i, i + marime));
  }
  return rezultat;
}

self.addEventListener("install", function (eveniment) {
  eveniment.waitUntil(
    caches.open(NUME_CACHE).then(function (cache) {
      var seturi = loturi(FISIERE, MARIME_LOT);
      // un lot care pica (fisier lipsa, retea intrerupta) nu opreste restul —
      // se raporteaza in consola, nu arunca exceptia mai departe.
      return seturi.reduce(function (promisiune, lot) {
        return promisiune.then(function () {
          return Promise.all(
            lot.map(function (cale) {
              return cache.add(cale).catch(function (eroare) {
                try { console.warn("Tegn sw: nu am putut pune in cache", cale, eroare); } catch (e) {}
              });
            })
          );
        });
      }, Promise.resolve());
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (eveniment) {
  eveniment.waitUntil(
    caches.keys().then(function (nume) {
      return Promise.all(
        nume
          .filter(function (n) { return n.indexOf("tegn-offline-") === 0 && n !== NUME_CACHE; })
          .map(function (n) { return caches.delete(n); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// TG-026 problema 4 (20.09.2026, tableta Android, Chrome 101): FARA internet,
// unele cuvinte din propozitie nu se auzeau din mp3 si cadeau pe rezerva
// `speechSynthesis`; CU internet mergeau toate. Lista offline e completa (614
// `.mp3` pe disc, 614 in `js/lista_offline.js`), deci fisierul ERA in cache.
// Mecanismul: un element `<audio>` nu cere fisierul intreg — cere bucati, cu
// antetul `Range: bytes=...`. `caches.match()` potriveste dupa URL si ignora
// antetul, deci raspundea cu 200 si fisierul INTREG la o cerere partiala.
// Un raspuns 200 la o cerere cu `Range` e in afara contractului HTTP: pipeline-ul
// media al lui Chrome il refuza la unele fisiere, elementul arunca `error`, iar
// `redaCuvant` (js/app.js) trece pe rezerva vorbita. CU internet nu se vedea,
// fiindca reteaua raspunde corect cu 206.
// Aici se construieste raspunsul 206 din chiar octetii din cache.
function raspunsPartialDinCache(raspuns, antetRange) {
  return raspuns.blob().then(function (blob) {
    var total = blob.size;
    var m = /^bytes=(\d*)-(\d*)$/.exec(String(antetRange).trim());
    // un `Range` pe care nu stim sa-l taiem (mai multe intervale, unitate
    // necunoscuta): raspundem ca pana acum, cu fisierul intreg — nu inrautatim.
    if (!m || (m[1] === "" && m[2] === "")) return raspuns;
    var start, sfarsit;
    if (m[1] === "") {
      var ultimii = parseInt(m[2], 10);
      if (!(ultimii > 0)) return raspuns;
      start = Math.max(0, total - ultimii);
      sfarsit = total - 1;
    } else {
      start = parseInt(m[1], 10);
      sfarsit = (m[2] === "") ? total - 1 : parseInt(m[2], 10);
    }
    if (!(start >= 0) || start >= total) {
      return new Response("", {
        status: 416,
        statusText: "Range Not Satisfiable",
        headers: { "Content-Range": "bytes */" + total }
      });
    }
    if (!(sfarsit >= start) || sfarsit > total - 1) sfarsit = total - 1;
    var felie = blob.slice(start, sfarsit + 1);
    return new Response(felie, {
      status: 206,
      statusText: "Partial Content",
      headers: {
        "Content-Type": raspuns.headers.get("Content-Type") || blob.type || "application/octet-stream",
        "Content-Range": "bytes " + start + "-" + sfarsit + "/" + total,
        "Content-Length": String(felie.size),
        "Accept-Ranges": "bytes"
      }
    });
  });
}

// `ignoreSearch`: pagina cere `css/style.css?v=1`, `js/app.js?v=1`... (index.html),
// dar in cache cheile sunt fara coada (`js/lista_offline.js` le listeaza asa) —
// fara asta, fiecare fisier cu `?v=` rata cache-ul si, fara retea, primea 504.
// `ignoreVary`: potrivirea se face dupa URL, nu dupa antetele cererii — altfel
// cererea cu `Range` a elementului `<audio>` putea sa nu mai gaseasca intrarea.
var OPTIUNI_POTRIVIRE = { ignoreSearch: true, ignoreVary: true };

self.addEventListener("fetch", function (eveniment) {
  var cerere = eveniment.request;
  if (cerere.method !== "GET") return;
  var antetRange = (cerere.headers && cerere.headers.get) ? cerere.headers.get("range") : null;

  eveniment.respondWith(
    caches.match(cerere, OPTIUNI_POTRIVIRE).then(function (raspunsDinCache) {
      if (raspunsDinCache) {
        if (antetRange) return raspunsPartialDinCache(raspunsDinCache, antetRange);
        return raspunsDinCache;
      }
      return fetch(cerere).then(function (raspunsRetea) {
        return raspunsRetea;
      }).catch(function () {
        // fara retea si fara cache pentru cererea asta — nimic de oferit.
        return new Response("", { status: 504, statusText: "Tegn: offline, fara cache pentru " + cerere.url });
      });
    })
  );
});
