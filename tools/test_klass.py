"""Etapp 1 test: klassi identiteet on kõigi moodulite ühine.

Kontrollib viit olukorda päris brauseris (Chromium, mobiilivaade). Kõik käib
localStorage'iga — Supabase'i pole vaja ja välisvõrk on kinni keeratud.

Jookseb Cowork'i pilvekonteineris, mitte Windowsis (seal on Playwright ja
Chromium olemas). Enne käivitamist serveeri repo juurest:

    python3 -m http.server 8899
    python3 tools/test_klass.py

Miks see test olemas on: `secret` on ainus võti klassikontole. Kui identiteedi
kolimine selle kaotab, on Mia edetabelikoht lõplikult läinud. Seda kontrollib
punkt 1 („vana koht jäi alles").
"""
import json, sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8899"
CLS_A = {"player_id": "11111111-1111-4111-8111-111111111111", "secret": "AAAA1111",
         "class_id": "aaaaaaaa-1111-4111-8111-111111111111",
         "class_name": "Õismäe Gümnaasium 3B", "code": "ABC123", "nick": "Mia"}
CLS_B = {"player_id": "22222222-2222-4222-8222-222222222222", "secret": "BBBB2222",
         "class_id": "bbbbbbbb-2222-4222-8222-222222222222",
         "class_name": "Teine Kool 4A", "code": "XYZ789", "nick": "Mia2"}

fails = []


def check(name, ok, detail=""):
    print(("  OK   " if ok else "  VIGA ") + name + (("  -> " + detail) if detail and not ok else ""))
    if not ok:
        fails.append(name)


def seed(page, korrutaja_cls=None, shared=None):
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.evaluate("""([k, s]) => {
        localStorage.clear();
        if (k) localStorage.setItem('korrutaja_v1', JSON.stringify({v:1, settings:{name:'Mia'}, cls:k, outbox:[], total:{n:12, ok:10}}));
        if (s) localStorage.setItem('harjutaja_id_v1', JSON.stringify(s));
    }""", [korrutaja_cls, shared])


def ls(page, key):
    v = page.evaluate("k => localStorage.getItem(k)", key)
    return json.loads(v) if v else None


def run(pw):
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 844})
    ctx.route("**://fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("**://fonts.gstatic.com/**", lambda r: r.abort())
    ctx.route("**://*.supabase.co/**", lambda r: r.abort())
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))

    print("\n1. Vana Korrutaja seis -> Korrutaja avamine tõstab identiteedi ühisesse võtmesse")
    seed(page, korrutaja_cls=CLS_A)
    page.goto(BASE + "/korrutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    shared = ls(page, "harjutaja_id_v1")
    legacy = ls(page, "korrutaja_v1")
    check("ühine võti tekkis", bool(shared), str(shared))
    check("player_id klapib", shared and shared["player_id"] == CLS_A["player_id"])
    check("secret klapib", shared and shared["secret"] == CLS_A["secret"])
    check("klassi nimi klapib", shared and shared["class_name"] == CLS_A["class_name"])
    check("vana koht jäi alles", legacy and legacy.get("cls", {}).get("secret") == CLS_A["secret"])
    check("vana edenemine puutumata", legacy and legacy.get("total", {}).get("n") == 12)

    print("\n2. Kirjutaja näeb sama klassi")
    page.goto(BASE + "/kirjutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    note = page.locator("#klassNote")
    check("klassirida on nähtav", note.is_visible())
    txt = note.inner_text() if note.count() else ""
    check("nimetab klassi", CLS_A["class_name"] in txt, txt)
    check("nimetab hüüdnime", "Mia" in txt, txt)

    print("\n3. Kirjutaja avatakse enne Korrutajat (ainult vana võti olemas)")
    seed(page, korrutaja_cls=CLS_A)
    page.goto(BASE + "/kirjutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    check("Kirjutaja tõstis ise identiteedi üles", bool(ls(page, "harjutaja_id_v1")))
    check("klassirida nähtav", page.locator("#klassNote").is_visible())

    print("\n4. Ühine võti võidab, kui need lähevad lahku")
    seed(page, korrutaja_cls=CLS_A, shared=CLS_B)
    page.goto(BASE + "/korrutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    legacy = ls(page, "korrutaja_v1")
    check("Korrutaja võttis ühise võtme klassi", legacy and legacy["cls"]["player_id"] == CLS_B["player_id"],
          str(legacy and legacy.get("cls")))
    check("ühine võti ei muutunud", ls(page, "harjutaja_id_v1")["player_id"] == CLS_B["player_id"])

    print("\n5. Klassita mängija: midagi ei lagune")
    seed(page)
    page.goto(BASE + "/korrutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    check("ühist võtit ei tekitatud tühjalt kohalt", ls(page, "harjutaja_id_v1") is None)
    check("Korrutaja avaekraan on olemas", page.locator("#s-home").count() > 0)
    page.goto(BASE + "/kirjutaja/", wait_until="domcontentloaded")
    page.wait_for_timeout(700)
    check("Kirjutaja ütleb, et klassi pole", "pole veel klassiga liitunud" in page.locator("#klassNote").inner_text(),
          page.locator("#klassNote").inner_text())
    check("Kirjutaja Harjuta nupp töötab", page.locator("#startBtn").is_enabled())

    real = [e for e in errs if "fonts.googleapis" not in e and "Failed to fetch" not in e]
    check("konsoolis pole JS-vigu", not real, "; ".join(real[:3]))
    br.close()


with sync_playwright() as pw:
    run(pw)

print("\n" + ("KÕIK LÄBI" if not fails else "LÄBI KUKKUS: " + ", ".join(fails)))
sys.exit(1 if fails else 0)
