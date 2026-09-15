"""Raamistiku etapp 1: ühine heli, muusika ja välimus (15. sept 2026).

Valvab Silveri otsuseid (claude/moodulite-otsused.md, „Heli ja muusika"):
  1. Üks heli-eelistus kõigis moodulites (harjutaja_prefs_v1). Vana mooduli
     seade loetakse üle: kui heli oli KUSKIL väljas, jääb see väljas.
  2. Heli lüliti on ka mängu päises, igas moodulis samas kohas (riba järel),
     ja päise ning avalehe nupp näitavad sama olekut.
  3. Vale vastuse peale kõlab toon JA telefon väriseb — ka Korrutajas.
     Vaigistatud heliga ei värise.
  4. Sisse lülitades kõlab proovitoon.
  5. Muusika: vaikimisi väljas, ainult harjutamisel, ♪ ka mängu ajal,
     võistluses ♪ nuppu ei ole, Kirjutajas muusikat ei ole. Peidetud
     vahelehel muusika peatub.
  6. Ühine välimus: kolm moodulit laevad core/base.css-i ja Harjuta ning
     Võistle on kõrvuti ühesuurused.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8813 &
    python3 tools/test_heli.py 8813
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8813"
BASE = f"http://localhost:{PORT}"
vead = []

# Loendab ostsillaatoreid, värinaid ja muusika play()-kutseid.
SPION = """
(() => {
  window.__osc = 0; window.__vib = []; window.__play = 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const orig = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function () { window.__osc++; return orig.call(this); };
  }
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: (x) => { window.__vib.push(x); return true; } });
  HTMLMediaElement.prototype.play = function () { window.__play++; return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () {};
})();
"""


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


def uus(brauser, eelne=None):
    ctx = brauser.new_context(viewport={"width": 400, "height": 860})
    ctx.add_init_script(SPION)
    if eelne:
        ctx.add_init_script("(() => { if (!sessionStorage.__ok) { sessionStorage.__ok = 1; "
                            + "".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});" for k, v in eelne.items())
                            + "} })();")
    page = ctx.new_page()
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com|supabase\.co"), lambda r: r.abort())
    vead_js = []
    page.on("pageerror", lambda e: vead_js.append(str(e)))
    return ctx, page, vead_js


def prefs(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('harjutaja_prefs_v1'))")


def ava(page, moodul):
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.wait_for_selector("#btnTrain" if moodul == "korrutaja" else "#startBtn")
    page.wait_for_timeout(150)


def alusta(page, moodul, voistlus=False):
    if moodul == "korrutaja":
        page.click("#btnTest" if voistlus else "#btnTrain")
        page.wait_for_timeout(400)
        if page.locator("#wmGo").is_visible():
            page.click("#wmGo")
            page.wait_for_timeout(400)
        if voistlus and not page.evaluate("() => document.getElementById('s-game').classList.contains('on')"):
            page.click("#btnTest")   # kinnitus
            page.wait_for_timeout(400)
        return
    page.click("#competeBtn" if voistlus else "#startBtn")
    if voistlus:
        page.wait_for_timeout(100)
        if page.locator("#s-game").is_hidden():
            page.click("#competeBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    page.wait_for_timeout(250)


def vasta_valesti(page, moodul):
    if moodul == "korrutaja":
        for _ in range(12):
            if page.evaluate("() => window.__vib.length"):
                return
            if page.locator("#after:not([hidden])").count():
                page.wait_for_timeout(850); page.click("#nextBtn"); page.wait_for_timeout(300); continue
            if page.locator("#s-game.on").count() == 0:
                page.wait_for_timeout(300)
                for sel in ["#introGo", "#s-intro button", ".screen.on .btn.primary"]:
                    if page.locator(sel).first.is_visible():
                        page.locator(sel).first.click(); break
                page.wait_for_timeout(300); continue
            vastus = page.evaluate("() => { const q = document.getElementById('qText').textContent; const m = q.match(/(\\d+)\\s*([×:])\\s*(\\d+)/); return m[2] === '×' ? (+m[1]) * (+m[3]) : (+m[1]) / (+m[3]); }")
            vale = str(vastus + 1)
            for c in vale:
                page.click(f'.key[data-k="{c}"]')
            page.wait_for_timeout(500)
        return
    if page.locator("#pad .kl-vastan").count() and page.locator("#pad").is_visible():
        for v in page.locator("#pad .kl-vali input").all():
            v.focus(); page.keyboard.press("1"); page.keyboard.press("7")
        page.click("#pad .kl-vastan")
        page.wait_for_timeout(300)
        return
    # Valikvastus: õiget varianti test ei tea. Kui juhtus õige, oota järgmist
    # ülesannet ja proovi uuesti, kuni tuleb viga (või värin).
    for _ in range(8):
        nupp = page.locator("#opts button:not([disabled])").last
        try:
            nupp.wait_for(state="visible", timeout=4000)
        except Exception:
            # ülesanne on vahepeal vahetunud või vastus juba kirjas
            if page.evaluate("() => window.__vib.length") or page.locator("#after").is_visible():
                return
            continue
        nupp.click()
        page.wait_for_timeout(300)
        if page.evaluate("() => window.__vib.length") or page.locator("#after").is_visible():
            return
        page.wait_for_timeout(1300)


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # 1. Üleviimine: Korrutajas oli heli väljas, Kellas sees -> ühine eelistus väljas.
        ctx, page, js = uus(b, {"korrutaja_v1": {"v": 1, "settings": {"sfx": False, "music": True, "name": "Mia"}},
                                "kell_v1": {"sfx": True, "stats": {}}})
        ava(page, "kell")
        p = prefs(page)
        kontrolli(p == {"sfx": False, "music": True, "name": "Mia"}, "üleviimine: heli väljas, muusika ja nimi Korrutajast", p)
        vana = page.evaluate("() => JSON.parse(localStorage.getItem('korrutaja_v1')).settings")
        kontrolli(vana.get("sfx") is False, "üleviimine ei kustuta vana välja")
        kontrolli(page.get_attribute("#sfxBtn", "aria-pressed") == "false", "Kell: avalehe 🔊 näitab ühist eelistust")
        ctx.close()

        ctx, page, js = uus(b, {"teisendaja_v1": {"sfx": False}})
        ava(page, "kirjutaja")
        kontrolli(prefs(page)["sfx"] is False, "üleviimine: Teisendajas väljas -> väljas ka Kirjutajas")
        ctx.close()

        ctx, page, js = uus(b)
        ava(page, "teisendaja")
        kontrolli(prefs(page) == {"sfx": True, "music": False, "name": ""}, "vaikimisi: heli sees, muusika väljas", prefs(page))
        ctx.close()

        # 2-4. Iga moodul: päise nupp, sünkroon, värin, proovitoon.
        for m in ["kell", "kirjutaja", "teisendaja", "korrutaja"]:
            ctx, page, js = uus(b)
            ava(page, m)
            if m != "korrutaja":
                kontrolli(page.evaluate("() => [...document.styleSheets].some(s => (s.href || '').endsWith('/core/base.css'))"),
                          f"{m}: laeb core/base.css-i")
                h = page.evaluate("() => [document.getElementById('startBtn').offsetHeight, document.getElementById('competeBtn').offsetHeight]")
                kontrolli(h[0] == h[1], f"{m}: Harjuta ja Võistle on ühekõrgused", h)
            alusta(page, m)
            nupp = "#gSfx" if m == "korrutaja" else "#sfxBtnG"
            kontrolli(page.locator(nupp).is_visible(), f"{m}: 🔊 on mängu päises")
            jarjekord = page.evaluate("""(n) => { const b = document.querySelector(n); const riba = b.parentElement.querySelector('.track, .bar');
                return !!riba && (riba.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; }""", nupp)
            kontrolli(jarjekord, f"{m}: 🔊 on päises riba järel")
            kontrolli(page.get_attribute(nupp, "aria-pressed") == "true", f"{m}: päise 🔊 on alguses sees")

            vasta_valesti(page, m)
            kontrolli(page.evaluate("() => window.__vib") == [60], f"{m}: vale vastuse peale telefon väriseb", page.evaluate("() => window.__vib"))

            page.click(nupp)
            kontrolli(prefs(page)["sfx"] is False, f"{m}: päise 🔊 lülitab ühise eelistuse välja")
            kodu = "#btnSfx" if m == "korrutaja" else "#sfxBtn"
            kontrolli(page.get_attribute(kodu, "aria-pressed") == "false", f"{m}: avalehe 🔊 liigub kaasa")
            enne = page.evaluate("() => window.__osc")
            page.click(nupp)
            page.wait_for_timeout(150)
            kontrolli(page.evaluate("() => window.__osc") > enne, f"{m}: sisse lülitades kõlab proovitoon")
            kontrolli(not js, f"{m}: konsoolis pole JS-vigu", js)
            ctx.close()

        # Vaigistatud heliga ei värise.
        ctx, page, js = uus(b, {"harjutaja_prefs_v1": {"sfx": False, "music": False, "name": ""}})
        ava(page, "teisendaja"); alusta(page, "teisendaja"); vasta_valesti(page, "teisendaja")
        kontrolli(page.evaluate("() => window.__vib") == [], "vaigistatud heliga ei värise")
        ctx.close()

        # 5. Muusika.
        ctx, page, js = uus(b)
        ava(page, "kell")
        kontrolli(page.locator("#musicBtn").is_visible(), "Kell: ♪ on avalehel")
        kontrolli(page.get_attribute("#musicBtn", "aria-pressed") == "false", "Kell: muusika on vaikimisi väljas")
        alusta(page, "kell")
        kontrolli(page.locator("#musicBtnG").is_visible(), "Kell: ♪ on harjutamise päises")
        kontrolli(page.evaluate("() => HMuusika._kõlab()") is False, "Kell: väljas muusika ei mängi")
        page.click("#musicBtnG")
        page.wait_for_timeout(400)
        kontrolli(page.evaluate("() => HMuusika._kõlab() && window.__play > 0"), "Kell: ♪ mängu ajal paneb muusika mängima")
        page.evaluate("() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); }")
        kontrolli(page.evaluate("() => HMuusika._kõlab()") is False, "Kell: peidetud vahelehel muusika peatub")
        page.evaluate("() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); }")
        page.wait_for_timeout(200)
        kontrolli(page.evaluate("() => HMuusika._kõlab()") is True, "Kell: tagasi tulles muusika jätkub")
        page.click("#quitBtn")
        page.wait_for_timeout(300)
        kontrolli(page.evaluate("() => HMuusika._kõlab()") is False, "Kell: ringi lõpus muusika peatub")
        page.goto(f"{BASE}/kell/", wait_until="domcontentloaded"); page.wait_for_selector("#startBtn")
        alusta(page, "kell", voistlus=True)
        kontrolli(page.locator("#musicBtnG").is_hidden(), "Kell: võistluses ♪ nuppu ei ole")
        kontrolli(page.evaluate("() => HMuusika._kõlab()") is False, "Kell: võistluses muusika ei mängi")
        kontrolli(page.locator("#sfxBtnG").is_visible(), "Kell: võistluses 🔊 on alles")

        # Eelistus on ühine: Korrutaja seaded näitavad sama.
        page.goto(f"{BASE}/korrutaja/", wait_until="domcontentloaded"); page.wait_for_selector("#setBtn")
        page.click("#setBtn"); page.wait_for_timeout(200)
        kontrolli(page.get_attribute('#segMusic button[data-v="1"]', "class") and "on" in page.get_attribute('#segMusic button[data-v="1"]', "class"),
                  "Korrutaja: seaded näitavad Kellas sisse lülitatud muusikat")
        page.click('#segSfx button[data-v="0"]')
        kontrolli(prefs(page)["sfx"] is False, "Korrutaja: seadete lüliti muudab ühist eelistust")
        kontrolli(page.get_attribute("#btnSfx", "aria-pressed") == "false", "Korrutaja: päise 🔊 liigub seadetega kaasa")
        kontrolli(not js, "muusika: konsoolis pole JS-vigu", js)
        ctx.close()

        ctx, page, js = uus(b, {"harjutaja_prefs_v1": {"sfx": True, "music": True, "name": ""}})
        ava(page, "korrutaja"); alusta(page, "korrutaja")
        kontrolli(page.locator("#gMusic").is_visible(), "Korrutaja: ♪ on harjutamise päises")
        page.wait_for_timeout(300)
        kontrolli(page.evaluate("() => HMuusika._kõlab() && window.__play > 0"), "Korrutaja: sisse lülitatud muusika mängib harjutamisel (failist)")
        kontrolli(page.evaluate("() => /muusika-[12]\\.mp3$/.test(HMuusika._lugu())"), "Korrutaja: lugu on üks kahest failist")
        page.click("#gMusic")
        kontrolli(page.evaluate("() => HMuusika._kõlab()") is False, "Korrutaja: ♪ mängu ajal peatab muusika")
        ctx.close()

        # Teisendaja: kaks lugu, mängivad harjutamisel; lugude failid on olemas.
        ctx, page, js = uus(b, {"harjutaja_prefs_v1": {"sfx": True, "music": True, "name": ""}})
        ava(page, "teisendaja")
        kontrolli(page.locator("#musicBtn").is_visible(), "Teisendaja: ♪ on avalehel")
        alusta(page, "teisendaja")
        page.wait_for_timeout(300)
        kontrolli(page.locator("#musicBtnG").is_visible() and page.evaluate("() => HMuusika._kõlab() && window.__play > 0"),
                  "Teisendaja: muusika mängib harjutamisel")
        for f in ["teisendaja/muusika-1.mp3", "teisendaja/muusika-2.mp3", "korrutaja/muusika-1.mp3", "korrutaja/muusika-2.mp3"]:
            r = page.request.get(f"{BASE}/{f}")
            kontrolli(r.ok and r.headers.get("content-type", "").startswith("audio"), f"{f} on olemas")
        kontrolli(not js, "Teisendaja: JS-vigu pole", js)
        ctx.close()

        for m in ["kirjutaja"]:
            ctx, page, js = uus(b, {"harjutaja_prefs_v1": {"sfx": True, "music": True, "name": ""}})
            ava(page, m); alusta(page, m)
            kontrolli(page.locator("[data-muusika]:visible").count() == 0, f"{m}: ♪ nuppu ei ole (lugu puudub)")
            kontrolli(page.evaluate("() => !window.HMuusika || !HMuusika._kõlab()"), f"{m}: muusikat ei mängita")
            ctx.close()

        b.close()
    print()
    print("KÕIK LÄBI" if not vead else f"{len(vead)} VIGA")
    sys.exit(1 if vead else 0)


main()
