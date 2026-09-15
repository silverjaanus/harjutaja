"""Raamistiku etapp 5: Korrutaja ühisel raamil.

Valvab:
  - avaleht: päises ‹ Harjutaja, 🔊 ja ⚙; nimi tuleb ühisest eelistusest;
    klassi plokk; „Kuidas see käib?" avalehel (eraldi kiirjuhendit pole);
  - võistlus: core/voistlus.js (kinnitus, päev Tallinna aja järgi, nupp
    kinni pärast võistlust); 25 tehet, 6 sekundit — reeglid ei muutu;
  - edasiminek: õige vastuse järel ~1 s (võistluses 0,8 s); vale vastuse
    järel harjutamises nupp „Edasi" (ka Enter), võistluses ise edasi;
  - tulemus: core/tulemus.js pealkiri nimega, punktid ja keskmine aeg,
    kiidukaardid, „Harjuta neid tehteid" harjutab päriselt neid;
  - saatmine: core/saatmine.js; server saab greens_mul/greens_div/best_test,
    vana kirje (ilma moodulita) läheb Korrutaja nimele;
  - edetabel ja seaded tuumast; nime muutmine, edenemise kustutamine.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8808 &
    python3 tools/test_raam5.py 8808
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8808"
BASE = f"http://localhost:{PORT}"
vead = []
MINA = "11111111-1111-4111-8111-111111111111"
KONTO = {"player_id": MINA, "secret": "TAAS42", "class_id": "c1",
         "class_name": "Test 3B", "code": "ABC123", "nick": "Mia"}
LAUD = {"me": MINA, "class": {"id": "c1", "name": "Test 3B", "code": "ABC123", "kind": "class", "grade": 3,
                              "week_n": 180, "active_week": 11},
        "players": [{"id": MINA, "nick": "Mia", "week_n": 30, "days": 2, "greens": 12, "best_test": 20}],
        "siblings": [], "peers": [], "competed_today": False}
VASTUS = """() => { const q = document.getElementById('qText').textContent;
  const m = q.match(/(\\d+)\\s*([×:])\\s*(\\d+)/); return m[2] === '×' ? (+m[1]) * (+m[3]) : (+m[1]) / (+m[3]); }"""


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


def uus(b, andmed=None, konto=True, nimi="Mia", hash=""):
    ctx = b.new_context(viewport={"width": 400, "height": 860})
    init = "(() => { if (sessionStorage.__ok) return; sessionStorage.__ok = 1;"
    if konto:
        init += f"localStorage.setItem('harjutaja_id_v1', {json.dumps(json.dumps(KONTO))});"
    init += f"localStorage.setItem('harjutaja_prefs_v1', {json.dumps(json.dumps({'sfx': True, 'music': False, 'name': nimi}))});"
    for k, v in (andmed or {}).items():
        init += f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});"
    init += "})();"
    ctx.add_init_script(init)
    page = ctx.new_page()
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())
    rpc = []

    def srv(route):
        m = re.search(r"/rpc/(\w+)", route.request.url)
        fn = m.group(1) if m else ""
        try:
            body = json.loads(route.request.post_data or "{}")
        except Exception:
            body = {}
        rpc.append((fn, body))
        v = LAUD if fn == "class_board" else {"ok": True}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(v))
    page.route(re.compile(r"supabase\.co"), srv)
    js = []
    page.on("pageerror", lambda e: js.append(str(e)))
    page.goto(f"{BASE}/korrutaja/{hash}", wait_until="domcontentloaded")
    page.wait_for_selector("#btnTrain")
    page.wait_for_timeout(200)
    return ctx, page, js, rpc


def D(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('korrutaja_v1'))")


def mangus(page):
    return page.evaluate("() => document.getElementById('s-game').classList.contains('on')")


def alusta_harjutus(page):
    # päeva soojendus vahele
    page.evaluate("() => { const d = JSON.parse(localStorage.getItem('korrutaja_v1') || 'null'); }")
    page.click("#btnTrain")
    page.wait_for_timeout(300)
    if page.locator("#wmGo").is_visible():
        page.click("#wmGo")
        page.wait_for_timeout(300)


def kysimus(page):
    """Oota päris küsimust (tutvustus läheb „Edasi" nupuga mööda)."""
    for _ in range(10):
        if page.locator("#after:not([hidden])").count():
            page.wait_for_timeout(850); page.click("#nextBtn"); page.wait_for_timeout(150); continue
        if page.evaluate("() => document.getElementById('aText').classList.contains('empty')"):
            return page.inner_text("#qText")
        page.wait_for_timeout(150)
    return None


def vasta(page, oige=True):
    v = page.evaluate(VASTUS)
    v = v if oige else v + 1
    for c in str(int(v)):
        page.keyboard.press(c)


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # --- avaleht ---
        ctx, page, js, rpc = uus(b)
        kontrolli(page.inner_text(".kname") == "Korrutaja", "avalehe pealkiri on Korrutaja")
        kontrolli(page.inner_text("#subline").startswith("Tere, Mia!"), "nimi tuleb ühisest eelistusest", page.inner_text("#subline"))
        kontrolli(page.locator("#setBtn").is_visible() and page.locator("#btnSfx").is_visible(), "päises on 🔊 ja ⚙")
        kontrolli(page.locator("#btnInfo").count() == 0 and page.locator("#s-quick").count() == 0, "eraldi (i) kiirjuhendit pole")
        kontrolli("Edasi" in page.text_content("#help"), "abitekst räägib nupust „Edasi“")
        kontrolli(page.locator("#btnBoard").is_visible() and "Test 3B" in page.inner_text("#klassNote"), "klassi plokk ja edetabeli nupp")
        kontrolli(page.inner_text("#testMeta") == "25 tehet", "võistluse nupul 25 tehet", page.inner_text("#testMeta"))
        kontrolli("6 sekundit" in page.inner_text("#testNote") and "kõigil ühesugune" in page.inner_text("#testNote"), "võistluse selgitus: 6 sekundit")

        # --- edasiminek harjutamises ---
        page.evaluate("() => { const d = JSON.parse(localStorage.getItem('korrutaja_v1')); }")
        alusta_harjutus(page)
        kontrolli(mangus(page), "harjutusring algas")
        q1 = kysimus(page)
        vasta(page, True)
        page.wait_for_timeout(650)
        kontrolli(page.inner_text("#qText") == q1 and not page.evaluate("() => document.getElementById('aText').classList.contains('empty')"),
                  "õige vastuse järel 0,65 s veel sama tehe")
        page.wait_for_timeout(700)
        kontrolli(page.inner_text("#qText") != q1 or page.locator("#after:not([hidden])").count() > 0 or
                  page.evaluate("() => document.getElementById('aText').classList.contains('empty')"), "~1 s pärast tuleb järgmine")
        q2 = kysimus(page)
        vasta(page, False)
        page.wait_for_timeout(250)
        kontrolli(page.locator("#after").is_visible(), "vale vastuse järel on nupp „Edasi“")
        page.click("#nextBtn")
        page.wait_for_timeout(100)
        kontrolli(page.locator("#after").is_visible(), "liiga kiire vajutus ei lase edasi (klahvistiku topeltpuude)")
        page.click("#stage", force=True)
        page.wait_for_timeout(1200)
        kontrolli(page.locator("#after").is_visible(), "ekraani puudutus ei lase enam edasi, ainult nupp")
        page.keyboard.press("Enter")
        page.wait_for_timeout(250)
        # Enter võib tuua uue tehte tutvustuse (ka see ootab „Edasi“), seega vaatame tehet.
        kontrolli(page.locator("#after").is_hidden() or page.inner_text("#qText") != q2, "Enter viib edasi")
        kysimus(page)
        vasta(page, False)
        page.wait_for_timeout(900)
        page.click("#nextBtn")
        page.wait_for_timeout(200)
        kontrolli(page.locator("#after").is_hidden(), "„Edasi“ viib edasi")

        # --- tulemus ja „Harjuta neid tehteid" ---
        kysimus(page)
        page.click("#gQuit")
        page.wait_for_selector("#s-result.on")
        kontrolli(page.inner_text("#resTitle") == "Hea algus, Mia!", "lühike ring: „Hea algus, Mia!“", page.inner_text("#resTitle"))
        st = page.inner_text("#resStats").lower()
        kontrolli("õigesti" in st and "punkti" in st and "keskmine aeg" in st, "numbrid: õigesti, punkti, keskmine aeg", st)
        kontrolli(page.locator("#resWins .win").count() >= 1, "kiidukaart on olemas")
        kontrolli(page.locator("#resMaskott svg").count() == 1, "tulemuses on panda")
        tags = page.locator("#resNext .tag").all_inner_texts()
        kontrolli(len(tags) >= 2 and "Järgmisel korral harjutame" in page.text_content("#resNextBlock"), "vigade rida", tags)
        kontrolli(page.inner_text("#againBtn") == "Harjuta neid tehteid", "sihitud nupp", page.inner_text("#againBtn"))
        vigased = set()
        for t in tags:
            m = re.match(r"(\d+)\D+(\d+)", t.replace(" ", " "))
            vigased.add(tuple(sorted((int(m.group(1)), int(m.group(2))))))
        page.click("#againBtn")
        page.wait_for_timeout(300)
        q = kysimus(page)
        m = re.match(r"(\d+)\D+(\d+)", q or "")
        esimene = tuple(sorted((int(m.group(1)), int(m.group(2))))) if m else None
        kontrolli(mangus(page) and esimene in vigased, "„Harjuta neid tehteid“ alustab vigasest tehtest", (q, vigased))
        page.click("#gQuit")
        page.wait_for_timeout(300)
        kontrolli(page.locator("#s-home.on").count() == 1, "ilma vastuseta ring viib otse avalehele")
        page.wait_for_timeout(400)
        d = D(page)
        rep = [x[1] for x in rpc if x[0] == "report_session"]
        kontrolli(len(rep) >= 1 and all(r.get("p_module") == "korrutaja" and r.get("p_mode") == "train" for r in rep), "harjutusring läks serverisse", rep[:1])
        kontrolli(rep and "p_greens_mul" in rep[0] and "p_best_test" in rep[0] and rep[-1].get("p_state"), "server saab greens_mul, best_test ja seisu")
        kontrolli(not d["outbox"], "järjekord on tühi", d["outbox"])
        kontrolli(not js, "harjutus: JS-vigu pole", js)
        ctx.close()

        # --- võistlus ---
        vana = {"v": 1, "settings": {"name": "Mia"}, "outbox": [{"mode": "train", "op": "div", "n": 7, "ok": 6, "score": 50, "avg": 2.1}],
                "tests": [{"d": "2026-09-01", "ok": 10, "n": 25, "avg": 3}], "warmup": {"lastDay": "", "rot": 0}}
        ctx, page, js, rpc = uus(b, andmed={"korrutaja_v1": vana})
        page.wait_for_timeout(300)
        rep = [x[1] for x in rpc if x[0] == "report_session"]
        kontrolli(rep and rep[0].get("p_module") == "korrutaja" and rep[0].get("p_op") == "div", "vana kirje läks Korrutaja nimele", rep[:1])
        page.click("#btnTest")
        page.wait_for_timeout(150)
        kontrolli(not mangus(page) and page.inner_text("#testLabel") == "Alustame?", "esimene vajutus küsib kinnitust")
        page.click("#btnTest")
        page.wait_for_timeout(300)
        kontrolli(mangus(page) and page.locator("#s-game.voistlus").count() == 1, "teine vajutus alustab võistluse")
        q1 = page.inner_text("#qText")
        kontrolli("×" in q1, "võistlus on korrutamine")
        vasta(page, True)
        page.wait_for_timeout(500)
        kontrolli(page.inner_text("#qText") == q1, "võistluses 0,5 s pärast veel sama tehe")
        page.wait_for_timeout(500)
        kontrolli(page.inner_text("#qText") != q1 or page.evaluate("() => document.getElementById('aText').classList.contains('empty')"),
                  "võistluses ~0,8 s pärast järgmine")
        page.wait_for_timeout(200)
        vasta(page, False)
        page.wait_for_timeout(300)
        kontrolli(page.locator("#after").is_hidden(), "võistluses „Edasi“ nuppu ei ole")
        page.wait_for_timeout(1300)
        kontrolli(page.evaluate("() => document.getElementById('aText').classList.contains('empty')"), "võistluses liigub vale vastuse järel ise edasi")
        # aeg: 6 s tehte kohta
        t0 = page.inner_text("#qText")
        page.wait_for_timeout(5600)
        kontrolli(page.inner_text("#qText") == t0 and page.evaluate("() => document.getElementById('aText').classList.contains('empty')"),
                  "5,6 s pärast võib veel vastata")
        page.wait_for_timeout(800)
        kontrolli(page.inner_text("#fbmsg") == "Aeg sai otsa", "6 s pärast: aeg sai otsa", page.inner_text("#fbmsg"))
        page.wait_for_timeout(1500)
        page.click("#gQuit")
        page.wait_for_timeout(150)
        kontrolli(mangus(page), "võistluse ✕ küsib kinnitust")
        page.click("#gQuit")
        page.wait_for_selector("#s-result.on")
        d = D(page)
        tana = page.evaluate("() => HVoistlus.tana()")
        kontrolli(d["lastCompete"] == tana, "võistluspäev Tallinna aja järgi", d["lastCompete"])
        t = d["tests"][-1]
        kontrolli(set(t.keys()) == {"d", "ok", "n", "avg"} and t["n"] == 3 and t["ok"] == 1, "D.tests kirje kuju ei muutunud", t)
        kontrolli("sinu rekord" in page.inner_text("#resStats").lower(), "võistluse tulemuses on rekord")
        page.wait_for_timeout(400)
        rep = [x[1] for x in rpc if x[0] == "report_session" and x[1].get("p_mode") == "test"]
        kontrolli(rep and rep[-1]["p_op"] == "mul" and rep[-1]["p_n"] == 3 and rep[-1]["p_score"] >= 10, "võistlus läks serverisse punktidega", rep[-1:])
        page.click("#homeBtn")
        kontrolli(page.is_disabled("#btnTest") and page.inner_text("#testLabel") == "Võistlus tehtud", "pärast võistlust on nupp kinni")
        kontrolli("homme" in page.inner_text("#testNote"), "selgitus: uus võistlus on homme")
        kontrolli(not js, "võistlus: JS-vigu pole", js)
        ctx.close()

        # --- edetabel, seaded ---
        ctx, page, js, rpc = uus(b)
        page.click("#btnBoard")
        page.wait_for_timeout(400)
        kontrolli(page.locator("#s-board.on").count() == 1 and page.inner_text("#bClass") == "Test 3B", "edetabel tuumast")
        kontrolli(page.inner_text('#bTabs [data-t="sure"]') == "Selged tehted", "sakk „Selged tehted“")
        page.click('#bTabs [data-t="best"]')
        kontrolli("25 korrutustehet" in page.inner_text("#bHint"), "rekordi selgitus: 25 korrutustehet")
        kontrolli(any(x[0] == "class_board" and x[1].get("p_module") == "korrutaja" for x in rpc), "edetabel küsib Korrutaja tabelit")
        page.click("#bBack")
        kontrolli(page.locator("#s-home.on").count() == 1, "edetabelist tagasi avalehele")
        page.click("#setBtn")
        kontrolli(page.locator("#s-settings.on").count() == 1, "⚙ avab seaded")
        kontrolli(page.locator("#fName").is_visible() and page.locator("#fMusic").is_visible(), "seadetes on nimi ja muusika")
        kontrolli(page.get_attribute('#segLimit button[data-v="6"]', "aria-pressed") == "true", "vaikimisi 6 sekundit")
        page.click('#segRound button[data-v="10"]')
        page.fill("#inName", "Uku")
        page.click('#segLimit button[data-v="8"]')
        d = D(page)
        kontrolli(d["settings"]["round"] == 10 and d["settings"]["limit"] == 8 and d["settings"]["name"] == "Uku", "seaded salvestuvad", d["settings"])
        page.click("#setBack")
        kontrolli(page.inner_text("#subline").startswith("Tere, Uku!") and "10 tehet" in page.inner_text("#trainMeta"), "avaleht näitab uut nime ja ringi")
        # edenemise kustutamine
        page.evaluate("() => { const d = JSON.parse(localStorage.getItem('korrutaja_v1')); d.total = {n: 99, ok: 90}; localStorage.setItem('korrutaja_v1', JSON.stringify(d)); }")
        page.click("#setBtn")
        page.click("#btnReset")
        kontrolli(page.locator("#resetNote").is_visible() and D(page)["total"]["n"] == 99, "kustutamine küsib kinnitust")
        page.click("#btnReset")
        page.wait_for_selector("#btnTrain")
        page.wait_for_timeout(300)
        d = D(page)
        kontrolli(d["total"]["n"] == 0 and d["settings"]["name"] == "Uku" and d["cls"] and d["cls"]["code"] == "ABC123", "edenemine kustus, nimi ja klass jäid", d.get("cls"))
        # lahkumine
        page.click("#setBtn")
        page.click("#setLeave"); page.click("#setLeave")
        page.click("#setBack")
        kontrolli(page.locator("#btnBoard").is_hidden() and page.inner_text("#btnJoin") == "Liitu klassiga", "pärast lahkumist pole edetabelit")
        kontrolli(D(page)["cls"] is None, "D.cls tühjendati")
        kontrolli(not js, "seaded: JS-vigu pole", js)
        ctx.close()

        # --- kutselink ---
        ctx, page, js, rpc = uus(b, konto=False, hash="#k=XYZ789&n=Test%204A")
        page.wait_for_timeout(300)
        vaartused = page.evaluate("() => [...document.querySelectorAll('input')].map(i => i.value)")
        kontrolli("XYZ789" in vaartused, "kutselink avab liitumise koodiga", vaartused)
        ctx.close()

        b.close()
    print()
    print("KOIK LABI" if not vead else f"KATKI: {len(vead)} viga")
    sys.exit(1 if vead else 0)


main()
