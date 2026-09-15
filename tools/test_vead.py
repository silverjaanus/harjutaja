"""Ülevaatuse vigade regressioonitest (15. sept).

Iga kontroll vastab ühele Fable'i/Codexi leitud veale, mis on parandatud:
  - Teisendaja: Enter ei jäta vihjet vahele; tühi „Vastan" ei ole viga;
    „Anna veast teada" on võistlusel peidus; tasemel 1 ei ole „Maht" valikut.
  - Kell: veateate avamine kohe pärast õiget vastust ei jäta mängu kinni.
  - Kirjutaja: numbriklahv ei vasta eelmise vaatamise ajal käivale küsimusele;
    tühik ei korda võistlusel sõna rohkem kui üks kord.
  - Korrutaja: Escape ei lõpeta ringi.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8814 &
    python3 tools/test_vead.py 8814
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


def voistlus_lubatud(page, moodul):
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.evaluate("() => { for (const k of Object.keys(localStorage)) { try { const d = JSON.parse(localStorage.getItem(k)); if (d && 'lastCompete' in d) { d.lastCompete = ''; localStorage.setItem(k, JSON.stringify(d)); } } catch (e) {} } }")
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.wait_for_selector("#competeBtn")


def teisendaja_klahvistikuni(page):
    for _ in range(25):
        if page.locator("#pad .kl-vastan").is_visible():
            return True
        page.locator("#opts button").first.click()
        page.wait_for_timeout(150)
        if page.locator("#after").is_visible():
            page.click("#nextBtn")
        else:
            page.wait_for_timeout(1200)
    return False


def teisendaja(page):
    page.goto(f"{BASE}/teisendaja/", wait_until="domcontentloaded")
    page.wait_for_selector("#levels .chip")
    page.locator("#levels .chip").nth(0).click()
    kats = page.locator("#kats .chip").all_inner_texts()
    kontrolli("Maht" not in kats, "Teisendaja: tasemel 1 ei ole „Maht“ valikut", kats)
    page.locator("#levels .chip").nth(1).click()
    kontrolli("Maht" in page.locator("#kats .chip").all_inner_texts(), "Teisendaja: tasemel 2 on „Maht“ valik")

    page.click("#startBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    kontrolli(page.locator("#flagBtn").is_visible(), "Teisendaja: harjutades on „Anna veast teada“ näha")
    if not teisendaja_klahvistikuni(page):
        kontrolli(False, "Teisendaja: klahvistikuga ülesanne ei tulnud")
        return
    kysimus = page.locator("#askText").inner_text()
    page.click("#pad .kl-vastan")   # tühi
    page.wait_for_timeout(200)
    kontrolli(page.locator("#askText").inner_text() == kysimus and page.locator("#pad .kl-vali input").first.is_enabled(),
              "Teisendaja: tühi „Vastan“ jätab ülesande lahti")
    kontrolli("Kirjuta" in page.locator("#fb").inner_text(), "Teisendaja: tühja vastuse peale tuleb juhis", page.locator("#fb").inner_text())
    for vali in page.locator("#pad .kl-vali input").all():   # nimega arvul on kaks lahtrit
        vali.focus()
        page.keyboard.press("0")   # 0 ei ole ühegi ülesande vastus
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    kontrolli(page.locator("#askText").inner_text() == kysimus and page.locator("#hint").is_visible(),
              "Teisendaja: Enter vale vastuse järel ei jäta vihjet vahele")

    voistlus_lubatud(page, "teisendaja")
    page.click("#competeBtn"); page.wait_for_timeout(150); page.click("#competeBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    kontrolli(page.locator("#flagBtn").is_hidden(), "Teisendaja: võistlusel on „Anna veast teada“ peidus")


def kell(page):
    page.goto(f"{BASE}/kell/", wait_until="domcontentloaded")
    page.evaluate("() => { var d = JSON.parse(localStorage.getItem('kell_v1') || '{}'); d.opp = 'lugemine'; localStorage.setItem('kell_v1', JSON.stringify(d)); }")
    page.goto(f"{BASE}/kell/", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.click("#startBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    for _ in range(30):
        esimene = page.locator("#askText").inner_text()
        page.locator("#opts button").first.click()   # juhuslik valik; ootame õiget
        page.wait_for_timeout(80)
        if "ok" in (page.locator("#fb").get_attribute("class") or ""):
            page.click("#flagBtn")
            page.wait_for_timeout(1500)   # kauem kui 1 s edasiminek
            page.click("#flagCancel")
            page.wait_for_timeout(300)
            kontrolli(page.locator("#askText").inner_text() != esimene or page.locator("#opts button").first.is_enabled(),
                      "Kell: pärast veateate akna sulgemist läheb mäng edasi")
            return
        if page.locator("#after").is_visible():
            page.click("#nextBtn")
        page.wait_for_timeout(200)
    kontrolli(False, "Kell: õiget vastust ei tulnud 30 katsega")


def kirjutaja(page):
    page.goto(f"{BASE}/kirjutaja/", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.click("#startBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    page.locator("#opts button").first.click()
    page.wait_for_timeout(200)
    if page.locator("#after").is_visible():
        page.click("#nextBtn")
    else:
        page.wait_for_timeout(1300)
    page.click("#prevBtn")
    page.wait_for_timeout(150)
    page.keyboard.press("1")
    page.wait_for_timeout(200)
    page.click("#reviewBack")
    page.wait_for_timeout(200)
    vastatud = page.evaluate("() => [...document.querySelectorAll('#opts button')].some(b => b.disabled)")
    kontrolli(not vastatud, "Kirjutaja: numbriklahv eelmise vaatamisel ei vasta käivale küsimusele")

    voistlus_lubatud(page, "kirjutaja")
    page.evaluate("""() => {
      window.__mangis = 0;
      const P = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { window.__mangis++; return Promise.resolve(); };
    }""")
    page.click("#competeBtn"); page.wait_for_timeout(150); page.click("#competeBtn")
    page.wait_for_selector("#s-game:not([hidden])")
    page.wait_for_timeout(200)
    m0 = page.evaluate("() => window.__mangis")
    for _ in range(4):
        page.keyboard.press(" ")
        page.wait_for_timeout(80)
    m1 = page.evaluate("() => window.__mangis")
    kontrolli(m1 - m0 <= 1, "Kirjutaja: võistlusel kordab tühik sõna ainult üks kord", f"{m1 - m0} kordust")


def korrutaja(page):
    page.goto(f"{BASE}/korrutaja/", wait_until="domcontentloaded")
    page.wait_for_selector("#btnTrain")
    page.click("#btnTrain")
    page.wait_for_timeout(500)
    if page.locator("#wmGo").is_visible():   # päeva soojendus
        page.click("#wmGo")
        page.wait_for_timeout(500)
    on = lambda: page.evaluate("() => document.getElementById('s-game').classList.contains('on')")
    kontrolli(on(), "Korrutaja: harjutusring algas")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    kontrolli(on(), "Korrutaja: Escape ei lõpeta ringi")


with sync_playwright() as p:
    b = p.chromium.launch()
    for nimi, fn in [("teisendaja", teisendaja), ("kell", kell), ("kirjutaja", kirjutaja), ("korrutaja", korrutaja)]:
        print("\n# " + nimi)
        ctx = b.new_context(viewport={"width": 390, "height": 844})
        page = ctx.new_page()
        page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com|supabase\.co"), lambda r: r.abort())
        js = []
        page.on("pageerror", lambda e: js.append(str(e)))
        try:
            fn(page)
        except Exception as e:
            kontrolli(False, nimi + ": test kukkus", str(e)[:300])
        kontrolli(not js, nimi + ": JS-vigu ei ole", js[:2])
        ctx.close()
    b.close()

print()
if vead:
    print(f"KATKI - {len(vead)} viga")
    sys.exit(1)
print("KOIK LABI")
