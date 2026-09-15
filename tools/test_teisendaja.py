"""Teisendaja Playwright-test.

Valvab kolme asja, mis ei tohi vaikselt katki minna:
  1. Klahvistik: laps kirjutab vastuse ise, koma on ainult 4. tasemel.
  2. Võistlusreegel: 15 ülesannet, 15 sekundit, üks kord päevas, tase 2.
  3. Vale vastuse peale tuleb diagnoos ja ühikuredel, mitte ainult „vale".

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8814 &
    python3 tools/test_teisendaja.py 8814
"""
import re
import sys
import pathlib
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8814"
BASE = f"http://localhost:{PORT}/teisendaja/"
JUUR = pathlib.Path(__file__).resolve().parent.parent

vead = []


def kontrolli(tingimus, silt):
    if not tingimus:
        vead.append(silt)


def lahti(page):
    """Google Fonts ja Supabase on pilves proxy taga kinni — suuname kõrvale."""
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())
    page.route(re.compile(r"supabase\.co"), lambda r: r.abort())


def numbriklahv(page, number):
    page.locator(".kl-pad button", has_text=re.compile(rf"^{number}$")).first.click()


def test_avaleht(page):
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector("#kats .chip")
    kontrolli(page.title() == "Teisendaja", "pealkiri")
    kontrolli(page.locator("#mascot svg").count() == 1, "maskott joonistub")
    kontrolli(page.locator("#map .mcell").count() > 0, "oskuste kaart ei ole tühi")
    kontrolli(page.locator("#homeRedel svg.redel").count() == 1, "avalehe redel joonistub")
    note = page.locator("#competeNote").inner_text()
    kontrolli("15 ülesannet" in note and "15 sekundit" in note, "võistlusreegel on avalehel kirjas")


def test_klahvistik(page):
    """Laps kirjutab vastuse ise. Koma tohib olla ainult 4. tasemel."""
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.click("#startBtn")
    page.wait_for_selector("#pad .kl-pad")
    kontrolli(page.locator("#pad .kl-vali input").count() >= 1, "sisestusväli on olemas")
    kontrolli(page.locator("#pad .kl-koma").count() == 0, "tasemel 2 ei ole koma klahvi")
    numbriklahv(page, 1)
    numbriklahv(page, 2)
    kontrolli(page.locator("#pad .kl-vali input").first.input_value() == "12", "klahvid kirjutavad välja")
    page.click("#pad .kl-kustuta")
    kontrolli(page.locator("#pad .kl-vali input").first.input_value() == "1", "kustutus võtab viimase ära")
    # Nimega arvul on kaks lahtrit: täida ka teine, muidu on vastus tühi
    # ja ülesanne jääb (õigesti) lahti.
    valjad = page.locator("#pad .kl-vali input").all()
    if len(valjad) > 1:
        valjad[1].focus()
        page.keyboard.press("1")
    page.click("#pad .kl-vastan")
    page.wait_for_selector("#fb:not(:empty)")
    kontrolli(page.locator(".klahvistik.lukus").count() == 1, "pärast vastamist läheb klahvistik lukku")
    # 15. sept viga: #pad on sama element igas ülesandes ja lukk jäi külge,
    # seega teisest ülesandest alates ei saanud enam vastata.
    uus_lukus = page.evaluate("""() => {
      const pad = document.getElementById('pad');
      HKlahvistik.loo({ host: pad, valjad: 1, sildid: ['ml'] });
      return pad.classList.contains('lukus');
    }""")
    kontrolli(not uus_lukus, "uus klahvistik ei päri eelmise ülesande lukku")

    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector("#levels .chip")
    page.locator("#levels .chip").nth(3).click()   # 4. tase: koma ja ruudud
    page.click("#startBtn")
    page.wait_for_selector("#pad .kl-pad, #opts .opt")
    if page.locator("#pad .kl-pad").count():
        kontrolli(page.locator("#pad .kl-koma").count() == 1, "tasemel 4 on koma klahv")


def test_vale_vastus_saab_diagnoosi(page):
    """Mooduli mõte: vale vastus ei ütle ainult „vale", vaid MIS viga sa tegid."""
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.click("#startBtn")
    page.wait_for_selector("#pad .kl-pad, #opts .opt")
    # Kirjutame kindlasti vale vastuse (9 999 999 ei ole ühegi ülesande vastus).
    if page.locator("#pad .kl-pad").count():
        for _ in range(7):
            numbriklahv(page, 9)
        page.click("#pad .kl-vastan")
    else:
        page.locator("#opts .opt").first.click()
    page.wait_for_selector("#fb:not(:empty)")
    fb = page.locator("#fb").inner_text()
    if "Õige vastus" in fb:
        page.wait_for_selector("#hint:not([hidden])")
        vihje = page.locator("#hint").inner_text()
        kontrolli(len(vihje) > 10, "vihjekaardil on teksti")
        kontrolli(page.locator("#hint svg").count() >= 1, "vihjekaardil on maskott või redel")
        kontrolli(not page.locator("#after").is_hidden(), '„Edasi“ nupp tuleb nähtavale')


def test_voistlus(page):
    """Võistlus käib üks kord päevas ja on alati samadel reeglitel."""
    src = (JUUR / "teisendaja" / "app.js").read_text(encoding="utf-8")
    kontrolli("COMPETE_N = 15" in src, "võistluses on 15 ülesannet")
    kontrolli("COMPETE_SEC = 15" in src, "igale ülesandele on 15 sekundit")
    kontrolli("COMPETE_TASE = 2" in src, "võistlus käib alati tasemel 2")
    kontrolli('kat = test ? "koik"' in src, "võistluses on kõik kategooriad segi")

    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector("#competeBtn")
    page.evaluate("""() => {
      const d = JSON.parse(localStorage.getItem('teisendaja_v1') || '{}');
      const n = new Date();
      d.lastCompete = n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
      localStorage.setItem('teisendaja_v1', JSON.stringify(d));
    }""")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#competeBtn")
    kontrolli(page.locator("#competeBtn").is_disabled(), "päeva teist võistlust ei saa alustada")


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        for test in (test_avaleht, test_klahvistik, test_vale_vastus_saab_diagnoosi, test_voistlus):
            page = b.new_page()
            lahti(page)
            vigu_enne = len(vead)
            try:
                test(page)
            except Exception as e:                      # noqa: BLE001
                vead.append(f"{test.__name__} kukkus kokku: {e}")
            print(("OK   " if len(vead) == vigu_enne else "VIGA ") + test.__name__)
            page.close()
        b.close()

    if vead:
        print("\nKATKI:")
        for v in vead:
            print("  - " + v)
        sys.exit(1)
    print("\nKOIK LABI")


if __name__ == "__main__":
    main()
