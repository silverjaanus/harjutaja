"""Raamistiku etapp 3: Kell ja Kirjutaja ühisel mängu raamil (core/mang.js).

Valvab:
  - mõlemas moodulis on päises „N / M" ja nuppudel ringi pikkus;
  - Escape ei lõpeta kunagi ringi; veateate aken peatab edasimineku ja
    Escape sulgeb selle, mäng läheb edasi;
  - Kell: ‹ näitab eelmist ülesannet samade valikutega, mida laps nägi;
    vale vastuse lause on „Kell on …"; tasemete märkus on avalehel;
  - Kirjutaja: võistluse aeg hakkab jooksma alles pärast sõna; tühik
    kordab sõna võistluses ainult ühe korra; vanad märked loetakse üle;
  - harjutusring läheb serverisse (mode "train") mõlemas moodulis;
  - päevapiir on Tallinna aja järgi.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8811 &
    python3 tools/test_raam3.py 8811
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8811"
BASE = f"http://localhost:{PORT}"
vead = []
KONTO = {"player_id": "11111111-1111-4111-8111-111111111111", "secret": "S1", "class_id": "c1",
         "class_name": "Test 3B", "code": "ABC123", "nick": "Mia"}

# Heli: play() lõpetab kohe (ended), et test ei sõltuks helikaardist.
HELI = """
(() => {
  window.__play = [];
  HTMLMediaElement.prototype.play = function () {
    window.__play.push(this.src);
    const a = this;
    setTimeout(() => { if (a.onended) a.onended(); }, window.__heliKestus || 50);
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function () {};
})();
"""


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


def uus(b, moodul, andmed=None, kell=None):
    ctx = b.new_context(viewport={"width": 400, "height": 860}, timezone_id="UTC")
    init = "(() => { if (sessionStorage.__ok) return; sessionStorage.__ok = 1;"
    init += f"localStorage.setItem('harjutaja_id_v1', {json.dumps(json.dumps(KONTO))});"
    for k, v in (andmed or {}).items():
        init += f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});"
    init += "})();"
    ctx.add_init_script(init)
    ctx.add_init_script(HELI)
    if kell:
        ctx.add_init_script("(() => { const F = new Date(%s).getTime(); const O = Date; class D extends O { constructor(...a) { if (a.length) super(...a); else super(F); } static now() { return F; } } window.Date = D; })();" % json.dumps(kell))
    page = ctx.new_page()
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())
    paringud = []

    def srv(route):
        m = re.search(r"/rpc/(\w+)", route.request.url)
        p = json.loads(route.request.post_data or "{}")
        paringud.append((m.group(1) if m else "", p))
        v = {"ok": True, "competed_today": p.get("p_mode") == "test"} if m and m.group(1) in ("report_session", "report_issue") else {"error": "net"}
        route.fulfill(status=200, content_type="application/json", body=json.dumps(v))
    page.route(re.compile(r"supabase\.co"), srv)
    js = []
    page.on("pageerror", lambda e: js.append(str(e)))
    page.goto(f"{BASE}/{moodul}/", wait_until="domcontentloaded")
    page.wait_for_selector("#startBtn")
    page.wait_for_timeout(200)
    return ctx, page, paringud, js


def cur(page):
    return page.evaluate("""() => { const q = HMang._aktiivne.cur; if (!q) return null;
      return {done: q.done, oige: q.oigeK || q.answer, kys: document.getElementById('askText') ? document.getElementById('askText').textContent : '',
              word: q.word || null, tekst: !!q.tekst}; }""")


def vali(page, oigesti):
    q = cur(page)
    for b in page.locator("#opts button").all():
        k = b.get_attribute("data-k") or b.get_attribute("data-o")
        if (k == q["oige"]) == oigesti:
            b.click()
            return q
    return q


def lopeta(page):
    for _ in range(60):
        if page.locator("#s-result").is_visible():
            return
        q = cur(page)
        if q and not q["done"]:
            vali(page, True)
        elif page.locator("#after").is_visible():
            page.click("#nextBtn")
            continue
        page.wait_for_timeout(1150)


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # ---------------- Kell ----------------
        ctx, page, srv, js = uus(b, "kell")
        kontrolli("12 kellaaega" in page.inner_text("#startBtn"), "Kell: Harjuta nupul on ringi pikkus")
        kontrolli("20 kellaaega" in page.inner_text("#competeBtn"), "Kell: Võistle nupul on ülesannete arv")
        kontrolli("Igal tasemel on ka eelmiste tasemete ülesandeid." in page.inner_text("#levelNote"), "Kell: tasemete märkus")
        page.click("#startBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.inner_text("#loendur") == "1 / 12", "Kell: päises „1 / 12“", page.inner_text("#loendur"))
        esimesed = page.evaluate("() => [...document.querySelectorAll('#opts button')].map(b => b.dataset.k)")
        vali(page, False)
        kontrolli(page.inner_text("#fb").startswith("Kell on "), "Kell: vale vastuse lause on „Kell on …“", page.inner_text("#fb"))
        kontrolli(page.locator("#hint").is_visible() and page.locator("#after").is_visible(), "Kell: vihje ja „Edasi“")
        page.keyboard.press("Escape")
        kontrolli(page.locator("#s-game").is_visible(), "Kell: Escape ei lõpeta ringi")
        page.keyboard.press("Enter")
        page.wait_for_timeout(100)
        page.click("#prevBtn")
        vaadatud = page.evaluate("() => [...document.querySelectorAll('#opts button')].map(b => b.dataset.k)")
        kontrolli(vaadatud == esimesed, "Kell: ‹ näitab samu valikuid, mida laps nägi", (esimesed, vaadatud))
        kontrolli(page.locator("#opts .wrong").count() == 1, "Kell: eelmisel on lapse vale vastus märgitud")
        page.click("#reviewBack")
        vastatud = vali(page, True)
        page.click("#flagBtn")
        page.wait_for_timeout(1300)
        kontrolli(cur(page)["done"], "Kell: veateate aken peatab edasimineku")
        page.keyboard.press("Escape")
        page.wait_for_timeout(100)
        kontrolli(page.locator("#flagBox").is_hidden() and not cur(page)["done"], "Kell: Escape sulgeb akna ja mäng läheb edasi")
        lopeta(page)
        page.wait_for_timeout(400)
        rs = [p for f, p in srv if f == "report_session"]
        kontrolli(any(p["p_mode"] == "train" and p["p_module"] == "kell" for p in rs), "Kell: harjutusring läks serverisse", rs)
        kontrolli(not js, "Kell: konsoolis pole JS-vigu", js)
        ctx.close()

        # Kell tekstülesanded raamil
        ctx, page, srv, js = uus(b, "kell", {"kell_v1": {"stats": {}, "level": 3, "opp": "tekst"}})
        kontrolli("10 lugu" in page.inner_text("#startBtn") and "Arvuta" in page.inner_text("#startBtn"), "Kell: tekstirežiimis „Arvuta · 10 lugu“")
        page.click("#startBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.locator("#lugu").is_visible(), "Kell: tekstülesande lugu on ekraanil")
        vali(page, False)
        kontrolli(page.inner_text("#fb").startswith("Õige vastus on "), "Kell: tekstülesandes „Õige vastus on …“", page.inner_text("#fb"))
        kontrolli(not js, "Kell tekst: konsoolis pole JS-vigu", js)
        ctx.close()

        # Kell: Tallinna päev
        ctx, page, srv, js = uus(b, "kell", {"kell_v1": {"stats": {}, "lastCompete": "2026-09-16"}}, kell="2026-09-15T22:30:00Z")
        kontrolli(page.locator("#competeBtn").is_disabled(), "Kell: päevapiir Tallinna aja järgi")
        ctx.close()

        # ---------------- Kirjutaja ----------------
        vana = {"stats": {}, "reports": [{"id": "w1", "word": "kapp", "sentence": "Kapp on suur.", "why": "lause", "sent": False}]}
        ctx, page, srv, js = uus(b, "kirjutaja", {"kirjutaja_v1": vana})
        page.wait_for_timeout(300)
        it = [p for f, p in srv if f == "report_issue"]
        kontrolli(len(it) == 1 and it[0]["p_item"] == "w1" and it[0]["p_detail"] == "kapp / Kapp on suur." and it[0]["p_note"] == "Lause on imelik",
                  "Kirjutaja: vana märge loeti üle ja saadeti", it)
        kontrolli("kapp" in page.inner_text("#reportList"), "Kirjutaja: märgitud sõnade nimekiri näitab vana märget")
        kontrolli("15 sõna" in page.inner_text("#startBtn"), "Kirjutaja: Harjuta nupul on ringi pikkus")
        kontrolli("20 sõna" in page.inner_text("#competeBtn"), "Kirjutaja: Võistle nupul on sõnade arv")
        page.click("#startBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        kontrolli(page.inner_text("#loendur") == "1 / 15", "Kirjutaja: päises „1 / 15“", page.inner_text("#loendur"))
        kontrolli(page.locator("#cmpRow").is_visible(), "Kirjutaja: kuulamisabi nupp on harjutuses")
        vali(page, False)
        kontrolli(page.inner_text("#fb").startswith("Õige on „"), "Kirjutaja: vale vastuse lause", page.inner_text("#fb"))
        page.wait_for_timeout(700)
        kontrolli(page.locator("#opts .opt small").count() == 3, "Kirjutaja: vale järel loetakse variandid ette")
        page.keyboard.press("Escape")
        kontrolli(page.locator("#s-game").is_visible(), "Kirjutaja: Escape ei lõpeta ringi")
        page.click("#prevBtn") if not page.locator("#prevBtn").is_disabled() else None
        page.keyboard.press("Enter")
        page.wait_for_timeout(200)
        if page.locator("#reviewBar").is_visible():
            page.keyboard.press("Escape")
        page.click("#flagBtn")
        kontrolli(page.locator("#flagWord").is_visible() and page.inner_text("#flagWord") == cur(page)["word"],
                  "Kirjutaja: aknas on sõna")
        page.keyboard.press("Escape")
        lopeta(page)
        page.wait_for_timeout(400)
        rs = [p for f, p in srv if f == "report_session"]
        kontrolli(any(p["p_mode"] == "train" and p["p_module"] == "kirjutaja" for p in rs), "Kirjutaja: harjutusring läks serverisse", rs)
        kontrolli(not js, "Kirjutaja: konsoolis pole JS-vigu", js)
        ctx.close()

        # Kirjutaja võistlus: aeg pärast sõna, tühik ainult üks kord
        ctx, page, srv, js = uus(b, "kirjutaja")
        page.evaluate("() => { window.__heliKestus = 1500; }")
        page.click("#competeBtn")
        page.click("#competeBtn")
        page.wait_for_selector("#s-game:not([hidden])")
        page.wait_for_timeout(300)
        kontrolli(page.locator("#timer").is_hidden(), "Kirjutaja: sõna kõlab, aeg ei jookse veel")
        page.wait_for_timeout(1500)
        kontrolli(page.locator("#timer").is_visible(), "Kirjutaja: pärast sõna hakkab aeg jooksma")
        kontrolli(page.locator("#cmpRow").is_hidden() and page.locator("#flagBtn").is_hidden(), "Kirjutaja: võistluses ei ole abi ega veateadet")
        enne = len(page.evaluate("() => window.__play"))
        page.keyboard.press(" ")
        page.keyboard.press(" ")
        page.keyboard.press(" ")
        page.wait_for_timeout(100)
        kordusi = len(page.evaluate("() => window.__play")) - enne
        kontrolli(kordusi == 1, "Kirjutaja: tühik kordab võistluses ainult ühe korra", kordusi)
        page.keyboard.press("Escape")
        kontrolli(page.locator("#s-game").is_visible(), "Kirjutaja: Escape ei lõpeta võistlust")
        kontrolli(not js, "Kirjutaja võistlus: konsoolis pole JS-vigu", js)
        ctx.close()

        b.close()
    print()
    print("KOIK LABI" if not vead else f"KATKI: {len(vead)} viga")
    sys.exit(1 if vead else 0)


main()
