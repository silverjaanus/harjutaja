"""Kuulamisabi test: Kirjutaja "Kuula kolme pikkust" nupp harjutamises.

Kontrollib päris brauseris (Chromium, mobiilivaade), et kuulamisabi:
  1. on nähtav igal uuel küsimusel ja kaob vastates,
  2. ei ütle vastust ette (ei märgista, ei näita variantide sõnu, ei lukusta nuppe),
  3. ei sega tavalist "Kuula kõiki" käiku vale vastuse järel,
  4. puudub täielikult võistlusest.

Heli ei mängi konteineris (Audio.play() lööb NotSupportedError't, sest
brauseril pole helikaarti) — see on oodatud ja neid teateid ei loeta vigadeks.
Test kontrollib DOM-i seisu, mitte kuuldavat heli. Kaust kirjutaja/audio2/ on
repos teadlikult puudu: app.js play() peab siis kukkuma tagasi kausta audio/
(a.onerror kutsub play() uuesti ilma o.cmp-ta) — kui see ei toimiks, jääks
kuulamisabi vaikselt katki, mistõttu #cmpBtn "playing" klass ei kaoks kunagi;
seda kontrollitakse punktis 2/3.

Jookseb Cowork'i pilvekonteineris. Enne käivitamist serveeri repo juurest:

    python3 -m http.server 8896
    python3 tools/test_kuulamisabi.py
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8896"
fails = []
total = 0


def check(name, ok, detail=""):
    global total
    total += 1
    print(("  OK   " if ok else "  VIGA ") + name + (("  -> " + str(detail)) if detail and not ok else ""))
    if not ok:
        fails.append(name)


def is_audio_noise(msg, url=""):
    m = msg.lower()
    u = (url or "").lower()
    if "fonts.googleapis" in u or "fonts.gstatic" in u:
        return True
    # audio2/ puudub repos teadlikult (fallback audio/ peale) ja helikaardita
    # konteineris ebaõnnestub .mp3 laadimine/mängimine igal juhul — mõlemad on oodatud.
    if "/audio2/" in u or u.endswith(".mp3"):
        return True
    return ("notsupportederror" in m or "play() failed" in m or "play() request" in m
            or "no supported source" in m or "aborted by a new load request" in m)


def fresh_page(br, errs):
    ctx = br.new_context(viewport={"width": 390, "height": 844})
    ctx.route("**://fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("**://fonts.gstatic.com/**", lambda r: r.abort())
    ctx.route("**://*.supabase.co/**", lambda r: r.abort())
    page = ctx.new_page()

    def on_console(m):
        if m.type != "error":
            return
        loc = m.location or {}
        if is_audio_noise(m.text, loc.get("url", "")):
            return
        errs.append(m.text + (" @ " + loc.get("url", "") if loc.get("url") else ""))

    page.on("console", on_console)
    page.on("pageerror", lambda e: errs.append(str(e)) if not is_audio_noise(str(e)) else None)
    page.goto(BASE + "/kirjutaja/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.clear()")
    page.reload(wait_until="domcontentloaded")
    return page


def run(pw):
    br = pw.chromium.launch()
    errs = []
    page = fresh_page(br, errs)

    print("\n1. Harjuta algab, uue küsimuse juures on kuulamisabi rida nähtav ja märkus peidus")
    page.locator("#startBtn").click()
    opts = page.locator("#opts .opt")
    check("küsimuse 3 varianti tekkisid", opts.count() == 3, opts.count())
    check("#cmpRow nähtav uue küsimuse juures", page.locator("#cmpRow").is_visible())
    check("#cmpNote peidus enne vajutust", page.locator("#cmpNote").is_hidden())

    print("\n2. #cmpBtn vajutus näitab märkust ja süütab tähed järjest")
    page.locator("#cmpBtn").click()
    page.wait_for_timeout(150)
    check("#cmpNote nähtav esimese vajutuse järel", page.locator("#cmpNote").is_visible())
    check("mõni variant on 'lit' kuulamisabi ajal", page.locator("#opts .opt.lit").count() >= 1,
          page.locator("#opts .opt.lit").count())

    print("\n3. Kuulamisabi ei anna vastust ette (kõige tähtsam kontroll)")
    check("ükski .opt pole 'right'", page.locator("#opts .opt.right").count() == 0)
    check("ükski .opt pole 'wrong'", page.locator("#opts .opt.wrong").count() == 0)
    disabled_n = page.evaluate("() => [...document.querySelectorAll('#opts .opt')].filter(b => b.disabled).length")
    check("ükski .opt pole disabled", disabled_n == 0, disabled_n)
    check("ükski .opt ei sisalda <small> (variandi sõna)", page.locator("#opts .opt small").count() == 0,
          page.locator("#opts .opt small").count())

    # kolme klipi jada (~350ms samm) jookseb rahulikult lõpuni, ilma et midagi lekiks
    page.wait_for_timeout(1300)
    check("ka kolme klipi jada lõpus pole right/wrong tekkinud",
          page.locator("#opts .opt.right, #opts .opt.wrong").count() == 0)
    check("#cmpBtn ei jäänud 'playing' olekusse (audio2 puudumine ei jätnud kinni)",
          "playing" not in (page.locator("#cmpBtn").get_attribute("class") or ""))

    print("\n4. Vastamise järel kuulamisabi rida ja märkus kaovad")
    page.locator("#opts .opt").nth(0).click()
    page.wait_for_timeout(200)
    check("#cmpRow peidus pärast vastamist", page.locator("#cmpRow").is_hidden())
    check("#cmpNote peidus pärast vastamist", page.locator("#cmpNote").is_hidden())
    check("vastuse järel on täpselt üks 'right'", page.locator("#opts .opt.right").count() == 1)

    print("\n5. Vale vastuse järel: 'Kuula kõiki' töötab endiselt ja toob variantide sõnad")
    got_wrong = page.locator("#opts .opt.wrong").count() >= 1
    tries = 0
    while not got_wrong and tries < 8:
        tries += 1
        if page.locator("#nextBtn").is_visible():
            page.locator("#nextBtn").click()
        else:
            page.wait_for_timeout(900)
            if page.locator("#nextBtn").is_visible():
                page.locator("#nextBtn").click()
        page.wait_for_timeout(250)
        page.locator("#opts .opt").nth(tries % 3).click()
        page.wait_for_timeout(200)
        got_wrong = page.locator("#opts .opt.wrong").count() >= 1
    check("õnnestus tekitada vale vastus (harjutamiseks vajalik)", got_wrong, "katseid: %d" % tries)
    if got_wrong:
        check("'after' rida nähtav (vale vastus)", page.locator("#after").is_visible())
        check("#allBtn nähtav", page.locator("#allBtn").is_visible())
        page.wait_for_timeout(700)  # app.js käivitab setTimeout(playAll, 600) ise
        check("small-elemendid (variandi sõnad) tekkisid pärast vastamist",
              page.locator("#opts .opt small").count() == 3, page.locator("#opts .opt small").count())
        check("õigel nupul on klass 'right'", page.locator("#opts .opt.right").count() == 1)
        # käivitame #allBtn veel kord käsitsi — endine "Kuula kõiki" peab ikka tööd tegema
        page.locator("#allBtn").click()
        page.wait_for_timeout(700)
        check("#allBtn käivitatuna small-elemendid endiselt olemas", page.locator("#opts .opt small").count() == 3)

    print("\n6. Regressioon: 'Edasi' viib järgmise küsimuseni, edenemisriba liigub")
    # Raamistik 3: riba liigub vastamise hetkel; järgmise küsimuse number loendurist.
    bar_before = page.evaluate("() => document.getElementById('loendur').textContent")
    if page.locator("#nextBtn").is_visible():
        page.locator("#nextBtn").click()
    page.wait_for_timeout(300)
    check("uus küsimus laadis (#cmpRow jälle nähtav)", page.locator("#cmpRow").is_visible())
    check("#cmpNote uue küsimuse juures peidus", page.locator("#cmpNote").is_hidden())
    bar_after = page.evaluate("() => document.getElementById('loendur').textContent")
    check("loendur liikus järgmise küsimuse peale", bar_before != bar_after, (bar_before, bar_after))
    check("variante ikka 3", page.locator("#opts .opt").count() == 3)

    print("\n7. Võistluses kuulamisabi ei ole")
    page.locator("#quitBtn").click()  # harjutamises väljub kohe koju (G.mode !== "test")
    page.wait_for_timeout(200)
    if not page.locator("#competeBtn").is_visible():
        page.locator("#homeBtn").click()
        page.wait_for_timeout(200)
    comp_page = page
    if page.locator("#competeBtn").is_disabled():
        # tänane võistlus juba "tehtud" (nt kella veeretumine seansi jooksul) — proovi puhtal seansil
        comp_page = fresh_page(br, errs)
    comp_page.locator("#competeBtn").click()
    comp_page.wait_for_timeout(100)
    check("esimene vajutus küsib kinnitust", "Alustame" in comp_page.locator("#competeBtn").inner_text(),
          comp_page.locator("#competeBtn").inner_text())
    comp_page.locator("#competeBtn").click()
    comp_page.wait_for_timeout(300)
    check("võistlus käivitus (3 varianti ekraanil)", comp_page.locator("#opts .opt").count() == 3)
    check("#cmpRow on peidus võistluses", comp_page.locator("#cmpRow").is_hidden())
    check("#cmpNote on peidus võistluses", comp_page.locator("#cmpNote").is_hidden())

    check("konsoolis pole (heliga mitteseotud) JS-vigu", not errs, "; ".join(errs[:5]))
    br.close()


with sync_playwright() as pw:
    run(pw)

print("\n%d kontrolli, %s" % (total, "kõik läbi" if not fails else "läbi kukkus: " + ", ".join(fails)))
sys.exit(1 if fails else 0)
