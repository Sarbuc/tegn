// Tegn — logica aplicatiei: tabla de pictograme, banda de propozitie, citire audio.
// Mod LIBER: fara scor, fara corect/gresit — Tegn exprima, nu invata (vezi CONCEPT.md).

(function () {
  "use strict";

  var CHEIE_LIMBA = "tegn_limba";
  // TG-015 (19.09.2026): ordinea barei de sectiuni, decisa de Cristian
  // (dosar/decizii/TG-015.md) — inlocuieste ORDINE_CATEGORII veche, care avea
  // doar 5 din cele 10 categorii din js/vocabular.js (bug preexistent, TG-005
  // adaugase locuri/timp/descriptori/intrebari/culori fara sa mai atinga
  // ORDINE_CATEGORII — masurat, nu presupus: `grep -c` pe fisierul vechi).
  // TG-020 (19.09.2026): "animale" adaugata la coada - Cristian n-a cerut o
  // pozitie anume, doar sectiunea noua (dosar/decizii/TG-020.md).
  // TG-021 (19.09.2026): "matematica" adaugata la coada - Cristian n-a cerut
  // o pozitie anume, doar sectiunea noua (dosar/decizii/TG-021.md).
  var ORDINE_SECTIUNI = [
    "persoane", "verbe", "obiecte", "stari", "social",
    "locuri", "timp", "descriptori", "intrebari", "culori", "animale", "matematica"
  ];

  // Pictograma barei de sectiuni: un id din vocabular care reprezinta sectiunea
  // (cerinta TG-015 punctul 2) — nu se descarca nimic nou, doar se refoloseste.
  var ICOANA_SECTIUNE = {
    persoane: "eu", verbe: "vreau", obiecte: "mancare", stari: "fericit",
    social: "buna", locuri: "scoala", timp: "azi", descriptori: "mare",
    intrebari: "ce", culori: "rosu", animale: "caine", matematica: "mat_7"
  };

  // Corectura 12:29 (semnalata de Cristian, captura): "afara" si "acasa" AU
  // categorie: "locuri" direct in js/vocabular.js (schimbat la sursa, cu
  // culoarea Locuri #4db6ac masurata pe celelalte intrari "locuri") — NU se
  // mai muta la randare. Varianta veche (mutare doar la randare, cu culoarea
  // de obiecte ramasa in date) facea cartonasele portocalii intr-o sectiune
  // verde-albastra; vezi predarea TG-015, sectiunea "Corectura 12:29".

  // TG-015 punctul 3: Ting (categoria "obiecte", 56 de cuvinte) se sparge in 5
  // grupuri — lista confirmata de Cristian, dosar/decizii/TG-015.md. Fiecare id
  // trebuie sa existe o singura data intr-un grup (verificat de
  // unelte/test_tg015_bara_sectiuni.py).
  var TEGN_GRUPURI = {
    mancare: {
      ro: "Mâncare", nb: "Mat", icoana: "mancare",
      items: ["mancare", "paine", "mar", "banana", "biscuiti", "supa", "oua",
        "branza", "iaurt", "prajitura", "portocala", "cartofi", "morcov", "ciocolata"]
    },
    bauturi: {
      ro: "Băuturi", nb: "Drikke", icoana: "apa",
      items: ["apa", "lapte", "suc", "ceai"]
    },
    haine: {
      ro: "Haine", nb: "Klær", icoana: "haine",
      items: ["haine", "pantofi", "camasa", "pantaloni", "tricou", "sosete", "jacheta", "caciula"]
    },
    scoala: {
      ro: "Jucării și școală", nb: "Leker og skole", icoana: "carte",
      items: ["minge", "jucarie", "puzzle", "bicicleta", "carte", "caiet",
        "creion", "hartie", "foarfeca", "lipici", "rucsac"]
    },
    acasa: {
      ro: "Acasă", nb: "Hjemme", icoana: "scaun",
      items: ["scaun", "masa", "pat", "usa", "lumina", "cheie", "geanta", "bani",
        "perna", "patura", "telefon", "televizor", "tableta", "masina", "prosop",
        "periuta", "sapun"]
    }
  };
  var ORDINE_GRUPURI = ["mancare", "bauturi", "haine", "scoala", "acasa"];

  // TG-018 runda 2 (19.09.2026, dosar/decizii/TG-018.md, "Completari" 13:58/14:08):
  // subgrupe pe TOATE sectiunile, lista data de Cristian (potrivita pe `ro`,
  // NU ghicita pe id - fiecare cuvant verificat contra js/vocabular.js).
  // Intrebari (9) si Culori (11) raman FARA subgrupe (bare egale, ca inainte).
  // Numele "nb" sunt traduceri NEVERIFICATE de vorbitor nativ (perioada de
  // proba, .claude/rules/norvegiana.md) - listate in predare pentru verificarea
  // nativa viitoare.
  var SUBGRUPE_PERSOANE = {
    pronume: { ro: "Pronume", nb: "Pronomen", items: ["eu", "tu", "el", "ea", "noi", "voi", "ei"] },
    familie: {
      ro: "Familie", nb: "Familie",
      items: ["mama", "tata", "frate", "sora", "bunica", "bunic", "verisor", "verisoara", "unchi", "matusa"]
    },
    altii: { ro: "Alți oameni", nb: "Andre folk", items: ["invatatoare", "doctor", "prieten"] }
  };
  var ORDINE_PERSOANE = ["pronume", "familie", "altii"];

  var SUBGRUPE_VERBE = {
    vreausipot: {
      ro: "Vreau și pot", nb: "Vil og kan",
      items: ["vreau", "pot", "am", "sunt", "fac", "stiu", "inteleg", "imiplace", "numiplace", "cer", "primesc", "gandesc"]
    },
    ingrijire: {
      ro: "Mâncare și îngrijire", nb: "Mat og stell",
      items: ["beau", "mananc", "dorm", "spal", "spalpedinti", "imbrac", "ajut"]
    },
    miscare: {
      ro: "Mișcare", nb: "Bevegelse",
      items: ["merg", "vin", "stau", "sar", "alerg", "cad", "astept", "duc", "impinge", "trag", "arunc", "prind", "opresc", "incep"]
    },
    joaca: {
      ro: "Joacă și școală", nb: "Lek og skole",
      items: ["joc", "citesc", "desenez", "cant", "ascult", "invat", "construiesc", "termin", "uit"]
    },
    maini: { ro: "Cu mâinile", nb: "Med hendene", items: ["dau", "iau", "arat", "deschid", "inchid", "gasesc", "pierd"] },
    simtsispun: { ro: "Simt și spun", nb: "Føler og sier", items: ["vad", "spun", "plang", "rad", "strig", "amintesc"] }
  };
  var ORDINE_VERBE = ["vreausipot", "ingrijire", "miscare", "joaca", "maini", "simtsispun"];

  var SUBGRUPE_STARI = {
    corp: { ro: "Corpul meu", nb: "Kroppen min", items: ["foame", "sete", "doare", "bolnav", "obosit", "bine"] },
    bine: { ro: "Mă simt bine", nb: "Jeg føler meg bra", items: ["fericit", "calm", "curios", "mandru", "surprins"] },
    rau: {
      ro: "Mă simt rău", nb: "Jeg føler meg dårlig",
      items: ["trist", "suparat", "teama", "plictisit", "ingrijorat", "rusinat", "gelos", "nerabdator", "singur"]
    }
  };
  var ORDINE_STARI = ["corp", "bine", "rau"];

  var SUBGRUPE_SOCIAL = {
    raspunsuri: { ro: "Răspunsuri", nb: "Svar", items: ["da", "nu", "stop", "gata", "hai", "ajutor"] },
    politete: { ro: "Politețe", nb: "Høflighet", items: ["terog", "multumesc", "poftim", "scuze", "parererau", "bravo"] },
    salut: {
      ro: "Salut", nb: "Hilsen",
      items: ["buna", "pa", "larevedere", "noaptebuna", "bunvenit", "felicitari", "noroc", "sanatate"]
    }
  };
  var ORDINE_SOCIAL = ["raspunsuri", "politete", "salut"];

  var SUBGRUPE_LOCURI = {
    acasa: { ro: "Acasă", nb: "Hjemme", items: ["acasa", "camera", "bucatarie", "baie", "curte", "garaj"] },
    oras: {
      ro: "În oraș", nb: "I byen",
      items: ["scoala", "magazin", "spital", "biblioteca", "biserica", "oras", "piscina", "terendejoaca"]
    },
    afara: { ro: "Afară", nb: "Ute", items: ["afara", "parc", "gradina", "plaja", "padure", "munte"] }
  };
  var ORDINE_LOCURI = ["acasa", "oras", "afara"];

  var SUBGRUPE_TIMP = {
    cand: {
      ro: "Când", nb: "Når",
      items: ["acum", "maitarziu", "azi", "maine", "ieri", "dimineata", "seara", "noaptea"]
    },
    zilele: {
      ro: "Zilele", nb: "Dagene",
      items: ["luni", "marti", "miercuri", "joi", "vineri", "sambata", "duminica", "saptamana", "luna"]
    },
    cum: { ro: "Cum", nb: "Hvordan", items: ["repede", "incet"] }
  };
  var ORDINE_TIMP = ["cand", "zilele", "cum"];

  var SUBGRUPE_DESCRIPTORI = {
    marime: { ro: "Mărime", nb: "Størrelse", items: ["mare", "mic", "lung", "scurt", "inalt", "mult", "putin", "greu"] },
    simte: {
      ro: "Cum se simte", nb: "Hvordan det føles",
      items: ["cald", "rece", "moale", "tare", "ud", "uscat", "usor", "plin", "gol"]
    },
    arata: {
      ro: "Cum arată", nb: "Hvordan det ser ut",
      items: ["curat", "murdar", "frumos", "urat", "nou", "intuneric", "luminos", "tacut"]
    }
  };
  var ORDINE_DESCRIPTORI = ["marime", "simte", "arata"];

  // TG-020 (19.09.2026, dosar/decizii/TG-020.md, varianta "A" aleasa de
  // Cristian, 15:59): sectiunea noua "Animale", 4 subgrupe x 6, specific
  // norvegian (elan, ren - animale scandinave, alaturi de restul).
  var SUBGRUPE_ANIMALE = {
    mamifere: { ro: "Mamifere", nb: "Pattedyr", items: ["elan", "ren", "vulpe", "urs", "iepure", "veverita"] },
    pasari: { ro: "Păsări", nb: "Fugler", items: ["pescarus", "cioara", "bufnita", "vultur", "rata", "lebada"] },
    mare: { ro: "Din mare", nb: "I havet", items: ["peste", "somon", "balena", "foca", "crab", "meduza"] },
    casa: { ro: "De casă și fermă", nb: "Husdyr", items: ["caine", "pisica", "cal", "vaca", "oaie", "gaina"] }
  };
  var ORDINE_ANIMALE = ["mamifere", "pasari", "mare", "casa"];

  // TG-021 (19.09.2026, dosar/decizii/TG-021.md): sectiunea noua "Matematica",
  // 4 subgrupe - ordinea exacta ceruta de Cristian (chat 20:43): 0-9, 10-100,
  // Forme, Semne.
  var SUBGRUPE_MATEMATICA = {
    numere09: {
      ro: "0–9", nb: "0–9",
      items: ["mat_0", "mat_1", "mat_2", "mat_3", "mat_4", "mat_5", "mat_6", "mat_7", "mat_8", "mat_9"]
    },
    numere10100: {
      ro: "10–100", nb: "10–100",
      items: ["mat_10", "mat_20", "mat_30", "mat_40", "mat_50", "mat_60", "mat_70", "mat_80", "mat_90", "mat_100"]
    },
    forme: {
      ro: "Forme", nb: "Former",
      items: ["mat_cerc", "mat_patrat", "mat_triunghi", "mat_dreptunghi", "mat_stea", "mat_inima"]
    },
    semne: {
      ro: "Semne", nb: "Regnetegn",
      items: ["mat_minus", "mat_plus", "mat_impartit", "mat_ori"]
    }
  };
  var ORDINE_MATEMATICA = ["numere09", "numere10100", "forme", "semne"];

  // Harta generica: sectiune -> { ordine, grupuri }. Obiecte (Ting) reutilizeaza
  // TEGN_GRUPURI/ORDINE_GRUPURI de mai sus (neschimbate, deja probate la runda 1).
  // Intrebari si Culori NU apar aici - randeazaTabla() cade pe bare egale pentru
  // orice sectiune absenta din harta.
  var SECTIUNI_SUBGRUPE = {
    obiecte: { ordine: ORDINE_GRUPURI, grupuri: TEGN_GRUPURI },
    persoane: { ordine: ORDINE_PERSOANE, grupuri: SUBGRUPE_PERSOANE },
    verbe: { ordine: ORDINE_VERBE, grupuri: SUBGRUPE_VERBE },
    stari: { ordine: ORDINE_STARI, grupuri: SUBGRUPE_STARI },
    social: { ordine: ORDINE_SOCIAL, grupuri: SUBGRUPE_SOCIAL },
    locuri: { ordine: ORDINE_LOCURI, grupuri: SUBGRUPE_LOCURI },
    timp: { ordine: ORDINE_TIMP, grupuri: SUBGRUPE_TIMP },
    descriptori: { ordine: ORDINE_DESCRIPTORI, grupuri: SUBGRUPE_DESCRIPTORI },
    animale: { ordine: ORDINE_ANIMALE, grupuri: SUBGRUPE_ANIMALE },
    matematica: { ordine: ORDINE_MATEMATICA, grupuri: SUBGRUPE_MATEMATICA }
  };

  // TG-018 (19.09.2026, dosar/decizii/TG-018.md, varianta "A"): tabla e acum
  // un rand de BARE VERTICALE, una langa alta, fiecare cu derularea EI —
  // Cristian, cu o captura PECS: "toate pictogramele dintr-o selectie vor fi
  // pe niste bare verticale ... la noi va fi rasturnat". Randul de grupuri
  // din TG-015 (a doua bara-sectiuni, cu Mancare/Bauturi/...) DISPARE — fiecare
  // grup e acum o bara proprie, toate vizibile deodata. `grupAles` a fost
  // scos CURAT (mai jos): nu mai exista "grup ales", toate grupurile se vad.
  // Mecanism unic (JS+CSS) pentru nr. de bare pe sectiunile FARA grupuri
  // (Persoane, Verbe, ...): LATIME_MIN_BARA e SINGURA sursa - JS o citeste ca
  // sa calculeze cate bare incap (impartInBareEgale), iar bara primeste chiar
  // aceasta latime prin style.width (nu o valoare CSS separata care ar putea
  // sa diveraga). Vezi predarea TG-018 pentru masuratorile pe 400/1366 px.
  // 134 (nu 140): Cristian, 19.09.2026 15:40 - panourile au latimea celor 8
  // urgente (856px liberi in tabla); 6 bare x 134 + 5 goluri x 10 = 854.
  var LATIME_MIN_BARA = 134;
  var MAX_BARE = 6;

  // TG-011 (19.09.2026): cereri rapide — lista dată de Cristian (chat, 13:04
  // ceas de hook), dosar/decizii/TG-011.md. UN SINGUR loc, ușor de schimbat
  // (TG-016 o va face configurabilă). Ordinea e cea a lui, nu se rearanjează.
  var TEGN_CERERI_RAPIDE = ["stop", "ajutor", "doare", "nu", "baie", "apa", "mancare", "terog"];

  // ---------------------------------------------------------- zoom (TG-019)
  // Mecanism identic AIR (2. AIR/js/app.js:5299-5397): `zoom` CSS pe
  // #ecran, NU transform; controlul (- % +) creat pe document.body, ÎN AFARA
  // #ecran, ca să rămână la aceeași mărime reală la orice factor. Cheie
  // localStorage PROPRIE (`tegn_zoom`, nu `AIR_zoom`) - cele două
  // aplicații nu împart stare.
  var CHEIE_ZOOM = "tegn_zoom";
  var ZOOM_MIN = 0.7, ZOOM_MAX = 1.3, ZOOM_PAS = 0.1;

  // ------------------------------------------------- viteza citirii (TG-028)
  // Cheie PROPRIE localStorage (tine minte pe aparat, ca zoom-ul/limba de mai
  // sus - fara cont, fara retea). Treptele: 0,6 · 0,8 · 1 · 1,2 (propuse in
  // promptul de sarcina); implicit = viteza de azi (1). Se aplica in
  // redaCuvant() (mai jos), UN SINGUR loc prin care trec si banda ("Les"), si
  // cererile rapide, si atingerea unei singure pictograme (sunetAtingere).
  var CHEIE_VITEZA = "tegn_viteza";
  var TREPTE_VITEZA = [0.6, 0.8, 1, 1.2];
  var VITEZA_IMPLICITA = 1;

  function citesteViteza() {
    try {
      var v = parseFloat(localStorage.getItem(CHEIE_VITEZA));
      if (TREPTE_VITEZA.indexOf(v) !== -1) return v;
    } catch (e) {}
    return VITEZA_IMPLICITA;
  }

  function salveazaViteza(v) {
    try { localStorage.setItem(CHEIE_VITEZA, String(v)); } catch (e) {}
  }

  // Cicleaza la urmatoarea treapta (cu revenire la inceput dupa ultima) - un
  // SINGUR buton, ca sa incapa langa "Les" fara sa strice randul pe 400px
  // (vezi masuratorile TG-018/TG-024 pe acelasi rand).
  function urmatoareaTreaptaViteza(v) {
    var i = TREPTE_VITEZA.indexOf(v);
    if (i === -1) i = TREPTE_VITEZA.indexOf(VITEZA_IMPLICITA);
    return TREPTE_VITEZA[(i + 1) % TREPTE_VITEZA.length];
  }

  function actualizeazaButonViteza() {
    var b = document.getElementById("butonViteza");
    if (!b) return;
    var v = citesteViteza();
    b.textContent = v.toFixed(1) + "×"; // viteza aleasa se vede pe control, TG-028
    b.setAttribute("aria-label", textInterfata("ariaButonViteza") + ": " + v.toFixed(1) + "×");
  }

  // ---------------------------------------------------- preferinte (TG-016)
  // Ecran de preferinte pentru ADULT, tinut pe aparat (localStorage), fara
  // cont si fara server (dosar/decizii/TG-016.md). UN SINGUR obiect JSON, o
  // singura cheie - mai usor de tinut coerent decat 5 chei separate. Vocabularul
  // din js/vocabular.js NU se schimba - "grupuri" e doar o SUPRAPUNERE peste
  // SECTIUNI_SUBGRUPE/TEGN_GRUPURI (grupuriEfective(), mai jos).
  var CHEIE_PREFERINTE = "tegn_preferinte";
  // Apasare lunga pe ⚙ deschide ecranul - decizie a liderului, de confirmat de
  // Cristian; constanta, usor de schimbat (premisa din promptul de sarcina).
  var DURATA_APASARE_LUNGA_MS = 1500;

  // ------------------------------------------------------- istoric (TG-017)
  // Cheie PROPRIE (nu in tegn_preferinte - decizia liderului, dosar/decizii/
  // TG-017.md): fiecare intrare = { t: ISO local cu data si ora, ids: [...],
  // limba: "ro"|"nb", fel: "cerere" (doar la cererile rapide, altfel lipseste) }.
  // Scrisa STRICT la ▶ cu banda NEGOALA si la o atingere pe cererile rapide -
  // cuvintele atinse direct pe tabla (fara ▶) NU se scriu (premisa liderului).
  var CHEIE_ISTORIC = "tegn_istoric";
  var PLAFON_ISTORIC = 2000;
  var ZILE_REZUMAT_MS = 30 * 24 * 60 * 60 * 1000;

  function acumIsoLocala() {
    var d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function citesteIstoric() {
    try {
      var brut = localStorage.getItem(CHEIE_ISTORIC);
      if (!brut) return [];
      var arr = JSON.parse(brut);
      if (!Array.isArray(arr)) return [];
      // JSON stricat/partial - intrarile care nu au forma asteptata se ignora,
      // in loc sa darame ecranul (aceeasi regula ca la preferinte, TG-016).
      return arr.filter(function (e) {
        return e && typeof e === "object" && typeof e.t === "string" && Array.isArray(e.ids);
      });
    } catch (e) {
      return [];
    }
  }

  function salveazaIstoric(arr) {
    try {
      if (arr.length > PLAFON_ISTORIC) arr = arr.slice(arr.length - PLAFON_ISTORIC);
      localStorage.setItem(CHEIE_ISTORIC, JSON.stringify(arr));
    } catch (e) {
      // localStorage plin/indisponibil (QuotaExceeded, mod privat) - citirea
      // (▶) nu se opreste din cauza asta (cerinta explicita din prompt).
    }
  }

  function adaugaInIstoric(ids, fel) {
    if (!ids || !ids.length) return;
    var arr = citesteIstoric();
    var intrare = { t: acumIsoLocala(), ids: ids.slice(), limba: LIMBA };
    if (fel) intrare.fel = fel;
    arr.push(intrare);
    salveazaIstoric(arr);
  }

  // Numara aparitiile de id, pe subsetul de intrari trecut - doarCerere=true
  // limiteaza la intrarile cu fel==="cerere" (cererile rapide, TG-011);
  // doarCerere=false le SARE, ca o cerere rapida sa nu se numere si la cuvinte
  // (vazut pe ecran 20.09.2026: "te rog" aparea in ambele liste).
  function numaraIdIn(intrari, doarCerere) {
    var conteaza = {};
    intrari.forEach(function (e) {
      if (doarCerere ? e.fel !== "cerere" : e.fel === "cerere") return;
      (e.ids || []).forEach(function (id) { conteaza[id] = (conteaza[id] || 0) + 1; });
    });
    return conteaza;
  }

  function topIstoric(intrari, doarCerere, n) {
    var conteaza = numaraIdIn(intrari, doarCerere);
    var lista = Object.keys(conteaza).map(function (id) { return { id: id, n: conteaza[id] }; });
    lista.sort(function (a, b) { return b.n - a.n; });
    return lista.slice(0, n).map(function (x) { return { id: x.id, n: x.n, intrare: dupaId(x.id) }; });
  }

  // Grupeaza intrarile pe zi (cheia = "YYYY-MM-DD", din capul lui `t`), cea
  // mai noua zi prima; in interiorul unei zile, cel mai nou rand primul.
  function grupeazaPeZi(intrari) {
    var peZi = {};
    intrari.forEach(function (e) {
      var zi = (e.t || "").slice(0, 10);
      if (!zi) return;
      if (!peZi[zi]) peZi[zi] = [];
      peZi[zi].push({ ora: (e.t || "").slice(11, 16), entry: e });
    });
    var chei = Object.keys(peZi).sort().reverse();
    return chei.map(function (zi) {
      var randuri = peZi[zi].slice().sort(function (a, b) {
        if (a.entry.t === b.entry.t) return 0;
        return a.entry.t < b.entry.t ? 1 : -1;
      });
      return { zi: zi, randuri: randuri };
    });
  }

  function preferinteImplicite() {
    // Valorile de azi, pastrate ca implicit (premisa liderului): sunetul la
    // atingere e OPRIT azi (randeazaBareVerticale adauga in banda, nu reda),
    // selectia e prin click (nu exista drag azi). Marimea pictogramelor NU e
    // preferinta (Cristian, 20.09.2026 09:29): o face zoomul, tinut in tegn_zoom.
    return { sunetAtingere: false, selectie: "click", grupuri: {} };
  }

  function citestePreferinte() {
    var implicite = preferinteImplicite();
    try {
      var brut = localStorage.getItem(CHEIE_PREFERINTE);
      if (!brut) return implicite;
      var obj = JSON.parse(brut);
      if (!obj || typeof obj !== "object") return implicite;
      return {
        sunetAtingere: obj.sunetAtingere === true,
        selectie: obj.selectie === "drag" ? "drag" : "click",
        grupuri: (obj.grupuri && typeof obj.grupuri === "object") ? obj.grupuri : {}
      };
    } catch (e) {
      // JSON stricat in localStorage (TG-016, cerinta din predare) - cade pe
      // implicit, nu darama pagina.
      return implicite;
    }
  }

  function salveazaPreferinte(pref) {
    try { localStorage.setItem(CHEIE_PREFERINTE, JSON.stringify(pref)); } catch (e) {}
  }

  function actualizeazaPreferinta(cheie, valoare) {
    var pref = citestePreferinte();
    pref[cheie] = valoare;
    salveazaPreferinte(pref);
    return pref;
  }

  // Grupul ORIGINAL (din sursa, SECTIUNI_SUBGRUPE) al unui cuvant, in cadrul
  // sectiunii date - folosit ca implicit pentru compatibilitate (punctul 6,
  // TG-016 runda 2): o intrare veche cu `grup` gol nu are alt loc de referinta.
  function grupOriginalId(sect, id) {
    var harta = SECTIUNI_SUBGRUPE[sect];
    if (!harta) return null;
    var gasit = null;
    harta.ordine.forEach(function (idGrup) {
      if (gasit) return;
      if (harta.grupuri[idGrup].items.indexOf(id) !== -1) gasit = idGrup;
    });
    return gasit;
  }

  // Rezolva o suprapunere bruta (ce sta in localStorage) la forma folosita de
  // randare: { grup, ascuns }. `null` daca suprapunerea nu e pentru sectiunea
  // asta. Punctul 6 din cerinta TG-016 runda 2: `grup` gol (forma veche, azi)
  // NU darama nimic - se trateaza ca ascuns in grupul ORIGINAL din vocabular.
  function rezolvaSuprapunere(sect, id, ov) {
    if (!ov || ov.sectiune !== sect) return null;
    if (!ov.grup) return { grup: grupOriginalId(sect, id), ascuns: true };
    if (ov.ascuns === true) return { grup: ov.grup, ascuns: true };
    return { grup: ov.grup, ascuns: false };
  }

  // Suprapunerea de grupuri (TG-016 punctul e, extinsa runda 2 - "Nepublicate"
  // in interiorul grupului): NU schimba TEGN_GRUPURI/SECTIUNI_SUBGRUPE din
  // sursa, doar re-calculeaza ce cuvant apare in ce grup (si daca e ascuns),
  // la randare. Un cuvant mutat/ascuns ramane in ACEEASI sectiune (nu schimba
  // `categorie` in vocabular) - doar subgrupul lui (si vizibilitatea) se schimba.
  // `ascunse` per grup = cuvintele ale caror grup rezolvat e idGrup, dar cu
  // ascuns:true - randate separat, NU in `items` (deci nu ajung pe tabla).
  function grupuriEfective(sect) {
    var harta = SECTIUNI_SUBGRUPE[sect];
    if (!harta) return null;
    var overrides = citestePreferinte().grupuri || {};
    var grupuriNoi = {};
    harta.ordine.forEach(function (idGrup) {
      var g = harta.grupuri[idGrup];
      grupuriNoi[idGrup] = {
        ro: g.ro, nb: g.nb,
        items: g.items.filter(function (id) { return !rezolvaSuprapunere(sect, id, overrides[id]); }),
        ascunse: []
      };
    });
    Object.keys(overrides).forEach(function (id) {
      var rez = rezolvaSuprapunere(sect, id, overrides[id]);
      if (!rez || !grupuriNoi[rez.grup]) return;
      if (rez.ascuns) grupuriNoi[rez.grup].ascunse.push(id);
      else grupuriNoi[rez.grup].items.push(id);
    });
    return { ordine: harta.ordine, grupuri: grupuriNoi };
  }

  function citesteZoom() {
    try {
      var v = parseFloat(localStorage.getItem(CHEIE_ZOOM));
      if (v >= ZOOM_MIN && v <= ZOOM_MAX) return v;
    } catch (e) {}
    return 1;
  }

  // TG-026 problema 1+2 (20.09.2026, tableta Android cu Chrome 101.0.4951.61).
  // `dvh` e din Chrome 108: pe 101 `height: 100dvh` e ignorat si ramane `100vh`,
  // care pe Android e inaltimea viewportului MARE si nu se schimba nici cand
  // bara de sistem se ascunde, nici la intrarea in ecran complet. Consecintele
  // masurate de Cristian: tabla nu umplea inaltimea (3 randuri in picioare, 2
  // culcat) si subsolul ramanea la mijlocul ecranului, desi `margin-top: auto`
  // e pe el - pentru ca #ecran insusi nu avea inaltimea vizibila.
  // `--vh-real` e inaltimea CHIAR vizibila, in pixeli: `visualViewport.height`
  // (Chrome 61+, deci si pe 101) cand exista, altfel `window.innerHeight`.
  // Pe un browser cu `dvh` valoarea asta nu se foloseste (cascada din
  // css/style.css o pune INAINTEA randului cu `dvh`) - nimic nu se schimba
  // unde deja merge.
  // Intoarce `true` daca valoarea CHIAR s-a schimbat (apelantul reaseaza doar
  // atunci, ca sa nu randeze degeaba).
  function actualizeazaInaltimeaReala() {
    if (typeof window === "undefined" || !document.documentElement ||
        !document.documentElement.style) return false;
    var vv = window.visualViewport;
    var h = (vv && vv.height) || window.innerHeight || 0;
    if (!h) return false;
    var nou = Math.round(h) + "px";
    var radacina = document.documentElement;
    if (radacina.style.getPropertyValue("--vh-real") === nou) return false;
    radacina.style.setProperty("--vh-real", nou); /* inaltimea vizibila reala, TG-026 */
    return true;
  }

  // TG-026 problema 3: `.controale-fixe` e `position: fixed`, deci nu impinge
  // nimic si acoperea mentiunea obligatorie din antet (masurat pe 768 latime:
  // 233px de text acoperit). Antetul isi rezerva locul lor pe dreapta
  // (`padding-right`, css/style.css .antet) - latimea se MASOARA, nu se scrie
  // de mana, fiindca depinde de cat de lat e chip-ul de zoom (100%/70%...) si
  // de fontul aparatului. Antetul e IN #ecran (scalat de `zoom`), controalele
  // sunt in afara: latimea reala se imparte la factor ca sa ajunga in aceleasi
  // unitati.
  function actualizeazaLatimeaControalelor() {
    if (typeof window === "undefined" || !document.documentElement ||
        !document.documentElement.style) return;
    var cont = document.getElementById("controaleFixe");
    if (!cont || typeof cont.getBoundingClientRect !== "function") return;
    var latime = cont.getBoundingClientRect().width;
    if (!latime) return;
    var factor = parseFloat(window.getComputedStyle(document.documentElement)
      .getPropertyValue("--zoom-factor")) || 1;
    document.documentElement.style.setProperty(
      "--controale-latime", Math.ceil(latime / factor) + "px"); /* loc rezervat in antet, TG-026 */
  }

  function aplicaZoom(factor) {
    factor = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, factor)) * 100) / 100;
    var ecran = document.getElementById("ecran");
    if (ecran) ecran.style.zoom = factor;
    try { localStorage.setItem(CHEIE_ZOOM, String(factor)); } catch (e) {}
    var eticheta = document.getElementById("zoomProcent");
    if (eticheta) eticheta.textContent = Math.round(factor * 100) + "%";
    // --zoom-factor pe :root, folosita de css/style.css la #ecran
    // (`height: calc(100dvh / var(--zoom-factor))`) - SINGURA sursa a
    // factorului pentru CSS, la fel ca in AIR.
    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.setProperty("--zoom-factor", String(factor));
    }
    // Latimea REALA a #tabla se schimba cu factorul (containerul #ecran isi
    // schimba inaltimea/latimea randata) - sectiunile FARA subgrupe
    // (numarDeBareCareIncap, mai jos) trebuie recalculate, altfel ar ramane
    // cu numarul de bare calculat la factorul vechi.
    // TG-026: locul rezervat controalelor in antet e in unitati de #ecran, deci
    // depinde de factor - se recalculeaza la fiecare treapta de zoom.
    actualizeazaLatimeaControalelor();
    randeazaTabla();
  }

  function creeazaControlZoom() {
    if (document.getElementById("zoomControl") || !document.body) return;
    var cont = document.createElement("div");
    cont.className = "controale-fixe";
    cont.id = "controaleFixe";

    var zoomCont = document.createElement("div");
    zoomCont.className = "zoom-control";
    zoomCont.id = "zoomControl";

    var bMinus = document.createElement("button");
    bMinus.type = "button";
    bMinus.className = "zoom-buton";
    bMinus.textContent = "－";
    bMinus.setAttribute("aria-label", textInterfata("ariaZoomMicsoreaza"));
    bMinus.addEventListener("click", function () { aplicaZoom(citesteZoom() - ZOOM_PAS); });

    var eticheta = document.createElement("span");
    eticheta.className = "zoom-procent";
    eticheta.id = "zoomProcent";
    eticheta.textContent = Math.round(citesteZoom() * 100) + "%";

    var bPlus = document.createElement("button");
    bPlus.type = "button";
    bPlus.className = "zoom-buton";
    bPlus.textContent = "＋";
    bPlus.setAttribute("aria-label", textInterfata("ariaZoomMareste"));
    bPlus.addEventListener("click", function () { aplicaZoom(citesteZoom() + ZOOM_PAS); });

    zoomCont.appendChild(bMinus);
    zoomCont.appendChild(eticheta);
    zoomCont.appendChild(bPlus);
    cont.appendChild(zoomCont);

    // Butonul de limba existent (in #ecran/.antet) se MUTA aici, langa zoom -
    // acelasi element (nu un al doilea buton), ca sa nu se dubleze listener-ii
    // deja atasati la el mai jos, in init().
    var butonLimba = document.getElementById("butonLimba");
    if (butonLimba) cont.appendChild(butonLimba);

    document.body.appendChild(cont);

    // Cristian, 19.09.2026 21:18: "la fel ca in AIR" = coltul din dreapta JOS,
    // nu langa limba. Cutie proprie, pe body (ca `.ecran-complet-control` din AIR).
    creeazaButonEcranComplet();
    // Dupa ce e in pagina: butonul se cauta dupa id.
    actualizeazaButonEcranComplet();

    // TG-016: ⚙, langa limba/zoom, in acelasi stil (chip) - NU acopera nimic
    // din ce exista deja (premisa liderului).
    creeazaButonPreferinte();
  }

  // TG-016: ecranul de preferinte e pentru ADULT - deschidere fara parola,
  // dar nu din greseala: apasare lunga (>= DURATA_APASARE_LUNGA_MS) pe ⚙. O
  // atingere scurta nu face nimic (nu e "buton mort" - doar nu se apasa
  // suficient de mult).
  function creeazaButonPreferinte() {
    if (document.getElementById("butonPreferinte")) return;
    var cont = document.getElementById("controaleFixe");
    if (!cont) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "butonPreferinte";
    b.className = "buton-preferinte";
    b.textContent = "⚙";
    b.setAttribute("aria-label", textInterfata("ariaPreferinte"));
    // Indiciu VIZIBIL (nu doar aria-label pentru cititor de ecran) - Sarcina A,
    // 19.09.2026: cum se afla ca ⚙ se deschide cu apasare lunga.
    b.title = textInterfata("ariaPreferinte");

    var ceasApasareLunga = null;
    var declansat = false;
    b.addEventListener("pointerdown", function () {
      declansat = false;
      ceasApasareLunga = setTimeout(function () {
        declansat = true;
        deschidePreferinte();
      }, DURATA_APASARE_LUNGA_MS);
    });
    function anuleazaApasareaLunga() {
      if (ceasApasareLunga) { clearTimeout(ceasApasareLunga); ceasApasareLunga = null; }
    }
    b.addEventListener("pointerup", anuleazaApasareaLunga);
    b.addEventListener("pointerleave", anuleazaApasareaLunga);
    b.addEventListener("pointercancel", anuleazaApasareaLunga);
    b.addEventListener("click", function (ev) {
      // Apasarea lunga a deschis deja ecranul - clickul care urmeaza (pointerup
      // + click, aceeasi apasare) nu mai face nimic.
      if (declansat) { ev.preventDefault(); declansat = false; }
    });

    cont.appendChild(b);
  }

  // -------------------------------------------------- ecranul de preferinte

  function initEcranPreferinte() {
    if (document.getElementById("ecranPreferinte") || !document.body) return;
    var ecran = document.createElement("div");
    ecran.id = "ecranPreferinte";
    ecran.className = "ecran-preferinte";
    ecran.hidden = true;

    ecran.addEventListener("click", function (ev) {
      // Fundalul intunecat (clic in afara panoului) inchide, ca un "Gata" tacut.
      if (ev.target === ecran) { inchidePreferinte(); return; }
      var t = ev.target;
      var actiune = t.getAttribute && t.getAttribute("data-actiune");
      if (!actiune) return;
      if (actiune === "gata") { inchidePreferinte(); return; }
      if (actiune === "limba") {
        salveazaLimba(t.getAttribute("data-valoare"));
        randeazaTot();
        randeazaEcranPreferinte();
        return;
      }
      if (actiune === "sunet") {
        actualizeazaPreferinta("sunetAtingere", t.getAttribute("data-valoare") === "true");
        randeazaEcranPreferinte();
        return;
      }
      if (actiune === "selectie") {
        actualizeazaPreferinta("selectie", t.getAttribute("data-valoare"));
        randeazaEcranPreferinte();
        return;
      }
      if (actiune === "istoric") {
        inchidePreferinte();
        deschideIstoric();
        return;
      }
      if (actiune === "publicaCuvant") {
        // TG-016 runda 2: "Publica" pune cuvantul INAPOI exact in grupul lui -
        // grupul retinut la ascundere (data-grup), nu unul ales acum.
        var idPub = t.getAttribute("data-cuvant");
        var sectPub = t.getAttribute("data-sectiune");
        var grupPub = t.getAttribute("data-grup");
        var prefPub = citestePreferinte();
        prefPub.grupuri[idPub] = { sectiune: sectPub, grup: grupPub, ascuns: false };
        salveazaPreferinte(prefPub);
        randeazaTabla();
        randeazaEcranPreferinte();
        return;
      }
    });

    ecran.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t.getAttribute || t.getAttribute("data-actiune") !== "mutaCuvant") return;
      var id = t.getAttribute("data-cuvant");
      var sect = t.getAttribute("data-sectiune");
      var valoare = t.value;
      var pref = citestePreferinte();
      if (valoare === "__ascunde__") {
        // Grupul cuvantului "in clipa ascunderii" (punctul 2 din cerinta) -
        // grupul in care era AFISAT chiar acest <select>, nu unul recalculat.
        var grupCurent = t.getAttribute("data-grup-curent");
        pref.grupuri[id] = { sectiune: sect, grup: grupCurent, ascuns: true };
      } else {
        pref.grupuri[id] = { sectiune: sect, grup: valoare, ascuns: false };
      }
      salveazaPreferinte(pref);
      randeazaTabla();
      randeazaEcranPreferinte();
    });

    document.body.appendChild(ecran);
  }

  function optiunePref(actiune, valoare, activ, text) {
    return '<button type="button" class="pref-opt' + (activ ? " pref-opt-activ" : "") +
      '" data-actiune="' + actiune + '" data-valoare="' + valoare +
      '" aria-pressed="' + (activ ? "true" : "false") + '">' + text + '</button>';
  }

  // TG-016 runda 2 (20.09.2026, "A"): o sectiune de grupuri per
  // SECTIUNI_SUBGRUPE, cu un <select> per cuvant vizibil (muta in alt grup din
  // ACEEASI sectiune, sau "Ascunde"). Cuvintele ascunse apar acum ÎN
  // INTERIORUL grupului lor (nu la sfarsitul sectiunii, ca in runda 1), sub
  // "Nepublicate" - doar daca grupul are cel putin un cuvant ascuns - fiecare
  // cu un buton "Publica" (il pune inapoi exact in grupul retinut).
  function htmlGrupuriSectiune(sect, pref) {
    var harta = grupuriEfective(sect);
    if (!harta) return "";
    var h = '<div class="pref-grup-sectiune"><h4>' + numeCategorie(sect) + '</h4>';
    harta.ordine.forEach(function (idGrup) {
      var grup = harta.grupuri[idGrup];
      var intrari = grup.items.map(dupaId).filter(function (i) { return i; });
      h += '<div class="pref-grup"><span class="pref-grup-nume">' + numeGrup(grup) + '</span>' +
        '<div class="pref-grup-cuvinte">';
      intrari.forEach(function (intrare) {
        h += '<span class="pref-cuvant-chip">' + eticheta(intrare) +
          '<select data-actiune="mutaCuvant" data-cuvant="' + intrare.id + '" data-sectiune="' + sect +
          '" data-grup-curent="' + idGrup + '" aria-label="' + eticheta(intrare) + '">';
        harta.ordine.forEach(function (altIdGrup) {
          h += '<option value="' + altIdGrup + '"' + (altIdGrup === idGrup ? " selected" : "") + '>' +
            numeGrup(harta.grupuri[altIdGrup]) + '</option>';
        });
        h += '<option value="__ascunde__">' + textInterfata("prefGrupuriScoate") + '</option>';
        h += '</select></span>';
      });
      h += '</div>';

      var ascunse = (grup.ascunse || []).map(dupaId).filter(function (i) { return i; });
      if (ascunse.length) {
        h += '<div class="pref-grup-scoase"><span class="pref-grup-nume">' +
          textInterfata("prefGrupuriScoase") + '</span><div class="pref-grup-cuvinte">';
        ascunse.forEach(function (intrare) {
          h += '<span class="pref-cuvant-chip">' + eticheta(intrare) +
            '<button type="button" class="pref-btn-publica" data-actiune="publicaCuvant" data-cuvant="' +
            intrare.id + '" data-sectiune="' + sect + '" data-grup="' + idGrup + '">' +
            textInterfata("prefGrupuriPublica") + '</button></span>';
        });
        h += '</div></div>';
      }
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  function randeazaEcranPreferinte() {
    var ecran = document.getElementById("ecranPreferinte");
    if (!ecran) return;
    var pref = citestePreferinte();
    var h = '<div class="preferinte-panou" role="dialog" aria-modal="true" aria-label="' +
      textInterfata("titluPreferinte") + '">';
    h += '<h2 class="preferinte-titlu">' + textInterfata("titluPreferinte") + '</h2>';

    h += '<section class="pref-sectiune"><h3>' + textInterfata("prefLimbaTitlu") + '</h3><div class="pref-butoane">';
    h += optiunePref("limba", "ro", LIMBA === "ro", "🇷🇴 Română");
    h += optiunePref("limba", "nb", LIMBA === "nb", "🇳🇴 Norsk");
    h += '</div></section>';

    h += '<section class="pref-sectiune"><h3>' + textInterfata("prefSunetTitlu") + '</h3><div class="pref-butoane">';
    h += optiunePref("sunet", "true", pref.sunetAtingere === true, textInterfata("prefSunetPornit"));
    h += optiunePref("sunet", "false", pref.sunetAtingere === false, textInterfata("prefSunetOprit"));
    h += '</div></section>';

    h += '<section class="pref-sectiune"><h3>' + textInterfata("prefSelectieTitlu") + '</h3><div class="pref-butoane">';
    h += optiunePref("selectie", "click", pref.selectie === "click", textInterfata("prefSelectieClick"));
    h += optiunePref("selectie", "drag", pref.selectie === "drag", textInterfata("prefSelectieDrag"));
    h += '</div></section>';

    h += '<section class="pref-sectiune"><h3>' + textInterfata("prefGrupuriTitlu") + '</h3>';
    Object.keys(SECTIUNI_SUBGRUPE).forEach(function (sect) { h += htmlGrupuriSectiune(sect, pref); });
    h += '</section>';

    // TG-017: butonul "Istoric" tot in spatele apasarii lungi pe ⚙ - copilul
    // nu ajunge la el direct.
    // TG-012: indicator discret, doar text, "gata offline" / "se descarca N din M" /
    // "-" pe file:// (unde nu exista service worker). Umplut asincron de
    // actualizeazaIndicatorOffline() - la randare arata starea cunoscuta pana atunci.
    h += '<section class="pref-sectiune"><h3>' + textInterfata("prefOfflineTitlu") +
      '</h3><p id="prefOfflineStare" class="pref-offline-stare">' +
      textInterfata("prefOfflineIndisponibil") + '</p></section>';

    h += '<section class="pref-sectiune"><h3>' + textInterfata("istoricTitlu") + '</h3><div class="pref-butoane">';
    h += '<button type="button" class="pref-opt pref-buton-istoric" data-actiune="istoric">' +
      textInterfata("istoricTitlu") + '</button>';
    h += '</div></section>';

    h += '<button type="button" class="buton pref-gata" data-actiune="gata">' +
      textInterfata("butonGata") + '</button>';
    h += '</div>';
    ecran.innerHTML = h;
  }

  // TG-012: citeste cate din fisierele listate in TEGN_LISTA_OFFLINE sunt deja
  // in cache-ul service worker-ului. Nu porneste nicio descarcare - doar masoara
  // ce a apucat sa puna install-ul din sw.js. Pe file:// / fara suport,
  // TEGN_SW_SUPORTAT lipseste sau e false -> "-" imediat, fara promisiuni.
  function actualizeazaIndicatorOffline() {
    var span = document.getElementById("prefOfflineStare");
    if (!span) return;
    var lista = window.TEGN_LISTA_OFFLINE || [];
    if (!window.TEGN_SW_SUPORTAT || !("caches" in window) || !lista.length) {
      span.textContent = textInterfata("prefOfflineIndisponibil");
      return;
    }
    var versiune = window.TEGN_LISTA_OFFLINE_VERSIUNE || "";
    var numeCache = "tegn-offline-" + versiune;
    // 🔴 TG-026 runda 3: eticheta promite „gata pentru folosire fara internet".
    // Pe tableta scria „ja" cu 719 din 921 de fisiere in cache si 22 de pictograme
    // rupte pe ecran. Cauza veche: se compara NUMARUL de chei din cache cu lungimea
    // listei (`n >= m`) — orice intrare in plus sau alta ascundea lipsurile. Acum
    // se numara cate fisiere DIN LISTA sunt chiar acolo, cheie cu cheie, si „da"
    // apare doar la egalitate cu lista intreaga.
    // `caches.has` inainte de `open`: `open` ar CREA un cache gol daca lipseste.
    caches.has(numeCache).then(function (exista) {
      if (!exista) return null;
      return caches.open(numeCache).then(function (cache) { return cache.keys(); });
    }).then(function (chei) {
      var m = lista.length;
      var prezente = {};
      var baza = location.href.replace(/[^\/]*$/, "");
      (chei || []).forEach(function (cheie) {
        var url = String(cheie.url || cheie).split("?")[0];
        if (baza && url.indexOf(baza) === 0) url = url.slice(baza.length);
        prezente[url] = true;
      });
      var n = 0;
      for (var i = 0; i < m; i++) { if (prezente[lista[i]]) n++; }
      span.textContent = n === m
        ? textInterfata("prefOfflineGata")
        : textInterfata("prefOfflineDescarca").replace("{n}", n).replace("{m}", m);
    }).catch(function () {
      span.textContent = textInterfata("prefOfflineIndisponibil");
    });
  }

  function deschidePreferinte() {
    initEcranPreferinte();
    randeazaEcranPreferinte();
    var ecran = document.getElementById("ecranPreferinte");
    if (ecran) ecran.hidden = false;
    actualizeazaIndicatorOffline();
  }

  function inchidePreferinte() {
    var ecran = document.getElementById("ecranPreferinte");
    if (ecran) ecran.hidden = true;
  }

  // ------------------------------------------------------ ecranul de istoric

  // Ce se confirma acum (null = nimic): {tip:"zi", zi:"YYYY-MM-DD"} sau
  // {tip:"tot"} - un al doilea buton "Da, șterge" in pagina, NU confirm() al
  // browserului (cerinta explicita din prompt).
  var confirmareIstoric = null;

  function htmlConfirmare(actiune, zi) {
    var attrZi = zi ? ' data-zi="' + zi + '"' : "";
    return '<div class="istoric-confirma">' +
      '<span>' + textInterfata("istoricSigur") + '</span>' +
      '<button type="button" class="buton istoric-da-sterge" data-actiune="' + actiune + '"' + attrZi + '>' +
      textInterfata("istoricDaSterge") + '</button>' +
      '<button type="button" class="istoric-anuleaza" data-actiune="anuleazaConfirmareIstoric">' +
      textInterfata("istoricAnuleaza") + '</button></div>';
  }

  function htmlRandIstoric(entry) {
    var h = '<span class="istoric-propozitie">';
    (entry.ids || []).forEach(function (id) {
      var intrare = dupaId(id);
      if (intrare) {
        h += '<span class="istoric-cuvant">';
        if (intrare.pictograma) h += '<img src="' + intrare.pictograma + '" alt="">';
        h += '<span>' + eticheta(intrare) + '</span></span>';
      } else {
        // Id disparut din vocabular intre timp - text gri, NU crapa ecranul.
        h += '<span class="istoric-cuvant istoric-cuvant-necunoscut">' +
          textInterfata("istoricCuvantNecunoscut") + '</span>';
      }
    });
    h += '</span>';
    return h;
  }

  function htmlTopLista(intrari) {
    if (!intrari.length) return "<p class=\"istoric-rezumat-gol\">—</p>";
    var h = "<ol>";
    intrari.forEach(function (x) {
      var text = x.intrare ? eticheta(x.intrare) : textInterfata("istoricCuvantNecunoscut");
      h += "<li>" + text + " (" + x.n + ")</li>";
    });
    h += "</ol>";
    return h;
  }

  function initEcranIstoric() {
    if (document.getElementById("ecranIstoric") || !document.body) return;
    var ecran = document.createElement("div");
    ecran.id = "ecranIstoric";
    ecran.className = "ecran-istoric";
    ecran.hidden = true;

    ecran.addEventListener("click", function (ev) {
      if (ev.target === ecran) { inchideIstoric(); return; }
      var t = ev.target;
      var actiune = t.getAttribute && t.getAttribute("data-actiune");
      if (!actiune) return;
      if (actiune === "inchideIstoric") { confirmareIstoric = null; inchideIstoric(); return; }
      if (actiune === "cereStergeTot") { confirmareIstoric = { tip: "tot" }; randeazaEcranIstoric(); return; }
      if (actiune === "cereStergeZi") {
        confirmareIstoric = { tip: "zi", zi: t.getAttribute("data-zi") };
        randeazaEcranIstoric();
        return;
      }
      if (actiune === "anuleazaConfirmareIstoric") { confirmareIstoric = null; randeazaEcranIstoric(); return; }
      if (actiune === "confirmaStergeTot") {
        salveazaIstoric([]);
        confirmareIstoric = null;
        randeazaEcranIstoric();
        return;
      }
      if (actiune === "confirmaStergeZi") {
        var zi = t.getAttribute("data-zi");
        var ramase = citesteIstoric().filter(function (e) { return (e.t || "").slice(0, 10) !== zi; });
        salveazaIstoric(ramase);
        confirmareIstoric = null;
        randeazaEcranIstoric();
        return;
      }
    });

    document.body.appendChild(ecran);
  }

  function randeazaEcranIstoric() {
    var ecran = document.getElementById("ecranIstoric");
    if (!ecran) return;
    var toate = citesteIstoric();
    var acum = Date.now();
    var recente = toate.filter(function (e) {
      var t = Date.parse(e.t);
      return !isNaN(t) && (acum - t) <= ZILE_REZUMAT_MS;
    });

    var h = '<div class="istoric-panou" role="dialog" aria-modal="true" aria-label="' +
      textInterfata("istoricTitlu") + '">';
    h += '<h2 class="istoric-titlu">' + textInterfata("istoricTitlu") + '</h2>';
    h += '<p class="istoric-mentiune">' + textInterfata("istoricMentiune") + '</p>';

    h += '<section class="istoric-rezumat">';
    h += '<div><h4>' + textInterfata("istoricRezumatCuvinte") + '</h4>' +
      htmlTopLista(topIstoric(recente, false, 10)) + '</div>';
    h += '<div><h4>' + textInterfata("istoricRezumatCereri") + '</h4>' +
      htmlTopLista(topIstoric(recente, true, 5)) + '</div>';
    h += '</section>';

    if (!toate.length) {
      h += '<p class="istoric-gol">' + textInterfata("istoricGol") + '</p>';
    } else {
      h += '<button type="button" class="buton istoric-sterge-tot" data-actiune="cereStergeTot">' +
        textInterfata("istoricStergeTot") + '</button>';
      if (confirmareIstoric && confirmareIstoric.tip === "tot") h += htmlConfirmare("confirmaStergeTot");

      grupeazaPeZi(toate).forEach(function (z) {
        h += '<div class="istoric-zi">';
        h += '<div class="istoric-zi-antet"><span class="istoric-zi-data">' + z.zi + '</span>' +
          '<button type="button" class="istoric-sterge-zi" data-actiune="cereStergeZi" data-zi="' + z.zi + '">' +
          textInterfata("istoricStergeZi") + '</button></div>';
        if (confirmareIstoric && confirmareIstoric.tip === "zi" && confirmareIstoric.zi === z.zi) {
          h += htmlConfirmare("confirmaStergeZi", z.zi);
        }
        z.randuri.forEach(function (r) {
          h += '<div class="istoric-rand"><span class="istoric-ora">' + r.ora + '</span>' +
            htmlRandIstoric(r.entry) + '</div>';
        });
        h += '</div>';
      });
    }

    h += '<button type="button" class="buton pref-gata" data-actiune="inchideIstoric">' +
      textInterfata("butonGata") + '</button>';
    h += '</div>';
    ecran.innerHTML = h;
  }

  function deschideIstoric() {
    initEcranIstoric();
    randeazaEcranIstoric();
    var ecran = document.getElementById("ecranIstoric");
    if (ecran) ecran.hidden = false;
  }

  function inchideIstoric() {
    var ecran = document.getElementById("ecranIstoric");
    if (ecran) ecran.hidden = true;
  }

  // Ecran complet (Cristian, 19.09.2026 21:08: "pune si butonul de full screen
  // (la fel ca in AIR)"). La fel ca in AIR (AIR-035): API-ul standard al
  // browserului, Escape/F11 ies prin comportamentul IMPLICIT - NU e mod chiosc
  // blocat, nu se asculta Escape, nu se reintra singur. Starea butonului se ia
  // DOAR din `fullscreenchange` (iesirea cu Escape nu trece prin click). Fara
  // API (poate fi restrans pe file://), butonul NU se creeaza: un buton mort
  // e mai rau decat lipsa lui.
  function ecranCompletDisponibil() {
    var rad = document.documentElement;
    return !!(rad && (rad.requestFullscreen || rad.webkitRequestFullscreen));
  }

  function eEcranComplet() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  // TG-026 punctul 3 (20.09.2026, capturi Cristian): butonul arata un patratel
  // gol ("tofu") pe tableta Android - glifele U+26F6 si U+29C9 (scrise aici cu
  // CODUL, nu cu semnul: proba TG-026 refuza semnul intors in fisier) nu
  // exista in fontul aparatului, iar pagina n-are font propriu (fara CDN, fara
  // font extern - regula proiectului). Desenul e acum un SVG INLINE, deci nu
  // mai depinde de niciun font: patru coltare (intra) / doua dreptunghiuri
  // suprapuse (iesi). `currentColor` pastreaza culoarea butonului (#333).
  // `focusable="false"` + `aria-hidden` - eticheta o da aria-label-ul butonului.
  var SVG_ECRAN_COMPLET_INTRA =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var SVG_ECRAN_COMPLET_IESI =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';

  function actualizeazaButonEcranComplet() {
    var b = document.getElementById("butonEcranComplet");
    if (!b) return;
    var activ = eEcranComplet();
    b.innerHTML = activ ? SVG_ECRAN_COMPLET_IESI : SVG_ECRAN_COMPLET_INTRA; /* icoana ecran complet, TG-026 */
    b.setAttribute("aria-pressed", String(activ));
    b.setAttribute("aria-label", textInterfata(activ ? "ariaEcranCompletIesi" : "ariaEcranCompletIntra"));
  }

  function comutaEcranComplet() {
    var promisiune = null;
    try {
      if (eEcranComplet()) {
        var iesi = document.exitFullscreen || document.webkitExitFullscreen;
        promisiune = iesi ? iesi.call(document) : null;
      } else {
        var rad = document.documentElement;
        var intra = rad.requestFullscreen || rad.webkitRequestFullscreen;
        promisiune = intra ? intra.call(rad) : null;
      }
    } catch (e) {
      actualizeazaButonEcranComplet();
      return;
    }
    // Refuzul asincron al browserului nu lasa o eroare neprinsa; starea se reciteste.
    if (promisiune && typeof promisiune.catch === "function") {
      promisiune.catch(function () { actualizeazaButonEcranComplet(); });
    }
  }

  function creeazaButonEcranComplet() {
    var cont = document.createElement("div");
    cont.className = "ecran-complet-control";
    cont.id = "ecranCompletControl";
    if (!ecranCompletDisponibil() || document.getElementById("butonEcranComplet")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "butonEcranComplet";
    b.className = "ecran-complet-buton";
    b.addEventListener("click", comutaEcranComplet);
    cont.appendChild(b);
    document.body.appendChild(cont);
    document.addEventListener("fullscreenchange", actualizeazaButonEcranComplet);
    document.addEventListener("webkitfullscreenchange", actualizeazaButonEcranComplet);
  }

  var LIMBA = citesteLimba();
  var banda = [];
  var citireInCurs = false;
  // TG-015: sectiunea aleasa acum — implicit Persoane, cum cere criteriul 4.
  // TG-018: `grupAles` a fost SCOS (nu mai exista, per decizia "A" — toate
  // grupurile unei sectiuni se vad deodata, fiecare in bara lui).
  var sectiuneAleasa = "persoane";

  function citesteLimba() {
    var salvata = localStorage.getItem(CHEIE_LIMBA);
    if (salvata === "ro" || salvata === "nb") return salvata;
    return (window.TEGN_CONFIG && window.TEGN_CONFIG.limbaImplicita) || "ro";
  }

  function salveazaLimba(l) {
    LIMBA = l;
    localStorage.setItem(CHEIE_LIMBA, l);
  }

  function eticheta(intrare) {
    return LIMBA === "nb" ? intrare.nb : intrare.ro;
  }

  function numeCategorie(cat) {
    var n = window.TEGN_CATEGORII && window.TEGN_CATEGORII[cat];
    if (!n) return cat;
    return LIMBA === "nb" ? n.nb : n.ro;
  }

  // ---------------------------------------------------- nota „neverificat de nativ"
  // RW-293 (12.09.2026, decizia lui Cristian): cât timp norvegiana casei e în PERIOADĂ
  // DE PROBĂ (până la contract sau folosire oficială — poarta: OMS-015), o mențiune
  // vizibilă stă pe ecran STRICT când LIMBA e nb.
  // 🔴 TEXTUL E IDENTIC, cuvânt cu cuvânt, pe toate cele patru ecrane ale casei — pagina
  // publică Omsora + ecranul Acasă (`1. Omsora/Omsora_website/js/i18n.js`, cheia
  // `mentiune_neverificat_nativ`), AIR (`2. AIR/js/app.js`, aceeași
  // constantă) și AICI — și SUB TITLU în cele patru documente care ies din casă. O
  // schimbare de formulare se portează IDENTIC în celelalte șase locuri.
  var TEXT_NOTA_NEVERIFICAT_NB =
    "⚠️ Teksten på norsk her er ikke kontrollert av en morsmålsbruker — prøveperiode, med mulige feil.";

  function actualizeazaNotaNativa() {
    var n = document.getElementById("notaNativNota");
    if (!n) return;
    n.hidden = (LIMBA !== "nb");
    // 🔴 Randul de mai jos e pazit CUVANT CU CUVANT de unelte/test_rw293_mentiune_nb.js
    // (mentiunea norvegiana obligatorie) - nu se rescrie ca bloc; ce se adauga, se adauga
    // pe randul lui, dedesubt.
    if (!n.hidden) n.textContent = TEXT_NOTA_NEVERIFICAT_NB;
    // TG-026 problema 3: pe ecran ingust chip-ul se taie cu elipsa (css/style.css,
    // .nota-nb-proba) - textul intreg ramane citibil de aici.
    if (!n.hidden) n.title = TEXT_NOTA_NEVERIFICAT_NB; /* text intreg la taiere, TG-026 */
  }

  // ------------------------------------------------------------- randare

  function dupaId(id) {
    return window.TEGN_VOCABULAR.filter(function (i) { return i.id === id; })[0] || null;
  }

  function intrariSectiune(sect) {
    // Corectura 12:29: "afara"/"acasa" au acum categorie: "locuri" direct in
    // js/vocabular.js — nici o mutare speciala aici, doar filtrul simplu.
    return window.TEGN_VOCABULAR.filter(function (i) { return i.categorie === sect; });
  }

  function numeGrup(grup) {
    return LIMBA === "nb" ? grup.nb : grup.ro;
  }

  // TG-018 runda 2 (14:11): culoarea unei sectiuni = culoarea Fitzgerald Key a
  // primei ei intrari (verificat in probă: fiecare sectiune are o SINGURA
  // culoare pe toate intrarile, deci "prima" == "toate"). Nu se inventeaza o
  // culoare noua - e cea deja existenta in js/vocabular.js.
  function culoareSectiune(sect) {
    var prima = window.TEGN_VOCABULAR.filter(function (i) { return i.categorie === sect; })[0];
    return prima ? prima.culoare : null;
  }

  // Un rand de butoane pictograma+cuvant, reutilizat de bara de sectiuni, de
  // bara de grupuri (Ting) si de grila verticala a unei sectiuni/grup alese.
  function randButoane(container, clasa, elemente, pePictograma, dupaCreare) {
    elemente.forEach(function (el) {
      var buton = document.createElement("button");
      buton.type = "button";
      buton.className = clasa;
      if (el.culoare) buton.style.background = el.culoare;
      // TG-018 runda 2: culoarea de SECTIUNE (nu de cartonaș) merge printr-o
      // variabila CSS, nu direct pe `background` - css/style.css decide daca o
      // foloseste plina (buton apasat) sau in nuanta (color-mix), pe selector.
      if (el.varCuloare) buton.style.setProperty("--culoare-sectiune", el.varCuloare);

      if (el.pictograma) {
        var img = document.createElement("img");
        img.src = el.pictograma;
        img.alt = "";
        buton.appendChild(img);
      }

      var span = document.createElement("span");
      span.textContent = el.eticheta;
      buton.appendChild(span);

      buton.setAttribute("aria-label", el.eticheta);
      if (el.apasat !== undefined) buton.setAttribute("aria-pressed", el.apasat ? "true" : "false");

      buton.addEventListener("click", function () { pePictograma(el); });
      if (dupaCreare) dupaCreare(buton, el);
      container.appendChild(buton);
    });
  }

  // TG-016 punctul d: in modul "drag", o pictograma se trage cu degetul/mouse-ul
  // pana in zona propozitiei - Pointer Events (nu HTML5 drag-and-drop, care nu
  // merge pe touch). O simpla atingere NU adauga in banda in acest mod (vezi
  // callback-ul din randeazaBareVerticale, mai jos).
  function activeazaDragPictograma(buton, intrare) {
    buton.addEventListener("pointerdown", function (ev) {
      if (citestePreferinte().selectie !== "drag") return;
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      ev.preventDefault();
      var ghost = document.createElement("div");
      ghost.className = "drag-ghost";
      if (intrare.pictograma) {
        var img = document.createElement("img");
        img.src = intrare.pictograma;
        img.alt = "";
        ghost.appendChild(img);
      }
      var span = document.createElement("span");
      span.textContent = eticheta(intrare);
      ghost.appendChild(span);
      document.body.appendChild(ghost);

      function mutaGhost(x, y) {
        ghost.style.left = x + "px";
        ghost.style.top = y + "px";
      }
      mutaGhost(ev.clientX, ev.clientY);

      function pePointerMove(e) { mutaGhost(e.clientX, e.clientY); }
      function pePointerUp(e) {
        document.removeEventListener("pointermove", pePointerMove);
        document.removeEventListener("pointerup", pePointerUp);
        document.removeEventListener("pointercancel", pePointerUp);
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
        var zona = document.querySelector(".banda-zona");
        var tinta = typeof document.elementFromPoint === "function" ?
          document.elementFromPoint(e.clientX, e.clientY) : null;
        if (zona && tinta && zona.contains(tinta)) {
          adaugaInBanda(intrare);
          if (citestePreferinte().sunetAtingere) redaCuvant(intrare);
        }
      }
      document.addEventListener("pointermove", pePointerMove);
      document.addEventListener("pointerup", pePointerUp);
      document.addEventListener("pointercancel", pePointerUp);
    });
  }

  // TG-011: o atingere REDĂ IMEDIAT audio-ul cuvântului, în limba curentă —
  // NU adaugă în bandă, nu cere ▶ (criteriul 2). Refolosește redaCuvant(),
  // definită mai jos, în secțiunea audio — nu un al doilea player.
  function randeazaCereriRapide() {
    var nav = document.getElementById("cereriRapide");
    if (!nav) return;
    nav.innerHTML = "";
    var elemente = TEGN_CERERI_RAPIDE.map(dupaId).filter(function (i) { return i; }).map(function (intrare) {
      // Corectura Cristian (19.09.2026 13:18/13:21, varianta B): cele 8 NU mai
      // au culoarea categoriei (Fitzgerald) — o singura culoare noua, roșu
      // deschis „urgent" (var(--cerere-rapida), css/style.css), aceeasi pe
      // toate 8. De-aia NU trimitem `culoare` aici — randButoane() pune
      // `buton.style.background` inline DOAR daca `el.culoare` exista; fara
      // el, fondul vine din regula CSS .cerere-rapida-buton, un singur token.
      return {
        pictograma: intrare.pictograma,
        eticheta: eticheta(intrare),
        intrare: intrare
      };
    });
    randButoane(nav, "cerere-rapida-buton", elemente, function (el) {
      // TG-017: o atingere pe o cerere rapida se scrie in istoric, cu
      // fel:"cerere" - exact cererile pe care Cristian le vrea numarate.
      adaugaInIstoric([el.intrare.id], "cerere");
      redaCuvant(el.intrare);
    });
  }

  function randeazaBaraSectiuni() {
    var bara = document.getElementById("baraSectiuni");
    var derulareDinainte = bara.scrollLeft || 0; /* derulare inainte de golire, TG-026 */
    bara.innerHTML = "";
    var elemente = ORDINE_SECTIUNI.map(function (sect) {
      var icoana = dupaId(ICOANA_SECTIUNE[sect]);
      return {
        pictograma: icoana ? icoana.pictograma : null,
        eticheta: numeCategorie(sect),
        apasat: sect === sectiuneAleasa,
        sect: sect,
        varCuloare: culoareSectiune(sect)
      };
    });
    // TG-021: randarea goleste bara, deci derularea ei se pierde - o tinem minte.
    // TG-026 punctul 5 (20.09.2026): randul asta statea DUPA `bara.innerHTML = ""`
    // (mai sus), iar golirea continutului duce `scrollLeft` la 0 - deci
    // "derularea de dinainte" era MEREU 0, o masuratoare moarta. Citit acum
    // inainte de golire (vezi `derulareDinainte` luat in randeazaBaraSectiuni),
    // pozitia in care omul a lasat bara se pastreaza, iar clamparea de mai jos
    // (`ales < primulVizibil` / `ales > primulVizibil + n - 1`) o trage inapoi
    // cand sectiunea DESCHISA ar ramane in afara - exact ce lipsea pe tableta
    // (bara incepea de la "Obiecte", cu "Persoane" deschisa si nevazuta).
    randButoane(bara, "sectiune-buton", elemente, function (el) {
      sectiuneAleasa = el.sect;
      randeazaTot();
    });
    potrivesteBaraSectiuni(bara, derulareDinainte);
  }

  // TG-021 (Cristian, 19.09.2026 20:43): "la scrol nu se vor vedea parti din
  // icoane ...doar icoane intregi". Marimile butoanelor NU se schimba: bara se
  // strange la un numar INTREG de butoane (pas = latimea butonului + golul),
  // sta pe centru, iar sectiunea aleasa e adusa intreaga la vedere.
  function potrivesteBaraSectiuni(bara, derulareDinainte) {
    if (!bara || !bara.style || !bara.children || !bara.children.length) return;
    var primul = bara.children[0];
    if (typeof primul.getBoundingClientRect !== "function" || typeof getComputedStyle !== "function") return;
    // Ambele se scot INTAI: cu `align-self: center` ramas de la randarea
    // dinainte, bara s-ar masura pe latimea continutului, nu pe locul liber.
    bara.style.width = "";
    bara.style.alignSelf = "";
    var latimeButon = primul.offsetWidth;
    var gol = parseFloat(getComputedStyle(bara).columnGap) || 0;
    var pas = latimeButon + gol;
    if (!pas || !bara.clientWidth) return;
    var total = bara.children.length;
    var n = Math.max(1, Math.min(total, Math.floor((bara.clientWidth + gol) / pas)));
    var margini = bara.offsetWidth - bara.clientWidth;
    bara.style.boxSizing = "border-box";
    bara.style.width = (n * pas - gol + margini) + "px";
    bara.style.alignSelf = "center";
    var ales = 0;
    for (var i = 0; i < total; i++) {
      if (bara.children[i].getAttribute && bara.children[i].getAttribute("aria-pressed") === "true") ales = i;
    }
    var primulVizibil = Math.round(derulareDinainte / pas);
    if (ales < primulVizibil) primulVizibil = ales;
    if (ales > primulVizibil + n - 1) primulVizibil = ales - n + 1;
    primulVizibil = Math.max(0, Math.min(total - n, primulVizibil));
    bara.scrollLeft = primulVizibil * pas;
    // TG-026 punctul 5: bara are `scroll-snap-type: x mandatory` (css/style.css)
    // - dupa o schimbare de continut/latime browserul poate "re-agata" derularea
    // singur, DUPA randul de mai sus, si sectiunea deschisa sa iasa iar din
    // vedere. Valoarea se re-pune o data la cadrul urmator, cand asezarea s-a
    // linistit. Fara requestAnimationFrame (DOM-ul minimal al probelor cu
    // `node`) nu se intampla nimic - randul de mai sus a facut deja treaba.
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () {
        if (bara.isConnected !== false) bara.scrollLeft = primulVizibil * pas;
      });
    }
  }

  // TG-018: o bara verticala = { nume: string|null, intrari: [...] }. `nume`
  // apare sus, fix (nu deruleaza cu continutul); `intrari` se randeaza intr-o
  // cutie proprie care se deruleaza pe verticala, independent de celelalte
  // bare (`overflow-y: auto`, css/style.css .bara-verticala-continut).
  function randeazaBareVerticale(tabla, bare, culoare) {
    bare.forEach(function (b) {
      var bara = document.createElement("div");
      bara.className = "bara-verticala";
      // LATIME_MIN_BARA e SINGURA sursa a latimii unei bare (vezi comentariul
      // de la declararea ei) - pusa direct ca stil inline, nu o valoare CSS
      // separata care ar putea sa diveraga de cea folosita la calculul lui n.
      bara.style.width = LATIME_MIN_BARA + "px";
      // TG-018 runda 2 (14:11): sina + antetul barei mostenesc culoarea
      // sectiunii (nuanta deschisa, css/style.css color-mix) - o variabila CSS
      // inerita de `.bara-verticala-nume` (copil), nu se seteaza de doua ori.
      if (culoare) bara.style.setProperty("--culoare-sectiune", culoare);

      if (b.nume) {
        var nume = document.createElement("div");
        nume.className = "bara-verticala-nume";
        nume.textContent = b.nume;
        bara.appendChild(nume);
      }

      var continut = document.createElement("div");
      continut.className = "bara-verticala-continut";
      var elemente = b.intrari.map(function (intrare) {
        return {
          pictograma: intrare.pictograma,
          culoare: intrare.culoare,
          eticheta: eticheta(intrare),
          intrare: intrare
        };
      });
      randButoane(continut, "pictograma-buton", elemente, function (el) {
        // TG-016 punctul d: in modul drag, atingerea simpla nu adauga -
        // doar tragerea pana in banda (activeazaDragPictograma) adauga.
        if (citestePreferinte().selectie === "drag") return;
        adaugaInBanda(el.intrare);
        // TG-016 punctul c: implicit OPRIT (comportamentul de azi - atingerea
        // pe tabla nu reda sunet, doar adauga in banda).
        if (citestePreferinte().sunetAtingere) redaCuvant(el.intrare);
      }, function (buton, el) { activeazaDragPictograma(buton, el.intrare); });
      bara.appendChild(continut);

      tabla.appendChild(bara);
    });
  }

  // Sectiunile FARA grupuri se impart in bare egale, CONTIGUU, in ordinea din
  // vocabular (nu round-robin) - un cititor citeste bara 1 de sus in jos, apoi
  // bara 2, ca paginile unui caiet PECS. `n` vine din latimea disponibila REALA
  // a lui #tabla (clientWidth) - daca nu exista (DOM simulat de proba, sau
  // randare inainte de layout), cade pe window.innerWidth, apoi pe 800 (rezerva
  // determinista, documentata in predare).
  function impartInBareEgale(intrari, n) {
    var marime = Math.ceil(intrari.length / n) || intrari.length;
    var bare = [];
    for (var i = 0; i < intrari.length; i += marime) bare.push(intrari.slice(i, i + marime));
    return bare;
  }

  function numarDeBareCareIncap(tabla) {
    // 19.09.2026 18:09: tabla are acum `width: fit-content` (goala = doar
    // padding-ul ei), deci latimea libera se ia de la parinte, minus marginile
    // si padding-ul tablei (2 x 16 + 2 x 16 + bordura) - altfel iese mereu 1 bara.
    var parinte = tabla && tabla.parentNode;
    var latime = (parinte && parinte.clientWidth && (parinte.clientWidth - 66)) ||
      (tabla && tabla.clientWidth) ||
      (typeof window !== "undefined" && window.innerWidth) || 800;
    return Math.max(1, Math.min(MAX_BARE, Math.floor(latime / LATIME_MIN_BARA)));
  }

  // TG-019 corectura (19.09.2026, semnalata de lider): la zoom > 100% spatiul
  // LOCAL disponibil pentru bare SCADE (#ecran are `height: calc(100dvh /
  // factor)` - css/style.css), dar inaltimea fixa "3 cartonase" de dinainte
  // nu se adapta - masurat: la 130%, bara ajungea la 915px REALI, #tabla se
  // termina la 686px, fereastra la 768px (barele ies din tabla SI din
  // fereastra). --bara-n (css/style.css, .bara-verticala-continut) e acum
  // calculat AICI din geometria REALA, nu scris de mana:
  // - `sus` = varful primei `.bara-verticala-continut` randate (nu depinde de
  //   inaltimea EI insasi - determinat de tot ce sta deasupra in flux:
  //   antet/cereri-rapide/banda-zona/bara-sectiuni/padding tabla/eticheta
  //   grupului, daca exista), deci se poate masura INAINTE sa se aplice noul
  //   --bara-n, fara bucla de recalculare.
  // - `jos` = josul REAL al lui #tabla, minus padding-bottom (spatiul in care
  //   bara chiar are voie sa se intinda).
  // Se ia MINIMUL intre toate barele randate (unele au eticheta de grup
  // deasupra, altele nu - eticheta consuma spatiu, deci bara ei incape mai
  // putine cartonase; --bara-n e UN SINGUR CSS var pentru toate barele, deci
  // trebuie sa respecte cea mai stransa). Minim 1 - niciodata 0 (chiar daca
  // nu incape intreg, ramane exact un cartonas, cerinta "niciodata unul
  // taiat" prevaleaza asupra "sa incapa perfect").
  function calculeazaBaraN() {
    // DOM-ul minimal folosit de probele TG-018/TG-011 (evaluare cu `node`, nu
    // browser real - vezi docstringul lor) nu are querySelectorAll/
    // getBoundingClientRect/getComputedStyle - limita masurata, ca la
    // `numarDeBareCareIncap` (clientWidth) mai sus. Fara ele, ramane 3
    // (valoarea de dinainte de reparatie), care e exact ce probele de-acum
    // asteapta la Obiecte/Persoane pe DOM simulat.
    var tabla = document.getElementById("tabla");
    if (!tabla || typeof tabla.querySelectorAll !== "function" ||
        typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
      return 3;
    }
    var continuturi = tabla.querySelectorAll(".bara-verticala-continut");
    if (!continuturi.length) return 3;
    var stiluriRadacina = window.getComputedStyle(document.documentElement);
    var cartonasH = parseFloat(stiluriRadacina.getPropertyValue("--bara-cartonas-h")) || 84;
    var gap = parseFloat(stiluriRadacina.getPropertyValue("--bara-gap")) || 8;
    // josDisponibil = josul REAL (marginea de jos, border-box) al lui #tabla,
    // NU minus padding-bottom: #tabla are `overflow-y: hidden` (css/style.css
    // .tabla), iar zona de clip a lui `hidden` e marginea EXTERIOARA a
    // padding-ului (border-box), nu cea interioara - continutul poate sa
    // "manance" din padding-ul de jos fara sa fie taiat, exact ce se intampla
    // deja la 100% (masurat: bara ajunge pana la tabla.bottom, nu se opreste
    // cu 40px mai sus). Scaderea padding-ului aici ar fi subestimat spatiul
    // real disponibil (masurat: dadea --bara-n=2 la 100%, in loc de 3).
    var josDisponibil = tabla.getBoundingClientRect().bottom;
    var zoomFactor = parseFloat(stiluriRadacina.getPropertyValue("--zoom-factor")) || 1;
    var nMinim = null;
    // +0.5px epsilon: subpixel-ele de layout/zoom (masurat: 267,9625px in loc
    // de 268px exacti la 100% pe 1366x768) pot pica un cartonas care de fapt
    // incape - fara epsilon, floor() rotunjea in jos "3 exact" la "2".
    var EPSILON = 0.5;
    for (var i = 0; i < continuturi.length; i++) {
      var sus = continuturi[i].getBoundingClientRect().top;
      // getBoundingClientRect() masoara in pixelii ferestrei (DUPA zoom), iar
      // --bara-cartonas-h e in pixelii lui #ecran (INAINTE de zoom) - fara
      // impartire, la 70% incapeau 6 si se aratau 4 (masurat, 1366x768).
      var disponibil = (josDisponibil - sus) / zoomFactor + EPSILON;
      var n = Math.max(1, Math.floor((disponibil + gap) / (cartonasH + gap)));
      if (nMinim === null || n < nMinim) nMinim = n;
    }
    return nMinim || 1;
  }

  function aplicaBaraN() {
    // Cristian, 19.09.2026 18:09: golul de sub coloane = golul de deasupra lor.
    // Inaltimea pusa aici se scoate INTAI, ca --bara-n sa se masoare pe tot
    // spatiul liber, nu pe panoul strans de randarea dinainte.
    var tabla = document.getElementById("tabla");
    if (tabla && tabla.style) {
      tabla.style.flex = "";
      tabla.style.height = "";
      tabla.style.marginBottom = "";
    }
    var n = calculeazaBaraN();
    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.setProperty("--bara-n", String(n));
    }
    strangeTablaPeBare(tabla);
    return n;
  }

  // Panoul se opreste la `padding-top` sub cea mai lunga bara. Barele au voie
  // sa intre in padding-ul de jos (vezi calculeazaBaraN), deci panoul poate
  // depasi spatiul liber cu cel mult marginea lui de jos - de aceea marginea
  // se scoate. DOM-ul minimal al probelor nu are geometrie: acolo nu face nimic.
  function strangeTablaPeBare(tabla) {
    if (!tabla || typeof tabla.querySelectorAll !== "function" ||
        typeof tabla.getBoundingClientRect !== "function" ||
        typeof window === "undefined" || typeof window.getComputedStyle !== "function") return;
    var bare = tabla.querySelectorAll(".bara-verticala");
    if (!bare.length) return;
    var jos = 0;
    for (var i = 0; i < bare.length; i++) {
      jos = Math.max(jos, bare[i].getBoundingClientRect().bottom);
    }
    var stil = window.getComputedStyle(tabla);
    var zoomFactor = parseFloat(window.getComputedStyle(document.documentElement)
      .getPropertyValue("--zoom-factor")) || 1;
    var sus = parseFloat(stil.paddingTop) || 0;
    var bordura = parseFloat(stil.borderBottomWidth) || 0;
    var derulare = tabla.offsetHeight - tabla.clientHeight -
      (parseFloat(stil.borderTopWidth) || 0) - bordura;
    var inaltime = (jos - tabla.getBoundingClientRect().top) / zoomFactor +
      sus + bordura + Math.max(0, derulare);
    tabla.style.flex = "0 0 auto";
    tabla.style.height = inaltime + "px";
    tabla.style.marginBottom = "0";
  }

  function randeazaTabla() {
    var tabla = document.getElementById("tabla");
    tabla.innerHTML = "";
    var culoare = culoareSectiune(sectiuneAleasa);

    // TG-018 runda 2: subgrupe pe TOATE sectiunile din SECTIUNI_SUBGRUPE (nu
    // doar Obiecte) - fiecare subgrup e o bara PROPRIE, cu nume, toate
    // vizibile deodata. Intrebari/Culori (absente din harta) raman pe bare
    // egale, fara nume, ca inainte.
    var harta = grupuriEfective(sectiuneAleasa);
    if (harta) {
      var bareCuNume = harta.ordine.map(function (idGrup) {
        var grup = harta.grupuri[idGrup];
        return {
          nume: numeGrup(grup),
          intrari: grup.items.map(dupaId).filter(function (i) { return i; })
        };
      });
      randeazaBareVerticale(tabla, bareCuNume, culoare);
      aplicaBaraN();
      return;
    }

    var intrari = intrariSectiune(sectiuneAleasa);
    var n = numarDeBareCareIncap(tabla);
    var bareFaraNume = impartInBareEgale(intrari, n).map(function (lista) {
      return { nume: null, intrari: lista };
    });
    randeazaBareVerticale(tabla, bareFaraNume, culoare);
    aplicaBaraN();
  }

  function randeazaBanda() {
    var el = document.getElementById("banda");
    el.innerHTML = "";
    banda.forEach(function (intrare) {
      var item = document.createElement("div");
      item.className = "banda-item";
      if (intrare.pictograma) {
        var img = document.createElement("img");
        img.src = intrare.pictograma;
        img.alt = "";
        item.appendChild(img);
      }
      var span = document.createElement("span");
      span.textContent = eticheta(intrare);
      item.appendChild(span);
      el.appendChild(item);
    });
    // Cristian, 19.09.2026 15:40: la o propozitie mai lunga decat fereastra,
    // banda se deruleaza singura pana la ultima pictograma pusa.
    if (typeof el.scrollWidth === "number") el.scrollLeft = el.scrollWidth;
  }

  function actualizeazaButonLimba() {
    var b = document.getElementById("butonLimba");
    b.textContent = LIMBA === "nb" ? "🇳🇴" : "🇷🇴";
  }

  // ------------------------------------------ texte de interfata (TG-008, 13.09.2026)
  // Butonul de citire, placeholder-ul benzii goale, aria-label-urile si atribuirea
  // ARASAAC nu erau cuvinte din TEGN_VOCABULAR — stateau presarate, RO fix, in
  // index.html/style.css. Acum vin din TEGN_INTERFATA (js/vocabular.js), acelasi loc
  // comun ca TEGN_CATEGORII.
  function textInterfata(cheie) {
    var intrare = window.TEGN_INTERFATA && window.TEGN_INTERFATA[cheie];
    if (!intrare) return "";
    return LIMBA === "nb" ? intrare.nb : intrare.ro;
  }

  function actualizeazaTexteInterfata() {
    document.getElementById("butonCiteste").textContent = textInterfata("citeste");
    document.getElementById("butonLimba").setAttribute("aria-label", textInterfata("ariaSchimbaLimba"));
    actualizeazaButonEcranComplet();
    document.querySelector(".banda-zona").setAttribute("aria-label", textInterfata("ariaPropozitiaConstruita"));
    document.getElementById("butonSterge").setAttribute("aria-label", textInterfata("ariaStergeUltima"));
    document.getElementById("butonGoleste").setAttribute("aria-label", textInterfata("ariaGolestePropozitia"));
    document.getElementById("tabla").setAttribute("aria-label", textInterfata("ariaTablaPictograme"));
    document.getElementById("banda").setAttribute("data-placeholder-banda", textInterfata("placeholderBanda"));
    document.querySelector(".atribuire").innerHTML = textInterfata("atribuireArasaac");
    document.getElementById("baraSectiuni").setAttribute("aria-label", textInterfata("ariaBaraSectiuni"));
    var nav = document.getElementById("cereriRapide");
    if (nav) nav.setAttribute("aria-label", textInterfata("ariaCereriRapide"));
    var rezumat = document.getElementById("licentaRezumat");
    if (rezumat) rezumat.textContent = textInterfata("licentaRezumat");
    var butonPref = document.getElementById("butonPreferinte");
    if (butonPref) {
      butonPref.setAttribute("aria-label", textInterfata("ariaPreferinte"));
      butonPref.title = textInterfata("ariaPreferinte");
    }
    actualizeazaButonViteza(); // TG-028: aria-label-ul depinde de limba
  }

  function randeazaTot() {
    randeazaCereriRapide();
    randeazaBaraSectiuni();
    randeazaTabla();
    randeazaBanda();
    actualizeazaButonLimba();
    actualizeazaNotaNativa();
    actualizeazaTexteInterfata();
  }

  // ------------------------------------------------------------- banda

  function adaugaInBanda(intrare) {
    banda.push(intrare);
    randeazaBanda();
  }

  function stergeUltimul() {
    banda.pop();
    randeazaBanda();
  }

  function goleste() {
    banda = [];
    randeazaBanda();
  }

  // -------------------------------------------------------------- audio

  // UN SINGUR element audio pentru toata propozitia (tableta, 20.09.2026 10:59: se auzea
  // doar primul cuvant). Pe Android, Chrome lasa sa cante doar elementul pornit de o
  // atingere; un `new Audio()` facut mai tarziu, din setTimeout, e refuzat in tacere.
  // Elementul deja "deblocat" de atingere poate primi alt `src` si canta mai departe.
  var audioComun = null;

  function redaCuvant(intrare) {
    return new Promise(function (rezolva) {
      var cale = "audio/" + LIMBA + "_" + intrare.id + ".mp3";
      if (!audioComun) audioComun = new Audio();
      var audio = audioComun;
      var terminat = false;
      function laSfarsit() { gata(); }
      function gata() {
        if (terminat) return;
        terminat = true;
        audio.removeEventListener("ended", laSfarsit);
        audio.removeEventListener("error", laEroare);
        rezolva();
      }
      audio.addEventListener("ended", laSfarsit);
      audio.addEventListener("error", laEroare);
      audio.src = cale;
      // TG-028: la schimbarea `src` elementul se reincarca si `playbackRate` revine
      // la `defaultPlaybackRate` (comportamentul din standardul HTML; NEMASURAT pe
      // tableta) - de aceea se pune DUPA fiecare `src`, inainte de `play()`.
      audio.playbackRate = citesteViteza();
      function laEroare() {
        // fara mp3 pentru acest cuvant inca (ex. inainte de a rula
        // genereaza_audio_tegn.py) — rezerva: speechSynthesis.
        if (!window.speechSynthesis) { gata(); return; }
        var u = new SpeechSynthesisUtterance(eticheta(intrare));
        u.lang = LIMBA === "nb" ? "nb-NO" : "ro-RO";
        u.rate = citesteViteza(); // TG-028: aceeasi viteza si pe rezerva vorbita
        u.onend = gata;
        u.onerror = gata;
        window.speechSynthesis.speak(u);
      }
      var pornire = audio.play();
      // fisier lipsa = il trateaza `laEroare` (rezerva vorbita); aici doar refuzul de a canta.
      if (pornire && pornire.catch) pornire.catch(function () { if (!audio.error) gata(); });
    });
  }

  function citesteBanda() {
    if (citireInCurs || !banda.length) return;
    // TG-017: se scrie in istoric cu banda NEGOALA, la apasarea ▶ - nu la
    // fiecare atingere pe tabla (premisa liderului).
    adaugaInIstoric(banda.map(function (i) { return i.id; }));
    citireInCurs = true;
    var i = 0;
    function urmatorul() {
      if (i >= banda.length) { citireInCurs = false; return; }
      var intrare = banda[i++];
      redaCuvant(intrare).then(function () {
        setTimeout(urmatorul, 220); // pauza scurta intre cuvinte
      });
    }
    urmatorul();
  }

  // --------------------------------------------- ecran de incarcare (TG-027)
  // Decizia lui Cristian ("A", dosar/decizii/TG-027.md): sigla acopera
  // aplicatia pana se incarca pictogramele VIZIBILE la pornire (cererile
  // rapide, bara de sectiuni, prima tabla), cel mult 30 de secunde; o
  // pictograma cu eroare NU tine ecranul blocat; pe un aparat rapid dispare
  // imediat. Divul e static in index.html (nu creat de JS) - vezi comentariul
  // de acolo.
  var PLAFON_INCARCARE_MS = 30000;
  var incarcareAscunsa = false;

  function ascundeEcranIncarcare() {
    if (incarcareAscunsa) return;
    incarcareAscunsa = true;
    var el = document.getElementById("ecranIncarcare");
    if (el) el.classList.add("ecran-incarcare-ascuns");
  }

  // `img.complete` e true si pentru o imagine care a esuat deja de incarcat
  // (MDN) - `naturalWidth === 0` ar distinge, dar aici NU conteaza: o eroare
  // nu are voie sa tina ecranul blocat, deci orice stare finala (gata sau
  // eroare) rezolva promisiunea la fel.
  function asteaptaImagine(img) {
    return new Promise(function (rezolva) {
      if (img.complete) { rezolva(); return; }
      function gata() {
        img.removeEventListener("load", gata);
        img.removeEventListener("error", gata); // eroarea NU blocheaza, TG-027
        rezolva();
      }
      img.addEventListener("load", gata);
      img.addEventListener("error", gata);
    });
  }

  function initEcranIncarcare() {
    var imagini = [];
    // "pictogramele vizibile la pornire" (cerinta lui Cristian): cererile
    // rapide, bara de sectiuni, prima tabla - EXACT cele trei containere,
    // dupa randarea lor finala (apelat dupa aplicaZoom() in init, mai jos).
    ["cereriRapide", "baraSectiuni", "tabla"].forEach(function (id) {
      var cont = document.getElementById(id);
      if (!cont || !cont.querySelectorAll) return;
      var lista = cont.querySelectorAll("img");
      for (var i = 0; i < lista.length; i++) imagini.push(lista[i]);
    });
    // Plafonul de 30s ramane oricum, indiferent daca sunt sau nu imagini de
    // asteptat - dar daca nu e nimic de asteptat, ecranul dispare imediat
    // (aparat rapid / tabla goala).
    if (!imagini.length) { ascundeEcranIncarcare(); return; }
    Promise.all(imagini.map(asteaptaImagine)).then(ascundeEcranIncarcare);
    setTimeout(ascundeEcranIncarcare, PLAFON_INCARCARE_MS); // plafon 30s, TG-027
  }

  // -------------------------------------------------------------- init

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("butonCiteste").addEventListener("click", citesteBanda);
    document.getElementById("butonSterge").addEventListener("click", stergeUltimul);
    document.getElementById("butonGoleste").addEventListener("click", goleste);
    document.getElementById("butonLimba").addEventListener("click", function () {
      salveazaLimba(LIMBA === "nb" ? "ro" : "nb");
      randeazaTot();
    });
    // TG-028: un SINGUR buton, cicleaza treptele de viteza la fiecare atingere.
    document.getElementById("butonViteza").addEventListener("click", function () {
      salveazaViteza(urmatoareaTreaptaViteza(citesteViteza()));
      actualizeazaButonViteza();
    });
    document.getElementById("an").textContent = new Date().getFullYear();

    // TG-026 problema 1: inaltimea vizibila reala se pune ÎNAINTE de prima
    // randare - altfel prima asezare se calculeaza pe `100vh` (gresit pe
    // Android sub Chrome 108) si se corecteaza abia la primul eveniment.
    actualizeazaInaltimeaReala();

    randeazaTot();

    // TG-019: control de zoom creat DUPA randarea intai (muta #butonLimba, deja
    // in DOM cu listenerul lui de mai sus) si aplica factorul salvat/implicit.
    creeazaControlZoom();
    aplicaZoom(citesteZoom());
    // TG-026 problema 3: controalele exista abia acum - antetul isi poate
    // rezerva locul lor (aplicaZoom de mai sus o face deja, randul asta e
    // pentru cazul in care el ar iesi devreme).
    actualizeazaLatimeaControalelor();

    // TG-027: ecranul cu sigla se ascuta DUPA ce tabla e in forma ei finala
    // (dupa aplicaZoom(), care re-randeaza #tabla la factorul salvat) - altfel
    // am astepta imaginile primei randari, nu pe cele CHIAR aratate.
    initEcranIncarcare();

    // Sectiunile FARA subgrupe (Intrebari, Culori) isi recalculeaza numarul de
    // bare la redimensionare (plan, pas 1) - subgrupele (Obiecte, Persoane, ...)
    // au numar FIX de bare, neatins de resize (TG-018).
    // Cristian, 19.09.2026 21:26 (capturi): dupa intrarea in ecran complet,
    // asezarea ramanea calculata pe fereastra de DINAINTE (5 cartonase unde
    // incap 4, subsolul taiat) pana la primul zoom. Browserul schimba marimea
    // ferestrei in trepte, iar `resize` poate veni inainte de marimea finala.
    // De aceea asezarea se reface si dupa ce fereastra s-a linistit.
    var INTARZIERI_REASEZARE_MS = [0, 150, 600];
    var ceasReasezare = [];
    function reasazaDupaSchimbareaFerestrei() {
      // TG-026 problema 1: ÎNAINTE de orice masuratoare de asezare se pune la zi
      // inaltimea vizibila reala (--vh-real) - pe Chrome 101 ea, nu `dvh`, da
      // inaltimea lui #ecran. Altfel tabla s-ar recalcula pe inaltimea veche.
      actualizeazaInaltimeaReala();
      actualizeazaLatimeaControalelor();
      ceasReasezare.forEach(clearTimeout);
      ceasReasezare = INTARZIERI_REASEZARE_MS.map(function (ms) {
        return setTimeout(function () {
          actualizeazaInaltimeaReala();
          randeazaTabla();
          randeazaBaraSectiuni();
        }, ms);
      });
    }
    // Cristian, 19.09.2026 21:34: cu textul "Licenta pictograme" deschis,
    // subsolul creste si nu mai incapea - panoul ramanea cu 5 cartonase. La
    // deschidere/inchidere asezarea se reface: 4 cand e deschis, 5 cand e inchis.
    var licentaDetalii = document.querySelector(".licenta-detalii");
    if (licentaDetalii && licentaDetalii.addEventListener) {
      licentaDetalii.addEventListener("toggle", reasazaDupaSchimbareaFerestrei);
    }
    window.addEventListener("resize", reasazaDupaSchimbareaFerestrei);
    window.addEventListener("orientationchange", reasazaDupaSchimbareaFerestrei);
    // TG-026 problema 1: pe Android, `visualViewport` semnaleaza schimbarea
    // inaltimii VIZIBILE (bara de sistem care se ascunde/apare, tastatura) si
    // acolo unde `window.resize` nu vine deloc - exact cazul in care `100vh`
    // ramane neschimbat si asezarea ramanea pe inaltimea veche.
    if (window.visualViewport && window.visualViewport.addEventListener) {
      window.visualViewport.addEventListener("resize", reasazaDupaSchimbareaFerestrei); /* visualViewport, TG-026 */
    }
    document.addEventListener("fullscreenchange", reasazaDupaSchimbareaFerestrei);
    document.addEventListener("webkitfullscreenchange", reasazaDupaSchimbareaFerestrei);
    // TG-026 punctul 1 (20.09.2026, capturi Cristian pe tableta Android, in
    // ecran complet): tabla ramanea calculata pe fereastra de DINAINTE de ecran
    // complet - 2 randuri si o fasie din al treilea, iar sub subsol ramanea
    // ecran gol (~140px din 768 la lat, ~390px din 1024 la inalt). Cifrele se
    // potrivesc exact cu o fereastra cu 140 (respectiv 390) px mai scunda:
    // asezarea NU s-a refacut dupa ce bara browserului s-a ascuns.
    // Cele trei ceasuri de mai sus (0/150/600ms) sunt o GHICITURA despre cat
    // dureaza pe aparat - pe Android bara de sistem se ascunde cu animatie si
    // poate trece de 600ms, iar `resize` nu vine garantat la marimea finala.
    // ResizeObserver nu ghiceste: se declanseaza cand #ecran (inaltimea lui =
    // `calc(100dvh / factor)`, css/style.css) chiar si-a schimbat marimea,
    // oricat de tarziu si de cate ori. Prima notificare vine chiar la observare
    // (marimea de acum) - o sarim, ca sa nu randam a doua oara degeaba.
    // 🔴 NU se scoate niciunul dintre cele de mai sus: `resize`/`fullscreenchange`
    // raman pentru browserele fara ResizeObserver.
    if (typeof ResizeObserver === "function") {
      var ecranDeUrmarit = document.getElementById("ecran");
      var prima = true;
      if (ecranDeUrmarit) {
        new ResizeObserver(function () { /* ResizeObserver asezare, TG-026 */
          if (prima) { prima = false; return; }
          reasazaDupaSchimbareaFerestrei();
        }).observe(ecranDeUrmarit);
      }
    }
  });
})();
