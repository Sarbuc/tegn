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

self.addEventListener("fetch", function (eveniment) {
  var cerere = eveniment.request;
  if (cerere.method !== "GET") return;

  eveniment.respondWith(
    caches.match(cerere).then(function (raspunsDinCache) {
      if (raspunsDinCache) return raspunsDinCache;
      return fetch(cerere).then(function (raspunsRetea) {
        return raspunsRetea;
      }).catch(function () {
        // fara retea si fara cache pentru cererea asta — nimic de oferit.
        return new Response("", { status: 504, statusText: "Tegn: offline, fara cache pentru " + cerere.url });
      });
    })
  );
});
