"""Raamistiku etapp 4: ühine tulemus, edetabel ja seaded (Kell, Kirjutaja, Teisendaja).

Valvab:
  - edetabel on Korrutaja kujuga: klassi nimi ja kood, nädala eesmärgiriba,
    7 esimest ja siis mina („···" vahel), tiimil pole Kool/Eesti sakke,
    sakk „Selged …" mooduli sõnaga;
  - seadete leht on igas moodulis: heli lüliti liigub päise nupuga kaasa,
    muusika ainult Kellas, klassi kood ja taastekood on näha, lahkumine
    küsib kinnitust ja pärast seda ei tule vana Korrutaja konto tagasi;
  - tulemus: pealkiri ühest tabelist, „Järgmisel korral harjutame",
    lühike ring = „Hea algus!", võistluse rekordikast.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8810 &
    python3 tools/test_raam4.py 8810
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8810"
BASE = f"http://localhost:{PORT}"
vead = []
MINA = "11111111-1111-4111-8111-111111111111"
KONTO = {"player_id": MINA, "secret": "TAAS42", "class_id": "c1",
         "class_name": "Test 3B", "code": "ABC123", "nick": "Mia"}
VAIKNE = """(() => { HTMLMediaElement.prototype.play = function () { const a = this; setTimeout(() => a.onended && a.onended(), 30); return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () {}; })();"""


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


def laud(kind="class", mitu=10):
    players = [{"id": f"p{i}", "nick": f"Laps{i:02d}", "week_n": 100 - i, "days": 2, "greens": i, "best_test": 10, "total_n": 5}
               for i in range(mitu)]
    players.append({"id": MINA, "nick": "Mia", "week_n": 3, "days": 1, "greens": 1, "best_test": 4, "total_n": 5})
    return {"me": MINA, "class": {"id": "c1", "name": "Test 3B", "code": "ABC123", "kind": kind, "grade": 3,
                                  "week_n": 180, "active_week": 11},
            "players": players,
            "siblings": [{"id": "c1", "name": "3B", "week_n": 180, "active": 11, "per_player": 16}],
            "peers": [{"id": "c9", "name": "Muu 3A", "school": "Muu Kool", "week_n": 90, "active": 2, "per_player": 45}],
            "competed_today": False}


def uus(b, moodul, andmed=None, board=None, konto=True):
    ctx = b.new_context(viewport={"width": 400, "height": 860})
    init = "(() => { if (sessionStorage.__ok) return; sessionStorage.__ok = 1;"
    if konto:
        init += f"localStorage.setItem('harjutaja_id_v1', {json.dumps(json.dumps(KONTO))});"
    for k, v in (andmed or {}).items():
        init += f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});"
    init += "})();"
    ctx.add_init_script(init)
    ctx.add_init_script(VAIKNE)
    ctx.grant_permissions(["clipboard-read", "clipboard-write"])
    page = ctx.new_page()
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())

    def srv(route):
        m = re.search(r"/rpc/(\w+)", route.request.url)
        fn = m.group(1) if m else ""
        if fn == "class_board":
            v = board or {"error": "net"}
        elif fn in ("report_session", "report_issue"):
            v = {"ok": True}
        else:
            v = {"error": "net"}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(v))
    page.route(re.compile(r"supabase\.co"), srv)
    js = []
    page.on("pageerror", lambda e: js.append(str(e)))
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.wait_for_timeout(200)
    return ctx, page, js


SELGED = {"kell": "Selged kellaajad", "kirjutaja": "Selged sõnad", "teisendaja": "Selged teisendused"}


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for m in ["kell", "kirjutaja", "teisendaja"]:
            # --- edetabel ---
            ctx, page, js = uus(b, m, board=laud())
            page.click("#boardBtn")
            page.wait_for_timeout(500)
            kontrolli(page.inner_text("#bClass") == "Test 3B" and page.inner_text("#bCode") == "ABC123", f"{m}: edetabelis klass ja kood")
            kontrolli("180 punkti" in page.inner_text("#bWeek") and "11 võistlejat" in page.inner_text("#bWeek"), f"{m}: nädala rida", page.inner_text("#bWeek"))
            kontrolli(page.inner_text("#bGoal") == "eesmärk 250", f"{m}: eesmärk", page.inner_text("#bGoal"))
            laius = page.evaluate("() => parseFloat(document.getElementById('bGoalBar').style.width)")
            kontrolli(abs(laius - 72) < 0.5, f"{m}: eesmärgiriba 180/250", laius)
            read = page.locator("#bList .brow:not(.gap)")
            kontrolli(read.count() == 8, f"{m}: 7 esimest + mina", read.count())
            kontrolli(page.locator("#bList .brow.gap").count() == 1, f"{m}: vahel on „···“")
            kontrolli("Mia" in read.nth(7).inner_text() and "11." in read.nth(7).inner_text() and "me" in (read.nth(7).get_attribute("class") or ""),
                      f"{m}: viimane rida on mina, koht 11", read.nth(7).inner_text())
            kontrolli(page.inner_text('#bTabs [data-t="sure"]') == SELGED[m], f"{m}: sakk {SELGED[m]}")
            page.click('#bTabs [data-t="sure"]')
            kontrolli("Laps09" in read.nth(0).inner_text(), f"{m}: selgete sakk järjestab selgete järgi")
            page.click('#bTabs [data-t="school"]')
            kontrolli("3. klassid" in page.inner_text("#bHint"), f"{m}: kooli sakk nimetab klassiastet")
            page.click("#bInvite")
            page.wait_for_timeout(300)
            kutse = page.evaluate("() => navigator.clipboard.readText()")
            kontrolli("ABC123" in kutse and "#k=ABC123" in kutse, f"{m}: kutses on kood ja link", kutse)
            page.click("#bBack")
            kontrolli(page.locator("#s-home").is_visible(), f"{m}: ‹ viib koju")

            # --- seaded ---
            page.click("#setBtn")
            kontrolli(page.locator("#s-settings").is_visible(), f"{m}: ⚙ avab seaded")
            kontrolli(page.inner_text("#setCode") == "ABC123" and page.inner_text("#setSecret") == "TAAS42", f"{m}: kood ja taastekood näha")
            kontrolli(page.locator("#fMusic").is_visible() == (m == "kell"), f"{m}: muusika ainult Kellas")
            page.click('#segSfx button[data-v="0"]')
            prefs = page.evaluate("() => JSON.parse(localStorage.getItem('harjutaja_prefs_v1'))")
            kontrolli(prefs["sfx"] is False, f"{m}: seadetes heli välja")
            kontrolli(page.get_attribute("#sfxBtn", "aria-pressed") == "false", f"{m}: avalehe heli nupp liikus kaasa")
            page.click("#setLeave")
            kontrolli(page.locator("#setLeaveNote").is_visible() and page.evaluate("() => !!localStorage.getItem('harjutaja_id_v1')"),
                      f"{m}: esimene vajutus ainult hoiatab")
            page.click("#setLeave")
            kontrolli(not page.evaluate("() => localStorage.getItem('harjutaja_id_v1')"), f"{m}: teine vajutus lahkub")
            kontrolli(page.locator("#setJoin").is_visible() and page.locator("#setCodes").is_hidden(), f"{m}: pärast lahkumist on „Liitu klassiga“")
            page.click("#setBack")
            kontrolli(page.locator("#boardBtn").is_hidden(), f"{m}: avalehel pole enam edetabelit")
            kontrolli(not js, f"{m}: konsoolis pole JS-vigu", js)
            ctx.close()

            # --- tiim ---
            ctx, page, js = uus(b, m, board=laud("team", 3))
            page.click("#boardBtn")
            page.wait_for_timeout(400)
            kontrolli(page.locator('#bTabs [data-t="school"]').is_hidden() and page.locator('#bTabs [data-t="country"]').is_hidden(),
                      f"{m}: tiimil pole Kool/Eesti sakke")
            kontrolli(page.locator("#bList .brow.gap").count() == 0, f"{m}: väikses tiimis „···“ ei ole")
            ctx.close()

            # --- tulemus: lühike ring ---
            ctx, page, js = uus(b, m, konto=False)
            page.click("#startBtn")
            page.wait_for_selector("#s-game:not([hidden])")
            page.wait_for_timeout(200)
            page.locator("#opts button").first.click() if page.locator("#opts button").count() and page.locator("#opts").is_visible() else None
            if m == "teisendaja" and page.locator("#pad").is_visible():
                for v in page.locator("#pad .kl-vali input").all():
                    v.focus(); page.keyboard.press("7")
                page.click("#pad .kl-vastan")
            page.wait_for_timeout(200)
            page.click("#quitBtn")
            page.wait_for_selector("#s-result:not([hidden])")
            kontrolli(page.inner_text("#resTitle") == "Hea algus!", f"{m}: lühike ring = „Hea algus!“", page.inner_text("#resTitle"))
            kontrolli(page.locator("#resMaskott svg").count() == 1, f"{m}: tulemuses on maskott")
            kontrolli("1" in page.inner_text("#resStats") and "õigesti" in page.inner_text("#resStats"), f"{m}: „N / M õigesti“")
            if page.locator("#resNextBlock").is_visible():
                kontrolli("Järgmisel korral harjutame" in page.text_content("#resNextBlock"), f"{m}: vigade silt")
                kontrolli(page.inner_text("#againBtn").startswith("Harjuta neid"), f"{m}: sihitud nupp", page.inner_text("#againBtn"))
            kontrolli(not js, f"{m}: tulemus ilma JS-vigadeta", js)
            ctx.close()

        # --- lahkumine ei too vana Korrutaja kontot tagasi ---
        ctx, page, js = uus(b, "kell", andmed={"korrutaja_v1": {"v": 1, "settings": {}, "cls": KONTO}}, konto=False)
        kontrolli(page.locator("#boardBtn").is_visible(), "vana Korrutaja konto tõsteti üle")
        page.click("#setBtn")
        page.click("#setLeave"); page.click("#setLeave")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector("#startBtn")
        kontrolli(page.locator("#boardBtn").is_hidden(), "pärast lahkumist ei tule vana konto tagasi")
        ctx.close()

        # --- tulemus: pealkirjade tabel ---
        ctx, page, js = uus(b, "kell", konto=False)
        t = page.evaluate("""() => { const T = HTulemus.loo({D: {tests: [], rounds: []}, save(){}, n: 20});
          const P = (mode, n, ok, r) => T.pealkiri({mode, n, ok}, r)[0];
          return [P('test', 20, 20), P('test', 5, 5), P('test', 20, 17), P('test', 5, 5, true), P('train', 12, 11), P('train', 12, 5), P('train', 3, 3)]; }""")
        kontrolli(t == ["Kõik õiged!", "Tubli võistlus!", "Tugev ring!", "Uus rekord!", "Suurepärane!", "Hästi harjutatud!", "Hea algus!"],
                  "pealkirjade tabel", t)
        ctx.close()

        b.close()
    print()
    print("KOIK LABI" if not vead else f"KATKI: {len(vead)} viga")
    sys.exit(1 if vead else 0)


main()
