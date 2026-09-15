"""Keele moodul: viis sammu, kirjutamise kontroll, kuulamisabi, paberil kontroll.

Valvab:
  - avalehel on tunni 10 rida ja igal real viis sammu-täppi;
  - uus ring: 5 rida, esmalt iga rea tutvumine, siis lünk, siis kokkupanek;
  - lünk: õige sõna täidab lünga, vale jätab ülesande järgmisse kordusesse;
  - kokkupanek: Kontrolli on kinni, kuni kõik sõnad on reas;
  - kirjutamine: suurtäht ja punkt ei loe, õigekiri loeb; vale sõna on
    vihjekaardil punane; „Peida ja kirjuta uuesti" ei muuda tulemust;
  - telefoni automaatparandus on väljas;
  - tõlkimine: kuulamisabiga õige ei tee rida selgeks ja rida tuleb tagasi;
  - rida on selge alles pärast kahte õiget tõlget KAHES eri ringis;
  - tulemuse ekraanil on „Kirjuta vihikusse" ringi ridadega;
  - heli: kui faili pole, loeb brauseri hääl (speechSynthesis);
  - Enter ei jäta vihjet vahele, avalehe kaart viib Keelde.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8809 &
    python3 tools/test_keel.py 8809
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8809"
BASE = f"http://localhost:{PORT}"
vead = []

HELI = """(() => {
  window.__raagi = [];
  window.__fail = [];
  HTMLMediaElement.prototype.play = function () {
    const a = this; window.__fail.push(a.src);
    return Promise.reject(Object.assign(new Error('pole'), { name: 'NotSupportedError' }));
  };
  HTMLMediaElement.prototype.pause = function () {};
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    speak(u) { window.__raagi.push(u.text); setTimeout(() => u.onend && u.onend(), 5); },
    cancel() {}, getVoices() { return []; }, addEventListener() {} } });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function (t) { this.text = t; } });
})();"""


def kontrolli(tingimus, silt, lisa=""):
    print(("OK   " if tingimus else "VIGA ") + silt + (f"  ({lisa})" if lisa and not tingimus else ""))
    if not tingimus:
        vead.append(silt)


def uus(b, andmed=None, leht="keel/"):
    ctx = b.new_context(viewport={"width": 400, "height": 860})
    init = "(() => { if (sessionStorage.__ok) return; sessionStorage.__ok = 1;"
    for k, v in (andmed or {}).items():
        init += f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});"
    init += "})();"
    ctx.add_init_script(init)
    ctx.add_init_script(HELI)
    page = ctx.new_page()
    page.route(re.compile(r"fonts\.(googleapis|gstatic)\.com"), lambda r: r.abort())
    page.route(re.compile(r"supabase\.co"), lambda r: r.fulfill(status=200, content_type="application/json", body='{"error":"net"}'))
    js = []
    page.on("pageerror", lambda e: js.append(str(e)))
    page.goto(f"{BASE}/{leht}", wait_until="domcontentloaded")
    page.wait_for_timeout(300)
    return ctx, page, js


def cur(page):
    return page.evaluate("() => { const c = HMang._aktiivne.cur; return c && { id: c.id, samm: c.samm, en: c.rida.en, et: c.rida.et, oige: c.l && c.l.oige, done: c.done, abi: c.abi }; }")


def vasta_oigesti(page, q):
    s = q["samm"]
    if s == "tutvu":
        page.click("#luges")
    elif s == "lunk":
        page.click(f'#opts .opt[data-k="{q["oige"]}"]')
    elif s == "kokku":
        sonad = q["en"].split()
        for w in sonad:
            page.locator("#kaardid .kaart:not([disabled])", has_text=re.compile("^" + re.escape(w) + "$")).first.click()
        page.click("#kontrolli")
    else:
        page.fill("#kirjuta", q["en"].lower().rstrip(".?"))
        page.press("#kirjuta", "Enter")


def edasi(page):
    if page.locator("#after").is_visible():
        page.click("#nextBtn")
    else:
        page.wait_for_timeout(1150)


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # --- avaleht ---
        ctx, page, js = uus(b)
        kontrolli(page.locator("#readmap .rr").count() == 10, "avalehel 10 rida")
        kontrolli(page.locator("#readmap .rr").first.locator(".tapid i").count() == 5, "igal real 5 täppi")
        kontrolli(page.inner_text("#trainMeta") == "5 lauset", "Harjuta nupul ringi pikkus", page.inner_text("#trainMeta"))
        kontrolli(page.locator("#competeBtn").count() == 0, "võistlust ei ole")

        # --- esimene ring ---
        page.click("#startBtn")
        page.wait_for_timeout(400)
        kontrolli(page.inner_text("#loendur") == "1 / 15", "ringis 15 ülesannet", page.inner_text("#loendur"))
        q = cur(page)
        kontrolli(q["samm"] == "tutvu" and page.text_content("#sammNimi") == "Tutvu", "esimene samm on tutvumine")
        kontrolli(page.locator("#lava .en .w").count() == len(q["en"].split()), "rea sõnad on puudutatavad")
        page.wait_for_timeout(300)
        raagitud = page.evaluate("() => window.__raagi.slice()")
        kontrolli(q["en"] in raagitud, "rida kõlab ise; faili puudumisel loeb brauseri hääl", raagitud)
        page.locator("#lava .en .w").nth(1).click()
        page.wait_for_timeout(50)
        kontrolli(page.evaluate("() => window.__raagi.slice(-1)[0]") == q["en"].split()[1].rstrip(".?"), "sõna puudutus loeb sõna")
        kontrolli(any("audio/s/" in s for s in page.evaluate("() => window.__fail")) or q["en"].split()[1] in ("to", "a", "an", "the", "at", "in", "is"),
                  "sõna heli otsitakse kõigepealt failist")

        samme = []
        for i in range(5):
            q = cur(page); samme.append(q["samm"]); vasta_oigesti(page, q); edasi(page)
        kontrolli(samme == ["tutvu"] * 5, "esmalt viis tutvumist", samme)
        q = cur(page)
        kontrolli(q["samm"] == "lunk", "siis lünk")
        kontrolli(page.locator("#opts .opt").count() == 3 and page.locator("#gap").count() == 1, "lüngas kolm valikut")
        # vale lünk
        vale = page.evaluate("() => [...document.querySelectorAll('#opts .opt')].map(b => b.dataset.k).find(k => k !== HMang._aktiivne.cur.l.oige)")
        page.click(f'#opts .opt[data-k="{vale}"]')
        kontrolli(page.locator("#after").is_visible(), "vale lünga järel ootab Edasi")
        kontrolli(page.inner_text("#gap") == q["oige"], "lünk täitub õige sõnaga")
        kontrolli("Õige sõna on" in page.inner_text("#fb"), "vale lause", page.inner_text("#fb"))
        page.keyboard.press("Enter")
        page.wait_for_timeout(100)
        kontrolli(cur(page)["id"] != q["id"], "Enter läheb edasi")
        valeId = q["id"]

        # kõik ülejäänud õigesti, kuni kokkupanek tuleb
        nahtud_kordus = False
        while True:
            q = cur(page)
            if q is None or page.locator("#s-result").is_visible():
                break
            if q["id"] == valeId:
                nahtud_kordus = True
            if q["samm"] == "kokku" and not page.evaluate("() => window.__kokkuTest || false"):
                page.evaluate("() => window.__kokkuTest = true")
                kontrolli(page.locator("#kontrolli").is_disabled(), "Kontrolli on kinni, kuni sõnad pole reas")
                page.locator("#kaardid .kaart").first.click()
                kontrolli(page.locator("#koht .kaart").count() == 1, "kaart läheb ritta")
                page.locator("#koht .kaart").first.click()
                kontrolli(page.locator("#koht .kaart").count() == 0, "rea kaart tuleb tagasi")
            vasta_oigesti(page, q)
            edasi(page)
        kontrolli(nahtud_kordus, "vale lünk tuli samas ringis tagasi")
        kontrolli(page.locator("#s-result").is_visible(), "ring lõppes")
        kontrolli(page.locator("#paber .pb").count() == 5, "vihikusse kirjutamiseks 5 rida")
        page.locator("#paber .pb .ghost").first.click()
        kontrolli(page.locator("#paber .pb .en2").first.is_visible(), "Näita paljastab inglise rea")
        andmed = page.evaluate("() => JSON.parse(localStorage.getItem('keel_v1'))")
        kontrolli(sum(1 for k, v in andmed["stats"].items() if k.endswith(":kokku") and v.get("labi")) == 5, "5 rida on kokkupaneku läbinud")
        kontrolli(len(js) == 0, "konsoolis vigu pole (1)", js)
        ctx.close()

        # --- kirjutamine ja tõlge ---
        stats = {}
        for n in range(1, 11):
            rid = f"u4l4-{n:02d}"
            for s in ("tutvu", "lunk", "kokku"):
                stats[f"{rid}:{s}"] = {"n": 1, "ok": 1, "streak": 1, "lastOk": True, "t": 1, "labi": True}
        ctx, page, js = uus(b, {"keel_v1": {"stats": stats}})
        page.click("#startBtn")
        page.wait_for_timeout(300)
        q = cur(page)
        kontrolli(q["samm"] == "kuula", "neljas samm on kuulmise järgi kirjutamine")
        attr = page.evaluate("() => { const i = document.getElementById('kirjuta'); return [i.getAttribute('autocorrect'), i.getAttribute('autocapitalize'), i.getAttribute('spellcheck'), i.getAttribute('autocomplete')]; }")
        kontrolli(attr == ["off", "off", "false", "off"], "automaatparandus väljas", attr)
        # tühi vastus ei ole viga
        page.click("#vastan")
        kontrolli(not cur(page)["done"] and "Kirjuta" in page.inner_text("#fb"), "tühi vastus ei ole vale")
        # kirjaviga
        vigane = q["en"].replace("building", "bulding") if "building" in q["en"] else q["en"].replace("e", "a", 1)
        page.fill("#kirjuta", vigane)
        page.press("#kirjuta", "Enter")
        kontrolli(cur(page)["done"] and page.locator("#after").is_visible(), "kirjaviga on vale")
        kontrolli(page.locator("#hint .oigerida .halb").count() == 1, "vihjel üks punane sõna", page.inner_html("#hint"))
        kontrolli("Peaaegu" in page.inner_text("#fb"), "peaaegu-lause", page.inner_text("#fb"))
        page.click("#hint [data-uuesti]")
        kontrolli(not page.locator("#hint .oigerida").is_visible(), "uuesti kirjutades on õige rida peidus")
        page.fill("#hint .uuesti input", q["en"].upper())
        page.press("#hint .uuesti input", "Enter")
        kontrolli(page.inner_text("#hint .teade") == "Nüüd on õige!", "uuesti kirjutamine: õige")
        kontrolli(page.locator("#s-game").is_visible() and cur(page)["id"] == q["id"], "Enter vihjes ei vii edasi")
        page.click("#nextBtn")

        # tõlge kuulamisabiga
        while cur(page)["samm"] != "tolgi":
            vasta_oigesti(page, cur(page)); edasi(page)
        q = cur(page)
        kontrolli(page.locator("#lava .et.suur").inner_text() == q["et"], "tõlkimisel on eesti lause suurelt")
        kontrolli(page.locator('#lava [data-heli="aeglane"]').count() == 0, "tõlkimisel ei kõla rida ise")
        page.click('#lava [data-heli="abi"]')
        kontrolli(page.locator("#abiNote").is_visible() and cur(page)["abi"], "kuulamisabi märge")
        vasta_oigesti(page, q)
        page.wait_for_timeout(1150)
        andmed = page.evaluate("() => JSON.parse(localStorage.getItem('keel_v1'))")
        s = andmed["stats"].get(q["id"], {})
        kontrolli(not s.get("ringid"), "abiga õige ei loe", s)
        tuli_tagasi = False
        while not page.locator("#s-result").is_visible():
            c = cur(page)
            if c["id"] == q["id"]:
                tuli_tagasi = True
            vasta_oigesti(page, c); edasi(page)
        kontrolli(tuli_tagasi, "abiga tõlgitud rida tuli tagasi")
        andmed = page.evaluate("() => JSON.parse(localStorage.getItem('keel_v1'))")
        kontrolli(len(andmed["stats"][q["id"]].get("ringid", [])) == 1, "ilma abita kordus loeb ühe ringi")
        kontrolli(not page.locator("#resStats").inner_text().count("sai selgeks"), "ühe ringiga ei saa rida selgeks")

        # teine ring: tõlked teist korda → selged
        page.click("#againBtn")
        page.wait_for_timeout(300)
        while not page.locator("#s-result").is_visible():
            vasta_oigesti(page, cur(page)); edasi(page)
        andmed = page.evaluate("() => JSON.parse(localStorage.getItem('keel_v1'))")
        selgeid = sum(1 for n in range(1, 11) if len(andmed["stats"].get(f"u4l4-{n:02d}:tolgi", {}).get("ringid", [])) >= 2)
        kontrolli(selgeid >= 1, "kahe eri ringiga saab rida selgeks", selgeid)
        kontrolli("sai selgeks" in page.inner_text("#resStats"), "tulemus ütleb, mitu rida sai selgeks", page.inner_text("#resStats"))
        page.click("#homeBtn")
        kontrolli(page.locator("#readmap .rr.g").count() == selgeid, "avalehel selged read rohelised")
        kontrolli(len(js) == 0, "konsoolis vigu pole (2)", js)
        ctx.close()

        # --- Harjutaja avaleht ---
        ctx, page, js = uus(b, leht="")
        kontrolli(page.locator('a.mod-keel[href="keel/"]').count() == 1, "avalehel on Keele kaart")
        kontrolli(page.locator("#facePapagoi svg").count() == 1, "kaardil on papagoi")
        kontrolli(len(js) == 0, "konsoolis vigu pole (3)", js)
        ctx.close()
        b.close()

    print("\n" + ("KÕIK LÄBI" if not vead else f"{len(vead)} VIGA: " + "; ".join(vead)))
    sys.exit(1 if vead else 0)


if __name__ == "__main__":
    main()
