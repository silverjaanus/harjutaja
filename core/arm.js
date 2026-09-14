/* Harjutaja ühine kaheastmeline kinnitus ("vajuta veel kord").

   Miks see fail olemas on: sama muster oli neljas moodulis neljas eri
   kirjapildis ja kaks asja olid igal pool valesti. Esiteks ei muutunud
   Kirjutajas, Kellas ega Teisendajas nupp ise — hoiatus ilmus kaugele
   alla tagasisidereale. Laps vaatab oma sõrme: kui seal midagi ei juhtu,
   arvab ta, et puude ei läinud läbi, ja vajutab kohe uuesti. Nii lõppes
   võistlus kogemata. Teiseks lähtestus ootel olek nelja sekundiga —
   lühem kui aeg, mis lapsel kulub hoiatuse lugemiseks.

   Reegel siin: esimene vajutus paneb NUPU ENDA nähtavalt ootele (klass
   "armed") ja kirjutab teate; teine vajutus teeb teo. Ootel olek kaob
   siis, kui laps teeb teadliku jätkamisliigutuse (moodul kutsub
   disarm()), ja igaks juhuks pika turvataimeriga. */
(function () {
  function HArm(btn, opts) {
    var armed = false, timer = null;
    var label = opts.label || btn;
    var idle = opts.idleText != null ? opts.idleText : label.textContent;
    var wait = opts.timeout || 10000;

    function disarm() {
      if (!armed) return;
      armed = false;
      clearTimeout(timer); timer = null;
      btn.classList.remove("armed");
      if (opts.onDisarm) { opts.onDisarm(); return; }
      if (opts.armedText != null) label.textContent = idle;
      if (opts.note) { opts.note.textContent = ""; opts.note.hidden = true; }
    }

    function arm() {
      armed = true;
      btn.classList.add("armed");
      if (opts.armedText != null) label.textContent = opts.armedText;
      if (opts.note && opts.message) {
        opts.note.textContent = opts.message;
        opts.note.hidden = false;
      }
      clearTimeout(timer);
      timer = setTimeout(disarm, wait);
    }

    btn.addEventListener("click", function (e) {
      if (opts.enabled && !opts.enabled()) { disarm(); if (opts.onBlocked) opts.onBlocked(); return; }
      /* Kinnitust küsitakse ainult seal, kus teol on hind. Harjutamises
         ei kao midagi, seega esimene vajutus teeb kohe teo. */
      if (opts.needsConfirm && !opts.needsConfirm()) { disarm(); opts.action(e); return; }
      if (!armed) { arm(); return; }
      disarm();
      opts.action(e);
    });

    return {
      disarm: disarm,
      armed: function () { return armed; }
    };
  }
  /* Ühised tekstid siin, mitte neljas failis laiali — muidu lähevad
     sõnastused ajapikku lahku. Kolm Fable'i parandust: "senine tulemus"
     (mitte "praegune" — see kõlab nagu üks number ekraanil), "edetabelisse"
     mõlemas tekstis (laps näeb Edetabeli sakki ja teab, kuhu tulemus läheb),
     ja mooduli nimi välja kirjutatud: "selles mängus" loeb lapse jaoks
     käimasoleva ringi kohta ja päevalimiidi mõte läheks kaduma. */
  HArm.quitMsg = function (kus) {
    return "Kas lõpetad? Senine tulemus läheb edetabelisse ja täna " + kus +
           " enam võistelda ei saa. Vajuta ✕ veel kord.";
  };
  HArm.COMPETE_MSG = "Tulemus läheb edetabelisse ka siis, kui lõpetad enne ringi lõppu. Vajuta veel kord.";

  window.HArm = HArm;
})();
