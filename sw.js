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

// 🔴 TG-026 runda 3, problema 2 (masurat de lider pe tableta reala, 20.09.2026):
// un singur cache `tegn-offline-1f1e505e14d8` cu 719 din 921 de intrari, 22 de
// pictograme rupte pe ecran, 0 din 22 gasite cu `caches.match` (nici cu
// ignoreSearch/ignoreVary). Cauza: `activate` stergea TOATE cache-urile vechi pe
// loc, iar umplerea celui nou (loturi de 40) continua DUPA aceea; Cristian a
// trecut pe modul avion in mijlocul descarcarii -> singura copie completa
// (cea veche) fusese deja stearsa.
//
// Regula acum:
//   1. cache-ul vechi se sterge DOAR cand cel nou are TOATE fisierele din lista;
//   2. pana atunci, `fetch` cauta in cel nou INTAI, apoi in cele vechi;
//   3. la urmatoarea pornire cu retea, umplerea se RELUA de unde a ramas
//      (doar fisierele lipsa), nu de la zero si fara „gata" fals.
// „Complet" nu e un steag scris undeva (un steag poate minti dupa o stergere de
// spatiu): se MASOARA, comparand cheile din cache cu lista.

// Cheile din cache sunt URL-uri absolute (`baza + cale`); lista are cai relative.
function bazaScope() {
  try {
    if (self.registration && self.registration.scope) return self.registration.scope;
  } catch (e) {}
  try {
    if (self.location && self.location.href) return self.location.href.replace(/[^\/]*$/, "");
  } catch (e) {}
  return "";
}

function caiLipsa(chei) {
  var baza = bazaScope();
  var prezente = {};
  chei.forEach(function (cheie) {
    var url = String((cheie && cheie.url) || cheie).split("?")[0];
    if (baza && url.indexOf(baza) === 0) url = url.slice(baza.length);
    prezente[url] = true;
  });
  return FISIERE.filter(function (cale) { return !prezente[cale]; });
}

// RELUARE: se cer doar fisierele care lipsesc, nu toata lista.
function umple(cache) {
  return cache.keys().then(function (chei) {
    var seturi = loturi(caiLipsa(chei), MARIME_LOT);
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
    }, Promise.resolve()).then(function () {
      // TG-030 I2: singurul moment in care continutul unei adrese se poate schimba
      // sub memoria de blob-uri (pana acum raspundea cache-ul VECHI, acum e adus in
      // cel nou). Golirea e ieftina si se face o data per umplere, nu per cerere.
      golesteMemoriaDeBlob();
    });
  });
}

function esteComplet(cache) {
  return cache.keys().then(function (chei) { return caiLipsa(chei).length === 0; });
}

// Sterge cache-urile vechi DOAR daca cel nou e complet. Intoarce `true` daca a sters.
function stergeCacheurileVechiDacaSuntemCompleti() {
  return caches.open(NUME_CACHE).then(esteComplet).then(function (complet) {
    if (!complet) return false;
    return caches.keys().then(function (nume) {
      return Promise.all(
        nume
          .filter(function (n) { return n.indexOf("tegn-offline-") === 0 && n !== NUME_CACHE; })
          .map(function (n) { return caches.delete(n); })
      );
    }).then(function () { return true; });
  });
}

function umpleSiCurata() {
  return caches.open(NUME_CACHE)
    .then(umple)
    .then(stergeCacheurileVechiDacaSuntemCompleti);
}

// O singura reluare per pornire de service worker (worker-ul e oprit si repornit
// des de sistem; `install`/`activate` ruleaza o singura data per versiune).
var umplereInCurs = null;
function reiaUmplerea() {
  if (!umplereInCurs) {
    umplereInCurs = umpleSiCurata().catch(function (eroare) {
      try { console.warn("Tegn sw: reluarea umplerii a picat", eroare); } catch (e) {}
      umplereInCurs = null;   // fara retea acum -> se mai incearca o data mai tarziu
      return false;
    });
  }
  return umplereInCurs;
}
self.TEGN_SW_RELUARE = reiaUmplerea;   // punct de prindere pentru probe

self.addEventListener("install", function (eveniment) {
  eveniment.waitUntil(
    umpleSiCurata().then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (eveniment) {
  eveniment.waitUntil(
    stergeCacheurileVechiDacaSuntemCompleti().then(function () {
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
// 🟡 TG-030 I2 (auditul de securitate 22.09.2026, grad INFORMATIV; reparate toate,
// indiferent de grad — decizia lui Cristian, 22.09.2026 12:37): `raspuns.blob()`
// materializeaza mp3-ul INTREG, iar elementul `<audio>` cere acelasi fisier de mai
// multe ori la rand, cu `Range` diferit (asa functioneaza pipeline-ul media). Deci
// fisierul se citea din cache de 2-3 ori per cuvant, pe tableta copilului.
// Aici: ultimele `MEMO_MAX` fisiere raman la indemana, dupa ADRESA lor.
//   · plafon, nu memorie nemarginita — un cache fara plafon pe o tableta e chiar
//     problema pe care o rezolvam, doar mutata;
//   · cheia e ADRESA ceruta: fara ea, al doilea fisier ar primi octetii primului;
//   · memoria se goleste dupa fiecare umplere de cache (`umple`): atunci si numai
//     atunci continutul unei adrese se poate schimba sub noi (raspunsul venea din
//     cache-ul VECHI, iar cel nou tocmai l-a adus).
var MEMO_MAX = 4;
var memoBlob = [];

function golesteMemoriaDeBlob() {
  memoBlob = [];
}

function blobulRaspunsului(raspuns, adresa) {
  if (adresa) {
    for (var i = 0; i < memoBlob.length; i++) {
      if (memoBlob[i].adresa === adresa) return Promise.resolve(memoBlob[i].blob);
    }
  }
  return raspuns.blob().then(function (blob) {
    if (adresa) {
      memoBlob.push({ adresa: adresa, blob: blob });
      while (memoBlob.length > MEMO_MAX) memoBlob.shift();
    }
    return blob;
  });
}

function raspunsPartialDinCache(raspuns, antetRange, adresa) {
  return blobulRaspunsului(raspuns, adresa).then(function (blob) {
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

// TG-026 runda 3: ORDINEA conteaza. `caches.match()` global cauta in TOATE
// cache-urile, dar in ordinea crearii — adica cel VECHI primul, deci ar servi
// cod vechi cat timp cele doua coexista. Aici: cel nou INTAI, cele vechi ca
// rezerva (acolo stau fisierele pe care cel nou nu le-a apucat inca).
function cautaInCacheuri(cerere) {
  var inCelNou;
  try {
    inCelNou = caches.open(NUME_CACHE).then(function (cache) {
      return cache.match(cerere, OPTIUNI_POTRIVIRE);
    });
  } catch (e) {
    inCelNou = Promise.resolve(undefined);
  }
  return Promise.resolve(inCelNou).catch(function () { return undefined; }).then(function (r) {
    if (r) return r;
    return caches.match(cerere, OPTIUNI_POTRIVIRE);
  });
}

self.addEventListener("fetch", function (eveniment) {
  var cerere = eveniment.request;
  if (cerere.method !== "GET") return;
  var antetRange = (cerere.headers && cerere.headers.get) ? cerere.headers.get("range") : null;

  // reluarea umplerii la prima cerere de dupa pornirea worker-ului (vezi 🔴 mai sus)
  try { eveniment.waitUntil(reiaUmplerea()); } catch (e) {}

  eveniment.respondWith(
    cautaInCacheuri(cerere).then(function (raspunsDinCache) {
      if (raspunsDinCache) {
        // TG-030 I2: adresa ceruta e CHEIA memoriei de blob-uri (vezi
        // `blobulRaspunsului`) — fara ea, al doilea fisier ar primi octetii primului.
        if (antetRange) return raspunsPartialDinCache(raspunsDinCache, antetRange, cerere.url);
        return raspunsDinCache;
      }
      return fetch(cerere).then(function (raspunsRetea) {
        return raspunsRetea;
      }).catch(function () {
        // fara retea si fara cache pentru cererea asta — nimic de oferit.
        // TG-030 I3 (auditul de securitate 22.09.2026): `statusText` NU mai poarta
        // `cerere.url`. Adresa ceruta nu spune nimic in plus celui care depaneaza
        // (o vede deja in fila Network, langa raspuns), dar `statusText` ajunge in
        // locuri pe care pagina nu le controleaza — jurnale de browser, rapoarte de
        // eroare, extensii. Un raspuns de eroare poarta motivul, nu datele cererii.
        return new Response("", { status: 504, statusText: "Tegn: offline, fara cache" });
      });
    })
  );
});
