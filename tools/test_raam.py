"""Raamistiku etapp 2: ühine mängu raam, võistlus ja saatmine Teisendajas.

Valvab (claude/raamistik-plaan.md, claude/moodulite-otsused.md):
  - päises on „N / M" ja Harjuta ning Võistle nupul ringi pikkus;
  - õige vastuse järel läheb mäng ise edasi umbes 1 s pärast, vale järel
    ootab „Edasi" nuppu või Enterit;
  - Escape ei lõpeta kunagi ringi;
  - veateate aken peatab edasimineku, käib aknas oleva ülesande kohta,
    Escape sulgeb selle ja mäng läheb edasi; võistluses nuppu ei ole;
  - võistluses loeb peidetud vahelehe ülesanne vahelejäetuks;
  - päevapiir käib Tallinna aja järgi, mitte seadme ajavööndi järgi;
  - saatmine: üks päring korraga, võrguviga jätab kirje alles, done_today
    kustutab kirje ja paneb võistluse kinni, teise konto kirjet ei saadeta,
    harjutusring läheb serverisse (mode "train") koos selgete arvuga;
  - veateade on saadetud ainult siis, kui server vastas ok;
  - selge teisendus = paar, mis on mõlemat pidi selge;
  - tasemete märkus ja redeli mõlemad suunad.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8812 &
    python3 tools/test_raam.py 8812
"""
import json
import re
import sys
import time
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8812"
BASE = f"http://localhost:{PORT}/teisendaja/"
vead = []

KONTO = {"player_id": "11111111-1111-4111-8111-111111111111", "secret": "S1", "class_id": "c1",
         "class_name": "Test 3B", "code": "ABC123", "nick": "Mia"}


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


class Server:
    """Supabase'i asendus: loeb päringud kokku ja vastab etteantud moodi."""

    def __init__(self):
        self.paringud = []
        self.vastus = {"report_session": lambda p: {"ok": True, "module": "teisendaja", "competed_today": p["p_mode"] == "test"},
                       "report_issue": lambda p: {"ok": True},
                       "class_board": lambda p: {"error": "net"}}
        self.samal_ajal = 0
        self.max_samal_ajal = 0
        self.viivitus = 0

    def __call__(self, route):
        url = route.request.url
        m = re.search(r"/rpc/(\w+)", url)
        if not m:
            return route.abort()
        fn = m.group(1)
        p = json.loads(route.request.post_data or "{}")
        self.paringud.append((fn, p))
        self.samal_ajal += 1
        self.max_samal_ajal = max(self.max_samal_ajal, self.samal_ajal)
        if self.viivitus:
            time.sleep(self.viivitus)
        self.samal_ajal -= 1
        v = self.vastus.get(fn, lambda p: {"error": "input"})(p)
        if v == "500":
            return route.fulfill(status=500, body="viga")
        route.fulfill(status=200, content_type="application/json", body=json.dumps(v))

    def arv(self, fn):
        return [p for f, p in self.paringud if f == fn]


def uus(b, andmed=None, konto=True, kell=None, server=None):
    ctx = b.new_context(viewport={"width": 400, "height": 860}, timezone_id="UTC")
    init = "(() => { if (sessionStorage.__ok) return; sessionStorage.__ok = 1;"
    if konto:
        init += f"localStorage.setItem('harjutaja_id_v1', {json.dumps(json.dumps(KONTO))});"
    for k, v in (andmed or {}).items():
        init += f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});"
    init += "})();"
    ctx.add_init_script(init)
    if kell:
        ctx.add_init_script("(() => { const F = new Date(%s).getTime(); const O = Date; class D extends O { constructor(...a) { if (a.length) super(...a); else super(F); } static now() { return F; } } window.Date = D; })();" % json.dumps(kell))
    page = ctx.new_page()
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())
    srv = server or Server()
    page.route(re.compile(r"supabase\.co"), srv)
    js = []
    page.on("pageerror", lambda e: js.append(str(e)))
    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    return ctx, page, srv, js


def kysimus(page):
    return page.evaluate("() => { const q = HMang._aktiivne.cur; return q ? {valjad: q.valjad, vastus: q.vastus, tyyp: q.tyyp, kysimus: q.kysimus, done: q.done} : null; }")


def vasta(page, oigesti=True):
    q = kysimus(page)
    if q["valjad"] > 0:
        vastus = q["vastus"] if isinstance(q["vastus"], list) else [q["vastus"]]
        for i, v in enumerate(page.locator("#pad .kl-vali input").all()):
            v.focus()
            arv = vastus[i] + (0 if oigesti else 7)
            for c in str(arv).replace(".", ","):
                page.keyboard.press(c)
        page.click("#pad .kl-vastan")
    else:
        k = str(q["vastus"])
        nupud = page.locator("#opts button").all()
        for n in nupud:
            if (n.get_attribute("data-k") == k) == oigesti:
                n.click()
                break
    page.wait_for_timeout(80)
    return q


def lopeta_harjutus(page):
    for _ in range(40):
        if page.locator("#s-result").is_visible():
            return
        q = kysimus(page)
        if q and not q["done"]:
            vasta(page, True)
        elif page.locator("#after").is_visible():
            page.click("#nextBtn")
            continue
        page.wait_for_timeout(1150)


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # --- avaleht ---
        ctx, page, srv, js = uus(b)
        kontrolli("12 ülesannet" in page.inner_text("#startBtn"), "Harjuta nupul on ringi pikkus")
        kontrolli("15 ülesannet" in page.inner_text("#competeBtn"), "Võistle nupul on ülesannete arv")
        kontrolli("Igal tasemel on ka eelmiste tasemete ülesandeid." in page.inner_text("#levelNote"), "tasemete märkus on avalehel")
        vahemik = lambda a, c: page.evaluate("""([a, c]) => { const m = HRedel.svg('pikkus', {from: a, to: c}).match(/font-size="12" font-weight="700" fill="[^"]+">([^<]+)</); return m ? m[1] : null; }""", [a, c])
        svg = page.evaluate("() => HRedel.svg('pikkus', {})")
        kontrolli("÷10" in svg and "×10" in svg, "redelil on mõlemad suunad (÷ ja ×)")
        kontrolli(vahemik("mm", "m") == "÷1000", "mm → m vihjes on ÷1000", vahemik("mm", "m"))
        kontrolli(vahemik("m", "mm") == "×1000", "m → mm vihjes on ×1000", vahemik("m", "mm"))
        kontrolli(page.inner_text('#bTabs [data-t="sure"]') == "Selged teisendused", "edetabeli sakk on „Selged teisendused“")

        # --- harjutusring ---
        page.click("#startBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.inner_text("#loendur") == "1 / 12", "päises on „1 / 12“", page.inner_text("#loendur"))
        esimene = vasta(page, True)
        kontrolli(page.inner_text("#loendur") == "1 / 12", "vastatud ülesanne on ikka 1 / 12")
        page.wait_for_timeout(500)
        kontrolli(kysimus(page)["kysimus"] == esimene["kysimus"] and kysimus(page)["done"], "0,5 s pärast on ikka sama ülesanne")
        page.wait_for_timeout(800)
        kontrolli(not kysimus(page)["done"], "~1 s pärast õiget vastust tuleb järgmine")
        kontrolli(page.inner_text("#loendur") == "2 / 12", "päises on „2 / 12“", page.inner_text("#loendur"))

        vasta(page, False)
        kontrolli(page.locator("#after").is_visible(), "vale vastuse järel on „Edasi“ nupp")
        page.wait_for_timeout(1600)
        kontrolli(kysimus(page)["done"], "vale vastuse järel mäng ise edasi ei lähe")
        page.keyboard.press("Escape")
        kontrolli(page.locator("#s-game").is_visible(), "Escape ei lõpeta harjutusringi")
        page.keyboard.press("Enter")
        page.wait_for_timeout(100)
        kontrolli(not kysimus(page)["done"], "Enter viib edasi")

        # veateade kohe pärast õiget vastust
        vastatud = vasta(page, True)
        page.click("#flagBtn")
        kontrolli(page.locator("#flagBox").is_visible(), "veateate aken avaneb")
        page.wait_for_timeout(1400)
        kontrolli(kysimus(page)["kysimus"] == vastatud["kysimus"], "aken peatab edasimineku")
        kontrolli(vastatud["kysimus"] in page.inner_text("#flagSentence"), "aknas on see ülesanne, mille kohta see avati")
        page.keyboard.press("Escape")
        page.wait_for_timeout(100)
        kontrolli(page.locator("#flagBox").is_hidden(), "Escape sulgeb akna")
        kontrolli(not kysimus(page)["done"], "akna sulgemise järel läheb mäng edasi")
        kontrolli(page.locator("#s-game").is_visible(), "Escape aknas ei lõpeta ringi")

        vasta(page, False)
        page.click("#flagBtn")
        page.click('#flagOpts [data-why="vastus"]')
        page.wait_for_timeout(300)
        kontrolli(page.locator("#flagNote").is_visible(), "märke järel on tänusõna")
        teated = srv.arv("report_issue")
        kontrolli(len(teated) == 1 and teated[0]["p_note"] == "Mäng näitab valet vastust" and isinstance(teated[0]["p_detail"], str),
                  "veateade läks serverisse tekstina", teated)
        rep = page.evaluate("() => JSON.parse(localStorage.getItem('teisendaja_v1')).reports")
        kontrolli(len(rep) == 1 and rep[0]["sent"] is True, "server vastas ok -> märge on saadetud")

        # eelmise vaatamine
        page.click("#prevBtn")
        kontrolli(page.locator("#reviewBar").is_visible(), "‹ avab eelmise ülesande")
        page.keyboard.press("Escape")
        kontrolli(page.locator("#reviewBar").is_hidden() and page.locator("#s-game").is_visible(), "Escape viib vaatamisest mängu tagasi")

        lopeta_harjutus(page)
        kontrolli(page.locator("#s-result").is_visible(), "harjutusring lõpeb tulemusega")
        page.wait_for_timeout(300)
        rs = srv.arv("report_session")
        kontrolli(len(rs) == 1 and rs[0]["p_mode"] == "train" and rs[0]["p_module"] == "teisendaja",
                  "harjutusring läks serverisse (mode train)", rs)
        kontrolli(rs and "p_greens" in rs[0] and rs[0]["p_state"] is not None, "harjutusringiga läheb kaasa selgete arv")
        kontrolli("Järgmisel korral harjutame" in page.text_content("#s-result") or page.locator("#resNextBlock").is_hidden(),
                  "vigade silt on „Järgmisel korral harjutame“")
        kontrolli(not js, "harjutus: konsoolis pole JS-vigu", js)
        ctx.close()

        # --- selged: ainult mõlemat pidi selge paar loeb ---
        m = {"n": 2, "ok": 2, "streak": 2, "lastOk": True, "t": 1}
        ctx, page, srv, js = uus(b, {"teisendaja_v1": {"stats": {"km>m": m, "m>km": m, "kg>g": m, "vordle:x": m}, "level": 2, "kat": "koik",
                                                        "outbox": [{"module": "teisendaja", "op": "yhik", "mode": "train", "n": 3, "ok": 3, "score": 3, "avg": 0}]}})
        page.wait_for_timeout(400)
        rs = srv.arv("report_session")
        kontrolli(len(rs) == 1 and rs[0]["p_greens"] == 1, "selge on ainult mõlemat pidi selge paar (km–m), mitte kg>g ega võrdlus",
                  rs and rs[0].get("p_greens"))
        kontrolli(page.evaluate("() => JSON.parse(localStorage.getItem('teisendaja_v1')).outbox.length") == 0,
                  "vana id-ta kirje saadeti praeguse kontoga")
        ctx.close()

        # --- saatmine: üks korraga, võrguviga, teine konto, done_today ---
        srv = Server()
        srv.viivitus = 0.3
        kirje = lambda pid, mode="test": {"module": "teisendaja", "op": "yhik", "mode": mode, "n": 5, "ok": 4, "score": 4, "avg": 3, "pid": pid, "t": 1}
        ctx, page, srv, js = uus(b, {"teisendaja_v1": {"stats": {}, "outbox": [kirje(KONTO["player_id"], "train"), kirje("teine-konto"), kirje(KONTO["player_id"], "train")]}}, server=srv)
        page.evaluate("() => { const b = document.getElementById('bRefresh'); b.click(); b.click(); }")
        page.wait_for_timeout(1500)
        kontrolli(srv.max_samal_ajal == 1, "korraga käib üks saatmine", srv.max_samal_ajal)
        rs = srv.arv("report_session")
        kontrolli(len(rs) == 2, "iga kirje saadeti üks kord", len(rs))
        jaak = page.evaluate("() => JSON.parse(localStorage.getItem('teisendaja_v1')).outbox")
        kontrolli(len(jaak) == 1 and jaak[0]["pid"] == "teine-konto", "teise konto kirje jäi ootama", jaak)
        ctx.close()

        srv = Server()
        srv.vastus["report_session"] = lambda p: "500"
        ctx, page, srv, js = uus(b, {"teisendaja_v1": {"stats": {}, "outbox": [kirje(KONTO["player_id"])]}}, server=srv)
        page.wait_for_timeout(400)
        kontrolli(len(srv.arv("report_session")) == 1, "saatmist prooviti")
        kontrolli(page.evaluate("() => JSON.parse(localStorage.getItem('teisendaja_v1')).outbox.length") == 1,
                  "serveri viga jätab kirje alles")
        ctx.close()

        srv = Server()
        srv.vastus["report_session"] = lambda p: {"error": "done_today"}
        ctx, page, srv, js = uus(b, {"teisendaja_v1": {"stats": {}, "outbox": [kirje(KONTO["player_id"])]}}, server=srv)
        page.wait_for_timeout(400)
        kontrolli(page.evaluate("() => JSON.parse(localStorage.getItem('teisendaja_v1')).outbox.length") == 0,
                  "done_today kustutab kirje")
        kontrolli(page.locator("#competeBtn").is_disabled() and "Võistlus tehtud" in page.inner_text("#competeBtn"),
                  "done_today paneb võistluse kinni")
        ctx.close()

        srv = Server()
        srv.vastus["report_issue"] = lambda p: {"error": "liiga_palju"}
        ctx, page, srv, js = uus(b, {"teisendaja_v1": {"stats": {}, "reports": [{"item": "x", "detail": "d", "why": "muu", "sent": False}]}}, server=srv)
        page.wait_for_timeout(400)
        kontrolli(len(srv.arv("report_issue")) == 1 and
                  page.evaluate("() => JSON.parse(localStorage.getItem('teisendaja_v1')).reports[0].sent") is False,
                  "serveri keeldumise järel jääb märge saatmata")
        ctx.close()

        # --- Tallinna päev ---
        # 15. sept 22.30 UTC = 16. sept 01.30 Tallinnas. Seade on UTC-s.
        ctx, page, srv, js = uus(b, {"teisendaja_v1": {"stats": {}, "lastCompete": "2026-09-16"}}, konto=False, kell="2026-09-15T22:30:00Z")
        kontrolli(page.locator("#competeBtn").is_disabled(), "Tallinnas on juba 16. kuupäev -> tänane võistlus tehtud")
        kontrolli(page.evaluate("() => HVoistlus.tana()") == "2026-09-16", "HVoistlus.tana() annab Tallinna kuupäeva")
        ctx.close()
        ctx, page, srv, js = uus(b, {"teisendaja_v1": {"stats": {}, "lastCompete": "2026-09-15"}}, konto=False, kell="2026-09-15T22:30:00Z")
        kontrolli(not page.locator("#competeBtn").is_disabled(), "eilne (Tallinna järgi) võistlus ei keela tänast")
        ctx.close()

        # --- võistlus ---
        ctx, page, srv, js = uus(b)
        page.click("#competeBtn")
        kontrolli("Alustame?" in page.inner_text("#competeBtn"),
                  "esimene vajutus paneb nupu ootele")
        page.click("#competeBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.inner_text("#loendur") == "1 / 15", "võistluses on „1 / 15“", page.inner_text("#loendur"))
        kontrolli(page.locator("#timer").is_visible(), "võistluses on taimer")
        kontrolli(page.locator("#flagBtn").is_hidden() and page.locator("#prevBtn").is_hidden(),
                  "võistluses ei ole veateate ega eelmise nuppu")
        page.keyboard.press("Escape")
        kontrolli(page.locator("#s-game").is_visible(), "Escape ei lõpeta võistlust")
        page.evaluate("() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); }")
        page.wait_for_timeout(200)
        page.evaluate("() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); }")
        page.wait_for_timeout(100)
        kontrolli("Aeg sai otsa" in page.inner_text("#fb"), "peidetud vahelehe ülesanne loeb vahelejäetuks", page.inner_text("#fb"))
        page.wait_for_timeout(1600)
        kontrolli(page.inner_text("#loendur") == "2 / 15", "pärast seda läheb võistlus edasi")
        page.click("#quitBtn")
        kontrolli(page.locator("#quitNote").is_visible(), "✕ küsib võistluses kinnitust")
        page.click("#quitBtn")
        page.wait_for_selector("#s-result:not([hidden])")
        page.wait_for_timeout(300)
        rs = srv.arv("report_session")
        kontrolli(len(rs) == 1 and rs[0]["p_mode"] == "test" and rs[0]["p_n"] == 1, "katkestatud võistlus läks kirja", rs)
        page.click("#homeBtn")
        kontrolli(page.locator("#competeBtn").is_disabled(), "pärast võistlust on nupp kinni")
        kontrolli(not js, "võistlus: konsoolis pole JS-vigu", js)
        ctx.close()

        b.close()
    print()
    print("KOIK LABI" if not vead else f"KATKI: {len(vead)} viga")
    sys.exit(1 if vead else 0)


main()
