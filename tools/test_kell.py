"""Kella mooduli test. Jookseb pilvekonteineris:

    python3 -m http.server 8897
    python3 tools/test_kell.py

Eestikeelseid vorme siin ei kontrollita — seda teeb ammendavalt
`node kell/aeg.test.js`, mis käib läbi kõik 1440 kellaaega.
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8897"
CLS = {"player_id": "11111111-1111-4111-8111-111111111111", "secret": "AAAA1111",
       "class_id": "aaaaaaaa-1111-4111-8111-111111111111",
       "class_name": "Õismäe Gümnaasium 3B", "code": "ABC123", "nick": "Mia"}

fails = []


def check(name, ok, detail=""):
    print(("  OK   " if ok else "  VIGA ") + name + (("  -> " + str(detail)) if detail and not ok else ""))
    if not ok:
        fails.append(name)


def ls(page, key):
    v = page.evaluate("k => localStorage.getItem(k)", key)
    return json.loads(v) if v else None


def run(pw):
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 844})
    for pat in ["**://fonts.googleapis.com/**", "**://fonts.gstatic.com/**", "**://*.supabase.co/**"]:
        ctx.route(pat, lambda r: r.abort())
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))

    page.goto(BASE + "/kell/", wait_until="domcontentloaded")
    page.evaluate("""c => { localStorage.clear();
        localStorage.setItem('harjutaja_id_v1', JSON.stringify(c));
        localStorage.setItem('kell_v1', JSON.stringify({level:3, sfx:false, stats:{}})); }""", CLS)
    page.goto(BASE + "/kell/", wait_until="domcontentloaded")
    page.wait_for_timeout(600)

    print("\n1. Avaleht")
    check("neli raskusastet", page.locator("#levels .chip").count() == 4, page.locator("#levels .chip").count())
    check("valitud aste on meeles", page.locator('#levels .chip[aria-pressed="true"]').inner_text() == "Ja veerandid",
          page.locator('#levels .chip[aria-pressed="true"]').inner_text())
    check("kaart näitab nelja kellaaega", page.locator("#map .mcell").count() == 4, page.locator("#map .mcell").count())
    kaart = page.locator("#map").inner_text()
    check("kaardil on kolm ja kolmveerand neli", "kolm" in kaart and "kolmveerand neli" in kaart, kaart)
    check("praeguse kella rida on olemas", "Praegu on kell" in page.locator("#nowText").inner_text(),
          page.locator("#nowText").inner_text())
    check("klassirida näitab klassi", CLS["class_name"] in page.locator("#klassNote").inner_text())

    print("\n2. Harjutusring")
    page.locator("#startBtn").click()
    page.wait_for_timeout(700)
    check("mäng algas", page.locator("#s-game").is_visible())
    check("taimerit harjutamises ei ole", page.locator("#timer").is_hidden())
    check("küsimus on „Mis kell on?“", page.locator("#askText").inner_text() == "Mis kell on?",
          page.locator("#askText").inner_text())
    check("neli varianti", page.locator("#opts .opt").count() == 4, page.locator("#opts .opt").count())
    variandid = [o.inner_text() for o in page.locator("#opts .opt").all()]
    check("variandid on erinevad", len(set(variandid)) == 4, variandid)

    # mängime ringi läbi, alati esimene variant
    tagurpidi = False
    vihje = False
    t0 = time.time()
    vastuseid = 0
    while time.time() - t0 < 90 and not page.locator("#s-result").is_visible():
        if not page.locator("#after").is_hidden():
            vihje = vihje or not page.locator("#hint").is_hidden()
            page.locator("#nextBtn").click()
            page.wait_for_timeout(280)
            continue
        o = page.locator("#opts .opt")
        if o.count() and o.nth(0).is_enabled():
            if "Milline kell" in page.locator("#askText").inner_text():
                tagurpidi = True
                check("tagurpidi ülesandes on neli sihverplaati", page.locator("#opts .opt svg").count() == 4,
                      page.locator("#opts .opt svg").count()) if not tagurpidi else None
            o.nth(0).click()
            vastuseid += 1
        page.wait_for_timeout(280)

    check("ring jõudis tulemuseni", page.locator("#s-result").is_visible())
    # Ring on 12 küsimust pluss valede kordused (HEngine toob vea ringi lõpus tagasi).
    check("ringis oli 12–24 küsimust", 12 <= vastuseid <= 24, vastuseid)
    check("tagurpidi ülesanne tuli ette", tagurpidi)
    check("vale vastuse järel näidati vihjet", vihje)
    d = ls(page, "kell_v1")
    check("ring läks kirja", len(d.get("rounds", [])) == 1, d.get("rounds"))
    check("statistika salvestus minutimustri järgi", set(d.get("stats", {})).issubset({"0", "15", "30", "45"}),
          list(d.get("stats", {})))

    print("\n3. Võistlus")
    page.locator("#homeBtn").click()
    page.wait_for_timeout(500)
    page.locator("#competeBtn").click()
    page.wait_for_timeout(200)
    check("esimene vajutus küsib kinnitust", "Alustame" in page.locator("#competeBtn").inner_text())
    page.locator("#competeBtn").click()
    page.wait_for_timeout(700)
    check("võistlus algas", page.locator("#s-game").is_visible())
    check("taimer on nähtav", page.locator("#timer").is_visible())
    w1 = page.evaluate("parseFloat(document.getElementById('timerFill').style.width) || 0")
    page.wait_for_timeout(1500)
    w2 = page.evaluate("parseFloat(document.getElementById('timerFill').style.width) || 0")
    check("taimer jookseb alla", w2 < w1 - 5, "%s -> %s" % (w1, w2))

    vastuseid = 0
    t0 = time.time()
    while time.time() - t0 < 120 and not page.locator("#s-result").is_visible():
        o = page.locator("#opts .opt")
        if o.count() and o.nth(0).is_enabled():
            o.nth(0).click()
            vastuseid += 1
            page.wait_for_timeout(300)
        else:
            page.wait_for_timeout(200)
    page.wait_for_timeout(2000)
    check("võistlus jõudis tulemuseni", page.locator("#s-result").is_visible())
    check("võistluses oli 20 küsimust", vastuseid == 20, vastuseid)
    check("võistluses vihjet ei näidatud", page.locator("#hint").is_hidden())
    d = ls(page, "kell_v1")
    check("võistlus läks kirja", len(d.get("tests", [])) == 1, d.get("tests"))
    ob = (d.get("outbox") or [{}])[0]
    check("outbox: moodul kell", ob.get("module") == "kell", ob)
    check("outbox: 20 küsimust", ob.get("n") == 20, ob)

    page.locator("#homeBtn").click()
    page.wait_for_timeout(500)
    check("Võistle nupp on kinni", page.locator("#competeBtn").is_disabled())

    print("\n4. Edetabel ja liitumine")
    page.locator("#boardBtn").click()
    page.wait_for_timeout(700)
    check("edetabeli ekraan avanes", page.locator("#s-board").is_visible())
    check("viis vahekaarti", page.locator("#bTabs .chip").count() == 5)
    page.locator("#bBack").click()
    page.wait_for_timeout(400)
    page.evaluate("localStorage.removeItem('harjutaja_id_v1')")
    page.goto(BASE + "/kell/", wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    page.locator("#joinBtn").click()
    page.wait_for_timeout(400)
    check("liitumisaken avanes", page.locator(".hk-card").is_visible())

    print("\n5. Ajaarvutus: tase otsustab, kas sõnadega või numbritega")
    # Tase 4 tekstirežiimis = numbritega (8.28), muud tasemed = sõnadega.
    def tekstiring(tase):
        page.goto(BASE + "/kell/", wait_until="domcontentloaded")
        page.evaluate("t => { var d = JSON.parse(localStorage.getItem('kell_v1') || '{}');"
                      "d.level = t; d.opp = 'tekst'; d.sfx = false;"
                      "localStorage.setItem('kell_v1', JSON.stringify(d)); }", tase)
        page.goto(BASE + "/kell/", wait_until="domcontentloaded")
        page.wait_for_timeout(500)
        silt = page.locator("#levels .chip").nth(3).inner_text()
        selgitus = page.locator("#tekstStat").inner_text()
        page.locator("#startBtn").click()
        page.wait_for_timeout(700)
        lood, kysimused, valikud = [], [], []
        for _ in range(6):
            if page.locator("#s-result").is_visible():
                break
            if not page.locator("#after").is_hidden():
                page.locator("#nextBtn").click(); page.wait_for_timeout(300); continue
            o = page.locator("#opts .opt")
            if not o.count() or not o.nth(0).is_enabled():
                page.wait_for_timeout(250); continue
            lood.append(page.locator("#lugu").inner_text())
            kysimused.append(page.locator("#askText").inner_text())
            valikud.append([x.inner_text() for x in o.all()])
            o.nth(0).click(); page.wait_for_timeout(420)
        page.locator("#quitBtn").click(); page.wait_for_timeout(400)
        return silt, selgitus, lood, kysimused, valikud

    silt4, selg4, lood4, kys4, val4 = tekstiring(4)
    check("tase 4 nupp ütleb „Kõik, minuti kaupa\u201c", silt4 == "Kõik, minuti kaupa", silt4)
    check("tase 4 selgitus räägib bussiplaanist", "bussiplaanis" in selg4, selg4[-70:])
    # Kahesammulise loo TEISES sammus ei olegi numbritega kellaaega
    # („Bussi väljumiseni on 37 minutit…") — see on teadlik valik, sest
    # kokkuvõte ei tohi kasutada „pärast"-vormi. Seega: vähemalt üks lugu
    # peab kandma numbritega aega, ja igas loos, kus see on, käib ette „kell".
    numbriga = [l for l in lood4 if re.search(r"\d{1,2}\.\d\d", l)]
    check("tase 4 annab numbritega kellaaegu", len(numbriga) > 0, lood4[:2])
    check("tase 4 kellaaja ees on sõna „kell\u201c",
          all(re.search(r"[Kk]ell(?: on)? \d{1,2}\.\d\d", l) for l in numbriga), numbriga[:2])
    check("tase 4 vastused on minutites või numbritega kellaaeg",
          all(all(re.match(r"^\d+ minutit?$|^\d{1,2}\.\d\d$", v) for v in vs) for vs in val4),
          val4[:2])
    check("tase 4 ei küsi „Kui kaua\u201c", not any(k.startswith("Kui kaua") for k in kys4), kys4)

    silt2, selg2, lood2, kys2, val2 = tekstiring(2)
    # Nupu silt käib REŽIIMI, mitte valitud taseme järgi: tekstirežiimis ütleb
    # neljas nupp alati seda, mida ta annaks, kui ta valida.
    check("tekstirežiimis jääb neljas nupp „Kõik, minuti kaupa“", silt2 == "Kõik, minuti kaupa", silt2)
    check("tase 2 lugudes ei ole numbritega kellaaega",
          not any(re.search(r"\d{1,2}\.\d\d", l) for l in lood2), lood2[:2])
    check("tase 2 ütleb, kust minutitäpsuse leiab", "Kõik, minuti kaupa" in selg2, selg2[-70:])

    # Kella lugemises tähendab sama nupp viie minuti täpsust.
    page.goto(BASE + "/kell/", wait_until="domcontentloaded")
    page.evaluate("() => { var d = JSON.parse(localStorage.getItem('kell_v1') || '{}');"
                  "d.opp = 'lugemine'; localStorage.setItem('kell_v1', JSON.stringify(d)); }")
    page.goto(BASE + "/kell/", wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    siltL = page.locator("#levels .chip").nth(3).inner_text()
    check("lugemises on neljas nupp „Kõik, 5 min kaupa“", siltL == "Kõik, 5 min kaupa", siltL)

    # Keelereegel 2: „N minuti pärast" ei tohi tekstülesandes esineda.
    kokku = " ".join(lood4 + kys4 + lood2 + kys2)
    check("kusagil ei ole keelatud „minuti pärast\u201c", "minuti pärast" not in kokku)

    print("\n6. Harjutaja avaleht")
    page.goto(BASE + "/", wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    check("Kella kaart on avalehel", page.locator('a.mod[href="kell/"]').count() == 1)
    check("kaardil on kägu", page.locator("#faceKell svg").count() == 1)
    check("Kell ei ole enam „Tulekul“ nimekirjas", "Kell" not in page.locator(".soon").inner_text(),
          page.locator(".soon").inner_text())

    real = [e for e in errs if "fonts" not in e and "Failed to fetch" not in e and "supabase" not in e]
    check("konsoolis pole JS-vigu", not real, "; ".join(real[:3]))
    br.close()


with sync_playwright() as pw:
    run(pw)

print("\n" + ("KÕIK LÄBI" if not fails else "LÄBI KUKKUS (%d): " % len(fails) + ", ".join(fails)))
sys.exit(1 if fails else 0)
