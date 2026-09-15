"""Moodulite võrdsuse test (15. sept).

Valvab asju, mis peavad kõigis moodulites ühtemoodi töötama:
  1. Eelmise ülesande nool (Kirjutajas oli, Kellas ja Teisendajas puudus):
     harjutusringis näitab eelmist ülesannet koos vastusega, "Tagasi mängu"
     taastab käiva ülesande (ka pooleli kirjutatud vastuse), võistluses peidus.
  2. Vastuse lahter: pikim vastus mahub tervikuna ära.
  3. Heli: toon ajastatakse alles siis, kui AudioContext jookseb (Androidis
     käivitub peatatud kontekst viivitusega ja ajastatud toon jäi vaikseks).

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8814 &
    python3 tools/test_vordsus.py 8814
"""
import re
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8814"
BASE = f"http://localhost:{PORT}"
vead = []


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


def lahti(page):
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com|supabase\.co"), lambda r: r.abort())


def vasta(page):
    """Vastab käivale ülesandele kuidas iganes ja liigub järgmise juurde."""
    if page.locator("#pad .kl-vastan").count() and not page.locator("#pad").is_hidden():
        page.locator("#pad .kl-pad button", has_text=re.compile(r"^9$")).first.click()
        page.click("#pad .kl-vastan")
    else:
        page.locator("#opts button").first.click()
    page.wait_for_timeout(150)
    if page.locator("#after").is_visible():
        page.click("#nextBtn")
    else:
        page.wait_for_timeout(1300)


def eelmine(page, moodul):
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.click("#startBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    page.wait_for_timeout(200)
    kontrolli(page.locator("#prevBtn").is_visible(), f"{moodul}: eelmise nool on harjutusringis näha")
    kontrolli(page.locator("#prevBtn").is_disabled(), f"{moodul}: esimesel ülesandel on nool mitteaktiivne")
    esimene = page.locator("#askText").inner_text()
    vasta(page)
    teine = page.locator("#askText").inner_text()
    kontrolli(page.locator("#prevBtn").is_enabled(), f"{moodul}: teisel ülesandel on nool aktiivne")

    pooleli = None
    if moodul == "teisendaja" and page.locator("#pad .kl-vastan").is_visible():
        page.locator("#pad .kl-pad button", has_text=re.compile(r"^4$")).first.click()
        pooleli = page.locator("#pad .kl-vali input").first.input_value()

    page.click("#prevBtn")
    page.wait_for_timeout(150)
    kontrolli(page.locator("#reviewBar").is_visible(), f"{moodul}: vaatamise riba on näha")
    kontrolli(page.locator("#reviewWhich").inner_text() == "Vaatad eelmist ülesannet",
              f"{moodul}: riba ütleb „Vaatad eelmist ülesannet“", page.locator("#reviewWhich").inner_text())
    kontrolli(page.locator("#askText").inner_text() == esimene, f"{moodul}: näidatakse eelmist ülesannet",
              page.locator("#askText").inner_text() + " / " + esimene)
    kontrolli(page.locator("#fb").inner_text().strip() != "", f"{moodul}: eelmise tagasiside on näha")
    lukus = page.evaluate("""() => {
      const i = [...document.querySelectorAll('#pad .kl-vali input')].filter(x => x.offsetParent);
      const o = [...document.querySelectorAll('#opts button')].filter(x => x.offsetParent);
      return i.every(x => x.disabled) && o.every(x => x.disabled);
    }""")
    kontrolli(lukus, f"{moodul}: vaadatavale ülesandele ei saa uuesti vastata")
    kontrolli(page.locator("#prevBtn").is_disabled(), f"{moodul}: kaugemale tagasi ei saa, kui rohkem pole")

    page.click("#reviewBack")
    page.wait_for_timeout(150)
    kontrolli(page.locator("#reviewBar").is_hidden(), f"{moodul}: „Tagasi mängu“ peidab riba")
    kontrolli(page.locator("#askText").inner_text() == teine, f"{moodul}: käiv ülesanne on tagasi")
    kontrolli(page.locator("#fb").inner_text().strip() == "", f"{moodul}: käival ülesandel pole tagasisidet")
    if pooleli is not None:
        kontrolli(page.locator("#pad .kl-vali input").first.input_value() == pooleli,
                  f"{moodul}: pooleli kirjutatud vastus jäi alles")
    # Käivale ülesandele saab ikka vastata.
    n0 = page.evaluate("() => document.getElementById('bar').style.width")
    vasta(page)
    kontrolli(page.locator("#askText").inner_text() != teine or
              page.evaluate("() => document.getElementById('bar').style.width") != n0,
              f"{moodul}: pärast vaatamist saab edasi mängida")


def voistlus_peidus(page, moodul):
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.evaluate("() => { for (const k of Object.keys(localStorage)) { try { const d = JSON.parse(localStorage.getItem(k)); if (d && 'lastCompete' in d) { d.lastCompete = ''; localStorage.setItem(k, JSON.stringify(d)); } } catch (e) {} } }")
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.wait_for_selector("#competeBtn")
    if page.locator("#competeBtn").is_disabled():
        kontrolli(False, f"{moodul}: võistlust ei saanud testiks alustada")
        return
    page.click("#competeBtn")   # esimene vajutus: "Alustame?"
    page.wait_for_timeout(150)
    page.click("#competeBtn")   # teine vajutus alustab
    page.wait_for_selector("#s-game:not([hidden])")
    kontrolli(page.locator("#prevBtn").is_hidden(), f"{moodul}: võistluses eelmise noolt ei ole")


def lahter(page):
    page.goto(f"{BASE}/teisendaja/", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    tulem = page.evaluate("""() => {
      const host = document.createElement('div');
      host.className = 'padhost';
      document.querySelector('#s-home').append(host);
      const kb = HKlahvistik.loo({ host, valjad: 2, sildid: ['km', 'm'] });
      const out = {};
      for (const v of ['1', '15000', '270000', '1000000']) {
        kb.pane([v, v]);
        const i = host.querySelector('input');
        out[v] = { mahub: i.scrollWidth <= i.clientWidth + 1, sw: i.scrollWidth, cw: i.clientWidth };
      }
      const i = host.querySelector('input');
      kb.pane(['', '']);
      out.tyhi = i.clientWidth;
      host.remove();
      return out;
    }""")
    for v in ["1", "15000", "270000", "1000000"]:
        kontrolli(tulem[v]["mahub"], f"lahter: „{v}“ mahub tervikuna", tulem[v])
    kontrolli(tulem["tyhi"] < 120, "lahter: tühi väli ei ole lai kast", tulem["tyhi"])
    # Klahvistikuga kirjutades laieneb väli samamoodi.
    page.click("#startBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    for _ in range(20):
        if page.locator("#pad .kl-vastan").is_visible():
            break
        vasta(page)
    if page.locator("#pad .kl-vastan").is_visible():
        for _ in range(7):
            page.locator("#pad .kl-pad button", has_text=re.compile(r"^8$")).first.click()
        mahub = page.evaluate("() => { const i = document.querySelector('#pad .kl-vali input'); return [i.value, i.scrollWidth <= i.clientWidth + 1]; }")
        kontrolli(mahub[0] == "8888888" and mahub[1], "lahter: klahvistikuga kirjutatud 7 numbrit mahuvad", mahub)


HELI = """
window.__alg = [];
const AC0 = window.AudioContext;
window.AudioContext = function () {
  const c = new AC0(); window.__ctx = c;
  const co = c.createOscillator.bind(c);
  c.createOscillator = function () {
    const o = co(); const st = o.start.bind(o);
    o.start = function (t) { window.__alg.push({ t: t, now: c.currentTime, state: c.state }); return st(t); };
    return o;
  };
  return c;
};
window.webkitAudioContext = window.AudioContext;
"""


def heli(page, moodul):
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.click("#startBtn")   # kasutaja puudutus: kontekst tekib
    page.wait_for_timeout(300)
    tulem = page.evaluate("""async () => {
      await window.__ctx.suspend();          // telefon on konteksti vahepeal peatanud
      window.__alg = [];
      HSfx.ok();
      await new Promise(r => setTimeout(r, 400));
      return window.__alg;
    }""")
    kontrolli(len(tulem) > 0, f"{moodul}: HSfx.ok() mängib ka peatatud kontekstist", tulem)
    kontrolli(all(a["state"] == "running" and a["t"] > a["now"] for a in tulem),
              f"{moodul}: toon ajastatakse alles jooksvas kontekstis ja tulevikku", tulem)


with sync_playwright() as p:
    b = p.chromium.launch()
    for nimi, fn in [("eelmine teisendaja", lambda pg: eelmine(pg, "teisendaja")),
                     ("eelmine kell", lambda pg: eelmine(pg, "kell")),
                     ("voistlus teisendaja", lambda pg: voistlus_peidus(pg, "teisendaja")),
                     ("voistlus kell", lambda pg: voistlus_peidus(pg, "kell")),
                     ("lahter", lahter),
                     ("heli teisendaja", lambda pg: heli(pg, "teisendaja")),
                     ("heli kell", lambda pg: heli(pg, "kell")),
                     ("heli kirjutaja", lambda pg: heli(pg, "kirjutaja"))]:
        print("\n# " + nimi)
        ctx = b.new_context(viewport={"width": 390, "height": 844})
        ctx.add_init_script(HELI)
        page = ctx.new_page()
        lahti(page)
        vead_js = []
        page.on("pageerror", lambda e: vead_js.append(str(e)))
        try:
            fn(page)
        except Exception as e:
            kontrolli(False, nimi + ": test kukkus", str(e)[:200])
        kontrolli(not vead_js, nimi + ": JS-vigu ei ole", vead_js[:2])
        ctx.close()
    b.close()

print()
if vead:
    print(f"KATKI - {len(vead)} viga")
    sys.exit(1)
print("KOIK LABI")
