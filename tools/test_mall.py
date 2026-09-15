"""Raamistiku etapp 6: mooduli leping (core/moodul.js) ja mall (_mall/).

Valvab, et malli järgi tehtud moodul saab kõik ühised reeglid tuumast:
avaleht (kiibid, Harjuta/Võistle, klass), mäng (~1 s edasi, „Edasi",
vihje, ‹ eelmine, veateade), tulemus („Harjuta neid …" harjutab vigu),
võistlus (kinnitus, taimer, ‹ ja veateade peidus, päev kinni), edetabel,
seaded. Lisaks: muusika loend vahetab lugu, kui üks saab läbi.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8807 &
    python3 tools/test_mall.py 8807
    node _mall/sisu.test.js
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8807"
BASE = f"http://localhost:{PORT}"
vead = []
MINA = "11111111-1111-4111-8111-111111111111"
KONTO = {"player_id": MINA, "secret": "TAAS42", "class_id": "c1",
         "class_name": "Test 3B", "code": "ABC123", "nick": "Mia"}
LAUD = {"me": MINA, "class": {"id": "c1", "name": "Test 3B", "code": "ABC123", "kind": "class", "grade": 3,
                              "week_n": 40, "active_week": 3},
        "players": [{"id": MINA, "nick": "Mia", "week_n": 12, "days": 1, "greens": 3, "best_test": 12}],
        "siblings": [], "peers": [], "competed_today": False}
VAIKNE = """(() => { window.__play = 0; HTMLMediaElement.prototype.play = function () { window.__play++; return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () {}; })();"""


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


def uus(b, tee="_mall/", konto=True, prefs=None):
    ctx = b.new_context(viewport={"width": 400, "height": 860})
    init = "(() => { if (sessionStorage.__ok) return; sessionStorage.__ok = 1;"
    if konto:
        init += f"localStorage.setItem('harjutaja_id_v1', {json.dumps(json.dumps(KONTO))});"
    if prefs:
        init += f"localStorage.setItem('harjutaja_prefs_v1', {json.dumps(json.dumps(prefs))});"
    init += "})();"
    ctx.add_init_script(init)
    ctx.add_init_script(VAIKNE)
    page = ctx.new_page()
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())
    rpc = []

    def srv(route):
        fn = re.search(r"/rpc/(\w+)", route.request.url).group(1)
        rpc.append((fn, json.loads(route.request.post_data or "{}")))
        route.fulfill(status=200, content_type="application/json",
                      body=json.dumps(LAUD if fn == "class_board" else {"ok": True}))
    page.route(re.compile(r"supabase\.co"), srv)
    js = []
    page.on("pageerror", lambda e: js.append(str(e)))
    page.goto(f"{BASE}/{tee}", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.wait_for_timeout(200)
    return ctx, page, js, rpc


def vastus(page):
    return page.evaluate("() => HMang._aktiivne.cur.vastus")


def vali(page, oige):
    v = vastus(page)
    nupud = page.locator("#opts button")
    for i in range(nupud.count()):
        k = int(nupud.nth(i).get_attribute("data-k"))
        if (k == v) == oige:
            nupud.nth(i).click()
            return


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # --- avaleht ---
        ctx, page, js, rpc = uus(b)
        kontrolli(page.inner_text("h1") == "Näidis", "leht ehitati: pealkiri")
        kontrolli(page.locator("#val-tase .chip").count() == 3, "kiibid joonistati")
        kontrolli(page.locator("#musicBtn").count() == 0, "ilma loota muusikanuppu pole")
        kontrolli(page.inner_text("#trainMeta") == "10 tehet" and page.inner_text("#competeMeta") == "15 tehet", "nuppude alamtekst")
        kontrolli("10 sekundit" in page.inner_text("#competeNote"), "võistluse kirjeldus")
        kontrolli(page.locator("#boardBtn").is_visible() and "Test 3B" in page.inner_text("#klassNote"), "klassi plokk")
        page.click('#val-tase .chip:has-text("Kuni 20")')
        d = page.evaluate("() => JSON.parse(localStorage.getItem('naidis_v1'))")
        kontrolli(d["valik"]["tase"] == 2, "kiibi valik salvestub", d.get("valik"))

        # --- harjutus ---
        page.click("#startBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.inner_text("#loendur") == "1 / 10", "loendur 1 / 10", page.inner_text("#loendur"))
        kontrolli(page.locator("#timer").is_hidden(), "harjutuses taimerit pole")
        q1 = page.inner_text("#askText")
        vali(page, True)
        page.wait_for_timeout(600)
        kontrolli(page.inner_text("#askText") == q1 and "right" in (page.locator("#opts .opt.right").first.get_attribute("class") or ""), "õige: 0,6 s veel sama tehe")
        page.wait_for_timeout(700)
        kontrolli(page.inner_text("#loendur") == "2 / 10", "õige: ~1 s pärast järgmine")
        q2 = page.inner_text("#askText")
        vali(page, False)
        page.wait_for_timeout(200)
        kontrolli(page.locator("#after").is_visible() and page.locator("#hint svg.tapike").count() == 1, "vale: „Edasi“ ja vihje maskotiga")
        kontrolli("Õige vastus on" in page.inner_text("#fb"), "vale: õige vastus näidatud")
        page.click("#flagBtn")
        kontrolli(page.locator("#flagBox").is_visible() and "?" in page.inner_text("#flagSentence"), "veateate aken")
        page.click('#flagOpts [data-why="vastus"]')
        page.wait_for_timeout(300)
        iss = [x[1] for x in rpc if x[0] == "report_issue"]
        kontrolli(iss and iss[0]["p_module"] == "naidis" and iss[0]["p_note"] == "Mäng näitab valet vastust", "veateade läks serverisse", iss[:1])
        page.click("#nextBtn")
        page.wait_for_timeout(150)
        kontrolli(page.inner_text("#loendur").startswith("3 /"), "„Edasi“ viib edasi", page.inner_text("#loendur"))
        page.click("#prevBtn")
        kontrolli(page.locator("#reviewBar").is_visible() and page.inner_text("#askText") == q2, "‹ näitab eelmist")
        page.click("#reviewBack")
        page.click("#quitBtn")
        page.wait_for_selector("#s-result:not([hidden])")
        kontrolli(page.inner_text("#resTitle") == "Hea algus!", "tulemus: Hea algus!", page.inner_text("#resTitle"))
        kontrolli(page.locator("#resMaskott svg.tapike").count() == 1, "tulemuses on maskott")
        kontrolli(page.locator("#resNext .vaeg").count() == 1 and page.inner_text("#againBtn") == "Harjuta neid tehteid", "vigade rida ja sihitud nupp")
        page.click("#againBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.inner_text("#askText") == q2, "„Harjuta neid tehteid“ alustab veast", (page.inner_text("#askText"), q2))
        page.click("#quitBtn")
        page.wait_for_timeout(300)
        kontrolli(page.locator("#s-home").is_visible(), "vastuseta ring viib koju")
        page.wait_for_timeout(300)
        rep = [x[1] for x in rpc if x[0] == "report_session"]
        kontrolli(rep and rep[0]["p_module"] == "naidis" and rep[0]["p_mode"] == "train", "harjutusring läks serverisse", rep[:1])
        kontrolli(page.locator("#kaart div").count() >= 1, "avalehe kaart näitab harjutatud tehteid")

        # --- võistlus ---
        page.click("#competeBtn")
        kontrolli(page.locator("#s-home").is_visible() and page.inner_text("#competeLbl") == "Alustame?", "võistlus küsib kinnitust")
        page.click("#competeBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.inner_text("#loendur") == "1 / 15", "võistluses 15 tehet", page.inner_text("#loendur"))
        kontrolli(page.locator("#timer").is_visible() and page.locator("#prevBtn").is_hidden() and page.locator("#flagBtn").is_hidden(),
                  "võistluses taimer, ‹ ja veateade peidus")
        kontrolli(page.evaluate("() => HMang._aktiivne.cur.a + HMang._aktiivne.cur.b <= 20"), "võistlus on alati tasemel „Kuni 20“")
        vali(page, False)
        page.wait_for_timeout(300)
        kontrolli(page.locator("#after").is_hidden(), "võistluses „Edasi“ puudub")
        page.wait_for_timeout(1300)
        kontrolli(page.inner_text("#loendur") == "2 / 15", "võistluses vale järel ise edasi")
        page.click("#quitBtn"); page.click("#quitBtn")
        page.wait_for_selector("#s-result:not([hidden])")
        kontrolli("rekord" in page.inner_text("#resStats").lower(), "võistluse tulemuses rekord")
        page.click("#homeBtn")
        kontrolli(page.is_disabled("#competeBtn") and page.inner_text("#competeLbl") == "Võistlus tehtud", "pärast võistlust nupp kinni")

        # --- edetabel ja seaded ---
        page.click("#boardBtn")
        page.wait_for_timeout(300)
        kontrolli(page.inner_text('#bTabs [data-t="sure"]') == "Selged tehted", "edetabeli sakk „Selged tehted“")
        kontrolli(any(x[0] == "class_board" and x[1].get("p_module") == "naidis" for x in rpc), "edetabel küsib mooduli tabelit")
        page.click("#bBack")
        page.click("#setBtn")
        kontrolli(page.locator("#s-settings").is_visible() and page.locator("#fMusic").is_hidden(), "seaded ilma muusikata")
        page.click("#setBack")
        kontrolli(page.locator("#s-home").is_visible(), "seadetest koju")
        kontrolli(not js, "mall: JS-vigu pole", js)
        ctx.close()

        # --- klassita ---
        ctx, page, js, rpc = uus(b, konto=False)
        kontrolli("pole veel klassiga liitunud" in page.inner_text("#klassNote") and page.locator("#boardBtn").is_hidden(), "klassita laps")
        ctx.close()

        # --- muusika loend (Teisendaja) ---
        ctx, page, js, rpc = uus(b, tee="teisendaja/", prefs={"sfx": True, "music": True, "name": ""})
        page.click("#startBtn")
        page.wait_for_timeout(500)
        esimene = page.evaluate("() => HMuusika._lugu()")
        kontrolli(page.evaluate("() => HMuusika._kõlab() && window.__play === 1"), "Teisendaja: muusika mängib")
        page.evaluate("() => document.querySelectorAll('audio').length")
        page.evaluate("""() => { const a = [...performance.getEntriesByType('resource')]; return a.length; }""")
        # lugu sai läbi → järgmine
        page.evaluate("() => HMuusika._audio && HMuusika._audio().dispatchEvent(new Event('ended'))")
        page.wait_for_timeout(500)
        teine = page.evaluate("() => HMuusika._lugu()")
        kontrolli(esimene != teine and page.evaluate("() => window.__play") == 2, "loo lõpus tuleb järgmine lugu", (esimene, teine))
        kontrolli(not js, "muusika: JS-vigu pole", js)
        ctx.close()

        b.close()
    print()
    print("KOIK LABI" if not vead else f"KATKI: {len(vead)} viga")
    sys.exit(1 if vead else 0)


main()
