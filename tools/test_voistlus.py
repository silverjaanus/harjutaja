"""Etapp 3 test: Kirjutaja võistlus, liitumisekraan ja edetabel.

Jookseb Cowork'i pilvekonteineris (seal on Playwright ja Chromium), mitte
Windowsis. Serveeri repo juurest ja käivita:

    python3 -m http.server 8898
    python3 tools/test_voistlus.py

Supabase on pilves proxy taga kinni — see on hea, sest nii saab kontrollida ka
võrguta käitumist: tulemus peab jääma outbox'i ja edetabel näitama viimast seisu.

Võistlusreeglid (20 sõna, 10 s, üks kord päevas) on Silveri otsus ja neid ei
muudeta ilma temata — see test valvab, et need kogemata ära ei kaoks.
"""
import json, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8898"
CLS = {"player_id": "11111111-1111-4111-8111-111111111111", "secret": "AAAA1111",
       "class_id": "aaaaaaaa-1111-4111-8111-111111111111",
       "class_name": "Õismäe Gümnaasium 3B", "code": "ABC123", "nick": "Mia"}
BOARD = {
    "me": CLS["player_id"], "module": "kirjutaja",
    "class": {"id": CLS["class_id"], "name": CLS["class_name"], "code": "ABC123", "grade": 3},
    "players": [
        {"id": CLS["player_id"], "nick": "Mia", "week_n": 34, "days": 2, "greens": 120, "best_test": 18, "total_n": 60},
        {"id": "x", "nick": "Karl", "week_n": 41, "days": 3, "greens": 88, "best_test": 20, "total_n": 40},
    ],
    "siblings": [{"id": CLS["class_id"], "name": "3B", "week_n": 75, "active": 2, "per_player": 38}],
    "peers": [{"id": "z", "name": "Muu Kool 3A", "school": "Muu Kool", "week_n": 90, "active": 2, "per_player": 45}],
    "competed_today": False,
}

fails = []


def check(name, ok, detail=""):
    print(("  OK   " if ok else "  VIGA ") + name + (("  -> " + str(detail)) if detail and not ok else ""))
    if not ok:
        fails.append(name)


def ls(page, key):
    v = page.evaluate("k => localStorage.getItem(k)", key)
    return json.loads(v) if v else None


def run(pw):
    br = pw.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    ctx = br.new_context(viewport={"width": 390, "height": 844})
    ctx.route("**://fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("**://fonts.gstatic.com/**", lambda r: r.abort())
    ctx.route("**://*.supabase.co/**", lambda r: r.abort())
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))

    # seeme: klass olemas, edetabel vahemälus
    page.goto(BASE + "/kirjutaja/", wait_until="domcontentloaded")
    page.evaluate("""([c, b]) => {
        localStorage.clear();
        localStorage.setItem('harjutaja_id_v1', JSON.stringify(c));
        localStorage.setItem('kirjutaja_v1', JSON.stringify({stats:{}, sfx:false, board:b}));
    }""", [CLS, BOARD])
    page.goto(BASE + "/kirjutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(600)

    print("\n1. Avaleht")
    check("Harjuta nupp olemas", page.locator("#startBtn").is_visible())
    check("Võistle nupp olemas", page.locator("#competeBtn").is_visible())
    check("klassirida näitab klassi", CLS["class_name"] in page.locator("#klassNote").inner_text())
    check("Edetabeli nupp nähtav", page.locator("#boardBtn").is_visible())
    check("võistluse selgitus paigas", "20" in page.locator("#competeNote").inner_text()
          and "10" in page.locator("#competeNote").inner_text(), page.locator("#competeNote").inner_text())

    print("\n2. Edetabel")
    page.locator("#boardBtn").click()
    page.wait_for_timeout(800)
    check("edetabeli ekraan avanes", page.locator("#s-board").is_visible())
    rows = page.locator("#bList .brow")
    check("nädala tabelis kaks rida", rows.count() == 2, rows.count())
    check("esimene on Karl (41 > 34)", "Karl" in rows.nth(0).inner_text(), rows.nth(0).inner_text())
    check("Mia rida on esile tõstetud", "me" in (rows.nth(1).get_attribute("class") or ""))
    page.locator('#bTabs .chip[data-t="best"]').click()
    page.wait_for_timeout(300)
    check("Rekord: Karl 20 ees", "20" in page.locator("#bList .brow").nth(0).inner_text())
    page.locator('#bTabs .chip[data-t="school"]').click()
    page.wait_for_timeout(300)
    check("Kooli tabelis oma klass", "3B" in page.locator("#bList").inner_text())
    check("selgitus nimetab klassiastet", "3. klassid" in page.locator("#bHint").inner_text(),
          page.locator("#bHint").inner_text())
    page.locator("#bBack").click()
    page.wait_for_timeout(400)

    print("\n3. Võistlus nõuab kinnitust")
    page.locator("#competeBtn").click()
    page.wait_for_timeout(200)
    check("esimene vajutus küsib kinnitust", "Alustame" in page.locator("#competeBtn").inner_text(),
          page.locator("#competeBtn").inner_text())
    check("mäng ei alanud", page.locator("#s-game").is_hidden())
    page.locator("#competeBtn").click()
    page.wait_for_timeout(900)
    check("teine vajutus alustas", page.locator("#s-game").is_visible())
    check("‹ nupp peidus", page.locator("#prevBtn").is_hidden())
    check("? nupp peidus", page.locator("#flagBtn").is_hidden())
    # Taimer käivitub alles siis, kui sõna on ette loetud — kuulamine ei söö aega.
    try:
        page.wait_for_selector("#timer:not([hidden])", timeout=8000)
        shown = True
    except Exception:
        shown = False
    check("taimer käivitub pärast sõna ettelugemist", shown)
    w1 = page.evaluate("parseFloat(document.getElementById('timerFill').style.width) || 0")
    page.wait_for_timeout(1500)
    w2 = page.evaluate("parseFloat(document.getElementById('timerFill').style.width) || 0")
    check("taimer jookseb alla", w2 < w1 - 5, "%s -> %s" % (w1, w2))

    print("\n4. Mängime 20 sõna läbi")
    answered = 0
    t0 = time.time()
    while answered < 25 and time.time() - t0 < 120:
        if page.locator("#s-result").is_visible():
            break
        opts = page.locator("#opts .opt")
        if opts.count() and opts.nth(0).is_enabled():
            opts.nth(0).click()          # alati esimene variant: osa õigeid, osa valesid
            answered += 1
            page.wait_for_timeout(260)
        else:
            page.wait_for_timeout(160)
    page.wait_for_timeout(2200)
    check("võistlus jõudis tulemuseni", page.locator("#s-result").is_visible())
    check("vastuseid oli 20", answered == 20, answered)
    check("vihjekaarti ei näidatud", page.locator("#hint").is_hidden())

    d = ls(page, "kirjutaja_v1")
    check("võistlus läks kirja", len(d.get("tests", [])) == 1, d.get("tests"))
    check("tänane kuupäev märgitud", bool(d.get("lastCompete")), d.get("lastCompete"))
    check("tulemus ootab outbox'is (võrku pole)", len(d.get("outbox", [])) == 1, d.get("outbox"))
    ob = (d.get("outbox") or [{}])[0]
    check("outbox: moodul kirjutaja", ob.get("module") == "kirjutaja", ob)
    check("outbox: 20 küsimust", ob.get("n") == 20, ob)
    check("outbox: mode test", ob.get("mode") == "test", ob)
    check("tulemuses on rekordi kast", "rekord" in page.locator("#resStats").inner_text().lower(),
          page.locator("#resStats").inner_text())

    print("\n5. Teist korda samal päeval ei saa")
    page.locator("#homeBtn").click()
    page.wait_for_timeout(500)
    check("Võistle nupp on kinni", page.locator("#competeBtn").is_disabled())
    check("selgitus ütleb, et homme", "homme" in page.locator("#competeNote").inner_text().lower(),
          page.locator("#competeNote").inner_text())

    print("\n6. Liitumisekraan")
    page.evaluate("localStorage.removeItem('harjutaja_id_v1')")
    page.goto(BASE + "/kirjutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    check("klassita tekst paigas", "pole veel klassis" in page.locator("#klassNote").inner_text(),
          page.locator("#klassNote").inner_text())
    check("Edetabeli nupp peidus", page.locator("#boardBtn").is_hidden())
    page.locator("#joinBtn").click()
    page.wait_for_timeout(400)
    check("liitumisaken avanes", page.locator(".hk-card").is_visible())
    check("koodiväli olemas", page.locator(".hk-card input").count() >= 2)
    check("uue klassi loomine on olemas", "Loo uus klass" in page.locator(".hk-card").inner_text())
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    check("Escape sulgeb", page.locator(".hk-card").count() == 0)

    print("\n7. Kutselink täidab koodi")
    page.goto(BASE + "/kirjutaja/#k=ABC123", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    check("liitumisaken avanes lingist", page.locator(".hk-card").is_visible())
    val = page.locator(".hk-card input").nth(0).input_value()
    check("kood on ette täidetud", val == "ABC123", val)

    print("\n8. Harjutamine töötab endiselt")
    page.keyboard.press("Escape")
    page.wait_for_timeout(200)
    page.locator("#startBtn").click()
    page.wait_for_timeout(800)
    check("harjutusring algas", page.locator("#s-game").is_visible())
    check("‹ nupp on harjutamises olemas", page.locator("#prevBtn").is_visible())
    check("taimerit harjutamises ei ole", page.locator("#timer").is_hidden())
    page.locator("#opts .opt").nth(0).click()
    page.wait_for_timeout(700)
    check("vastamine töötab", page.locator("#gap").inner_text().strip() != "")

    real = [e for e in errs if "fonts" not in e and "Failed to fetch" not in e and "supabase" not in e]
    check("konsoolis pole JS-vigu", not real, "; ".join(real[:3]))
    br.close()


with sync_playwright() as pw:
    run(pw)

print("\n" + ("KÕIK LÄBI" if not fails else "LÄBI KUKKUS (%d): " % len(fails) + ", ".join(fails)))
sys.exit(1 if fails else 0)
