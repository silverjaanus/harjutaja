"""Keele ekraanisõnad (16. sept): joonistatud ekraan, neli sammu, rajavalik.

Valvab:
  - avalehel on valik „Mida harjutad?": kooli laused või sõnad ekraanilt;
    „Tund" on näha ainult kooli lausetel, „Teema" ainult ekraanisõnadel;
  - ekraanisõnadel on avalehe kaardil teema sõnad nelja täpiga ja nupul „5 sõna";
  - ring: 5 sõna, esmalt vajuta, siis loe, siis kuula (15 ülesannet);
  - vajuta: joonistatud ekraanil on kõik teema nupud; vale nupp teeb oma
    asja, õige nupp läheb roheliseks, vihjekaardil on mõlema seletus;
    õige nupu järel on seletus ja mäng ootab „Edasi";
  - loe: 6 halli nuppu ilma piltideta, õige täpselt korra; õige järel läheb ise edasi;
  - kuula: sõna kõlab (fail audio/s/<sõna>.mp3 või brauseri hääl), laps kirjutab;
    vale järel „Õige sõna on …" ja „Peida ja kirjuta uuesti";
  - tõlgi: eesti vaste koos täpsustusega sulgudes, teema nimi; kuulamisabiga
    õige ei loe ja sõna tuleb tagasi; sõna on selge kahe tõlkeringi järel;
  - tulemus: „Harjuta neid sõnu", „… sõna sai selgeks", vihikuplokki pole;
  - ekraanisõnad ei muuda „Selged laused" arvu (edetabel);
  - Minecrafti ekraan; vana andmetega (ilma rada-valikuta) avaneb kooli rada;
  - igal teemal on ekraanil iga sõna nupp täpselt korra;
  - juhiste teema: ingliskeelne juhis, vale asi → „Juhis oli: … ehk …",
    hoidmine (lühike vajutus ei loe), korjamine loenduriga, siis loe-samm.

Kasutus (pilvekonteineris, repo juurest):
    python3 -m http.server 8806 &
    python3 tools/test_keel_ekraan.py 8806
"""
import re
import sys
from playwright.sync_api import sync_playwright

sys.path.insert(0, "tools")
import test_keel as T  # noqa: E402

PORT = sys.argv[1] if len(sys.argv) > 1 else "8806"
T.BASE = f"http://localhost:{PORT}"
kontrolli = T.kontrolli


def cur(page):
    return page.evaluate("""() => { const c = HMang._aktiivne.cur; return c && {
      id: c.id, sid: c.rida.id, samm: c.samm, liik: c.liik, en: c.rida.en, et: c.rida.et, done: c.done, abi: c.abi,
      teema: c.teema && c.teema.id }; }""")


def vali(page, rada, teema=None):
    page.click(f"#val-rada .chip:has-text('{rada}')")
    if teema:
        page.click(f"#val-teema .chip:has-text('{teema}')")
    page.wait_for_timeout(100)


def vasta_oigesti(page, q):
    if q["samm"] in ("vajuta", "loe"):
        page.click(f'#ekhost button.ek[data-id="{q["sid"]}"]')
    else:
        page.keyboard.type(q["en"].lower())
        page.keyboard.press("Enter")


def edasi(page):
    page.wait_for_timeout(120)
    if page.locator("#after").is_visible():
        page.click("#nextBtn")
    else:
        page.wait_for_timeout(1150)


def mangi_ring(page, oigesti=True):
    """Mängib ringi lõpuni. Tagastab sammude järjekorra."""
    sammud = []
    for _ in range(40):
        if page.locator("#s-result").is_visible():
            break
        q = cur(page)
        if not q:
            break
        sammud.append(q["samm"])
        vasta_oigesti(page, q)
        edasi(page)
    return sammud


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()

        # --- avaleht ja rajavalik ---
        ctx, page, js = T.uus(b)
        kontrolli(page.locator("#val-rada .chip").count() == 2, "raja valikuid on kaks")
        kontrolli(page.get_attribute("#val-rada .chip:has-text('Kooli laused')", "aria-pressed") == "true", "vaikimisi kooli laused")
        kontrolli(page.locator("#blk-tund").is_visible() and not page.locator("#blk-teema").is_visible(), "kooli rajal on Tund, pole Teemat")
        kontrolli(page.locator("#readmap .rr").count() == 10, "kooli rajal 10 lauset")
        vali(page, "Sõnad ekraanilt")
        kontrolli(not page.locator("#blk-tund").is_visible() and page.locator("#blk-teema").is_visible(), "ekraanirajal on Teema, pole Tundi")
        kontrolli(page.locator("#readmap .rr").count() == 8, "YouTube'is 8 sõna", page.locator("#readmap .rr").count())
        kontrolli(page.locator("#readmap .rr").first.locator(".tapid i").count() == 4, "igal sõnal 4 täppi")
        kontrolli(page.inner_text("#trainMeta") == "5 sõna", "Harjuta nupul 5 sõna", page.inner_text("#trainMeta"))
        kontrolli(page.inner_text("#kaartBlock .label").lower() == "sinu sõnad", "kaardi silt Sinu sõnad", page.inner_text("#kaartBlock .label"))
        kontrolli("5 sõna" in page.inner_text("#startNote"), "nupu all ringi pikkus", page.inner_text("#startNote"))
        kontrolli("telli" in page.inner_text("#readmap") and "(kanal)" not in page.inner_text("#readmap"), "kaardil eesti vaste ilma täpsustuseta")

        # --- esimene ring ---
        page.click("#startBtn")
        page.wait_for_timeout(400)
        kontrolli(page.inner_text("#loendur") == "1 / 15", "ringis 15 ülesannet", page.inner_text("#loendur"))
        q = cur(page)
        kontrolli(q["liik"] == "sona" and q["samm"] == "vajuta", "esimene samm on vajuta")
        kontrolli(page.text_content("#sammNimi") == "Leia nupp", "sammu nimi")
        kontrolli(page.locator("#ekhost .ekraan.yt").count() == 1, "YouTube'i ekraan on joonistatud")
        kontrolli(page.locator("#ekhost button.ek").count() == 8, "ekraanil 8 nuppu", page.locator("#ekhost button.ek").count())
        kontrolli(page.inner_text(".ek-ul .k-silt") == "Leia nupp, mis tähendab:", "küsimuse silt", page.inner_text(".ek-ul .k-silt"))
        kontrolli(page.inner_text(".ek-ul .k-sona").split(" (")[0] == q["et"].split(" (")[0], "mullis on eesti tähendus", page.inner_text(".ek-ul .k-sona"))
        kontrolli(page.inner_text(".k-juhend") == "Vajuta seda all oleval pildil.", "rida, mida teha")
        kontrolli(page.locator("#kthost").count() == 0, "vajutamisel klaviatuuri pole")

        # vale nupp
        teine = page.evaluate("(id) => [...document.querySelectorAll('#ekhost button.ek')].map(b => b.dataset.id).find(x => x !== id)", q["sid"])
        page.click(f'#ekhost button.ek[data-id="{teine}"]')
        page.wait_for_timeout(250)
        fb = page.inner_text("#fb")
        kontrolli(fb.startswith("See nupp on „") and "Õige nupp on „" + q["en"] + "“" in fb, "vale nupu tagasiside", fb)
        kontrolli(page.locator(f'#ekhost button.ek[data-id="{teine}"].vale').count() == 1, "vale nupp on märgitud")
        kontrolli(page.locator(f'#ekhost button.ek[data-id="{q["sid"]}"].oige').count() == 1, "õige nupp on roheline")
        kontrolli(page.locator(f"#ekhost .ekraan.tehtud-{teine}").count() == 1, "vale nupp tegi oma asja")
        kontrolli(page.locator("#hint .teeb").count() == 2, "vihjekaardil kahe nupu seletus")
        kontrolli(page.locator("#after").is_visible(), "vale järel Edasi")
        kontrolli(page.locator("#ekhost button.ek:not([disabled])").count() == 0, "pärast vastust nupud kinni")
        page.click("#nextBtn")
        page.wait_for_timeout(250)

        # õige nupp: seletus ja Edasi
        q = cur(page)
        kontrolli(q["samm"] == "vajuta", "teine ülesanne on ka vajuta")
        page.click(f'#ekhost button.ek[data-id="{q["sid"]}"]')
        page.wait_for_timeout(1500)
        kontrolli(cur(page)["id"] == q["id"], "õige nupu järel ei lähe ise edasi")
        teeb = page.inner_text("#teeb")
        kontrolli(page.locator("#teeb").is_visible() and teeb.startswith("„" + q["en"] + "“"), "õige järel on seletus", teeb)
        kontrolli(page.locator("#after").is_visible(), "õige järel Edasi nupp")
        kontrolli(any(q["en"] in s for s in page.evaluate("window.__raagi")) or
                  any(("/s/" + re.sub("[^a-z]", "", q["en"].lower())) in s for s in page.evaluate("window.__fail")),
                  "õige nupu järel kõlab sõna")
        page.keyboard.press("Enter")
        page.wait_for_timeout(250)
        kontrolli(cur(page)["id"] != q["id"], "Enter viib edasi")

        # kuni loe-sammuni
        for _ in range(10):
            q = cur(page)
            if q["samm"] != "vajuta":
                break
            vasta_oigesti(page, q)
            edasi(page)
        q = cur(page)
        kontrolli(q["samm"] == "loe", "pärast vajutamist tuleb loe", q["samm"])
        kontrolli(page.locator("#ekhost .ekraan").count() == 0, "loe-sammus ekraani pole")
        kontrolli(page.locator("#ekhost button.ek-hall").count() == 6, "loe: 6 halli nuppu")
        kontrolli(page.locator(f'#ekhost button.ek-hall[data-id="{q["sid"]}"]').count() == 1, "loe: õige nupp on olemas")
        kontrolli(page.locator("#ekhost svg").count() == 0, "loe: pilte pole")
        vasta_oigesti(page, q)
        page.wait_for_timeout(1300)
        kontrolli(cur(page)["id"] != q["id"], "loe: õige järel läheb ise edasi")

        for _ in range(10):
            q = cur(page)
            if q["samm"] != "loe":
                break
            vasta_oigesti(page, q)
            edasi(page)
        q = cur(page)
        kontrolli(q["samm"] == "kuula", "siis tuleb kuula", q["samm"])
        page.wait_for_timeout(400)
        nimi = re.sub("[^a-z]", "", q["en"].lower())
        kontrolli(any(f"audio/s/{nimi}.mp3" in s for s in page.evaluate("window.__fail")), "kuula: proovib sõna faili", nimi)
        kontrolli(q["en"] in page.evaluate("window.__raagi"), "kuula: faili puudumisel brauseri hääl")
        kontrolli(page.get_attribute(".taheklaviatuur input", "inputmode") == "none", "oma klaviatuur")
        page.keyboard.type("xyz")
        page.keyboard.press("Enter")
        page.wait_for_timeout(250)
        kontrolli(page.inner_text("#fb") == "Õige sõna on „" + q["en"] + "“.", "kuula: vale tagasiside", page.inner_text("#fb"))
        kontrolli(page.locator("#hint [data-uuesti]").count() == 1, "kuula: Peida ja kirjuta uuesti")
        page.click("#hint [data-uuesti]")
        page.keyboard.type(q["en"].lower())
        page.keyboard.press("Enter")
        page.wait_for_timeout(200)
        kontrolli(page.inner_text("#fb") == "Nüüd on õige!", "uuesti kirjutamine", page.inner_text("#fb"))
        page.click("#nextBtn")
        page.wait_for_timeout(250)
        mangi_ring(page)
        kontrolli(page.locator("#s-result").is_visible(), "ring lõppes")
        kontrolli(page.inner_text("#againBtn") == "Harjuta neid sõnu", "sihitud nupp sõnadele", page.inner_text("#againBtn"))
        kontrolli(page.locator("#resLisaBlock").is_hidden(), "vihikuplokki pole")
        kontrolli("Järgmisel korral" in page.text_content("#resNextBlock"), "vigade nimekiri")

        # --- teine ring: tõlkimine ---
        page.click("#homeBtn")
        page.wait_for_timeout(200)
        page.click("#startBtn")
        page.wait_for_timeout(300)
        kontrolli(page.locator("#s-game").is_visible(), "teine ring algas")
        leitud_tapsustus = False
        abi_proovitud = False
        for _ in range(60):
            if page.locator("#s-result").is_visible():
                break
            q = cur(page)
            if q["samm"] == "tolgi":
                kontrolli(page.text_content("#sammNimi") == "Tõlgi", "tõlkesammu nimi")
                kontrolli(page.inner_text(".teema-silt") == "YouTube’is", "tõlkes teema nimi", page.inner_text(".teema-silt"))
                if "(" in q["et"] and page.locator("#lava .et .tapsustus").count() == 1:
                    leitud_tapsustus = True
                if not abi_proovitud:
                    abi_proovitud = True
                    page.click("[data-heli='abi']")
                    kontrolli(page.locator("#abiNote").is_visible(), "kuulamisabi märkus")
                    vasta_oigesti(page, q)
                    edasi(page)
                    abi_id = q["sid"]
                    continue
            vasta_oigesti(page, q)
            edasi(page)
        kontrolli(page.locator("#s-result").is_visible(), "teine ring lõppes")
        st = page.evaluate("() => JSON.parse(localStorage.getItem('keel_v1')).stats")
        kontrolli(abi_proovitud and (st.get(abi_id + ":tolgi", {}).get("ringid") or []) != [] , "abiga sõnal on ikka üks õige ring (kordus)")

        # kolmas ring → selged
        page.click("#homeBtn")
        page.click("#startBtn")
        page.wait_for_timeout(300)
        mangi_ring(page)
        tul = page.inner_text("#resStats")
        kontrolli("sõna sai selgeks" in tul, "tulemus: sõna sai selgeks", tul)
        selged_sonad = page.evaluate("() => { const s = JSON.parse(localStorage.getItem('keel_v1')).stats; return KSonad.selgeid(s, KEEL_TEEMAD); }")
        kontrolli(selged_sonad >= 4, "kolme ringiga on sõnad selged", selged_sonad)
        page.click("#homeBtn")
        kontrolli(page.locator("#readmap .rr.g").count() == selged_sonad, "avalehel selged sõnad rohelised")
        lauseid = page.evaluate("() => { const s = JSON.parse(localStorage.getItem('keel_v1')).stats; return KEEL_TUNNID[0].read.filter(r => KLause.selge(s, r.id)).length; }")
        kontrolli(lauseid == 0, "ekraanisõnad ei tee lauseid selgeks")
        kontrolli(leitud_tapsustus, "tõlkes on täpsustus sulgudes (Subscribe)")
        kontrolli(not js, "konsoolis vigu pole (YouTube)", "; ".join(js))
        ctx.close()

        # --- Minecraft ---
        ctx, page, js = T.uus(b)
        vali(page, "Sõnad ekraanilt", "Minecraft")
        kontrolli(page.locator("#readmap .rr").count() == 8, "Minecraftis 8 sõna")
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(300)
        kontrolli(page.get_attribute("#val-teema .chip:has-text('Minecraft')", "aria-pressed") == "true", "teema valik jääb meelde")
        page.click("#startBtn")
        page.wait_for_timeout(300)
        q = cur(page)
        kontrolli(q["teema"] == "minecraft" and page.locator("#ekhost .ekraan.mc").count() == 1, "Minecrafti ekraan")
        kontrolli(page.locator("#ekhost button.ek").count() == 8, "Minecrafti ekraanil 8 nuppu")
        page.click(f'#ekhost button.ek[data-id="{q["sid"]}"]')
        page.wait_for_timeout(200)
        kontrolli(not js, "konsoolis vigu pole (Minecraft)", "; ".join(js))
        ctx.close()

        # --- kõik teemad: ekraanil on iga sõna nupp täpselt korra ---
        ctx, page, js = T.uus(b)
        puudu = page.evaluate("""() => KEEL_TEEMAD.filter(t => !t.juhised).map(t => {
          const h = document.createElement('div'); document.body.append(h);
          KEkraan.joonista(h, t);
          const ids = [...h.querySelectorAll('button.ek')].map(b => b.dataset.id);
          const vead = t.sonad.filter(s => ids.filter(x => x === s.id).length !== 1).map(s => s.id);
          if (ids.length !== t.sonad.length) vead.push(t.id + ': nuppe ' + ids.length);
          h.remove();
          return vead.join(',');
        }).filter(Boolean)""")
        kontrolli(not puudu, "igal teemal on iga sõna jaoks üks nupp", str(puudu))
        nimed = page.evaluate("() => [...document.querySelectorAll('#val-teema .chip')].map(b => b.textContent)")
        kontrolli(nimed == ["YouTube", "Minecraft", "Roblox", "Ehitamine", "Mängu juhised", "Tasemed ja auhinnad", "Ettevaatust"],
                  "teemade kiibid", str(nimed))

        # --- juhiste teema ---
        vali(page, "Sõnad ekraanilt", "Mängu juhised")
        page.click("#startBtn")
        page.wait_for_timeout(300)
        q = cur(page)
        kontrolli(q["sid"] == "ju-tap" and page.text_content("#sammNimi") == "Loe ja tee", "juhis: esimene on Tap, samm Loe ja tee", str(q))
        kontrolli(page.inner_text(".ek-ul .mull.juhis .k-sona") == "Tap the star!", "juhis on ingliskeelne", page.inner_text(".ek-ul .mull"))
        kontrolli(page.inner_text("#juhisNote") == "Tee seda all oleval mänguväljal.", "juhise all on rida, mida teha")
        kontrolli(page.locator("#ekhost button.jo").count() == 4, "väljal 4 asja")
        page.click("#ekhost button.jo[data-t='coin']")
        page.wait_for_timeout(250)
        kontrolli(page.inner_text("#fb") == "Juhis oli: „Tap the star!“ ehk „Puuduta tähte!“", "vale juhise tagasiside", page.inner_text("#fb"))
        kontrolli(page.locator("#ekhost button.jo[data-t='coin'].vale").count() == 1 and
                  page.locator("#ekhost button.jo[data-t='star'].oige").count() == 1, "vale ja õige asi märgitud")
        kontrolli(page.locator("#juhisNote").is_hidden(), "vale korral tõlget ei korrata juhise all")
        page.click("#nextBtn")
        page.wait_for_timeout(250)
        q = cur(page)
        kontrolli(q["sid"] == "ju-hold", "teine on Hold", q["sid"])
        nupp = page.locator("#ekhost button.jo[data-t='button']")
        bb = nupp.bounding_box()
        page.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        page.mouse.down(); page.wait_for_timeout(150); page.mouse.up()
        page.wait_for_timeout(200)
        kontrolli(not cur(page)["done"] and page.inner_text("#juhisNote") == "Hoia sõrme kauem all.", "lühike vajutus ei loe", page.inner_text("#juhisNote"))
        page.mouse.down(); page.wait_for_timeout(1200); page.mouse.up()
        page.wait_for_timeout(200)
        kontrolli(cur(page)["done"] and "feedback ok" in page.get_attribute("#fb", "class"), "pikk hoidmine on õige")
        kontrolli(page.locator("#teeb").is_visible() and page.locator("#after").is_visible(), "juhise järel seletus ja Edasi")
        kontrolli(page.inner_text("#juhisNote") == "„Hold the button!“ ehk „Hoia nuppu all!“", "õige järel on juhise tõlge", page.inner_text("#juhisNote"))
        page.click("#nextBtn")
        page.wait_for_timeout(250)
        q = cur(page)
        kontrolli(q["sid"] == "ju-collect", "kolmas on Collect", q["sid"])
        mundid = page.locator("#ekhost button.jo[data-t='coin']")
        kontrolli(mundid.count() == 4, "väljal 4 münti")
        mundid.nth(0).click(); mundid.nth(1).click()
        kontrolli(page.inner_text("#juLoendur") == "2 / 3" and not cur(page)["done"], "kaks münti: loendur 2 / 3")
        mundid.nth(2).click()
        page.wait_for_timeout(200)
        kontrolli(cur(page)["done"] and "feedback ok" in page.get_attribute("#fb", "class"), "kolm münti: õige")
        kontrolli(any("collectcoins" in s for s in page.evaluate("window.__fail")) or "Collect 3 coins!" in " ".join(page.evaluate("window.__raagi")),
                  "juhise järel kõlab juhis")
        page.click("#nextBtn")
        page.wait_for_timeout(250)
        for _ in range(12):
            q = cur(page)
            if q["samm"] != "vajuta":
                break
            if page.locator("#ekhost button.jo[data-t='grasspath']").count():
                page.click("#ekhost button.jo[data-t='grasspath']")
            else:
                sihid = page.evaluate("() => { const r = HMang._aktiivne.cur.rida; return [r.siht, r.mitu || 1, !!r.hoia]; }")
                for k in range(sihid[1]):
                    page.locator(f"#ekhost button.jo[data-t='{sihid[0]}']:not([disabled])").first.click()
            edasi(page)
        q = cur(page)
        kontrolli(q["samm"] == "loe" and page.locator("#ekhost button.ek-hall").count() == 6, "juhiste teemas tuleb siis loe", q["samm"])
        kontrolli(not page.locator(".ek-ul .mull.juhis").count() and page.inner_text(".ek-ul .k-silt") == "Leia sõna, mis tähendab:", "loe-sammus on eesti tähendus")
        kontrolli(not js, "konsoolis vigu pole (teemad)", "; ".join(js))
        ctx.close()

        # --- kooli rada töötab edasi ---
        ctx, page, js = T.uus(b, {"keel_v1": {"stats": {}, "valik": {"tund": "u4l4"}}})
        kontrolli(page.get_attribute("#val-rada .chip:has-text('Kooli laused')", "aria-pressed") == "true", "vana valik: kooli rada")
        page.click("#startBtn")
        page.wait_for_timeout(300)
        kontrolli(page.evaluate("HMang._aktiivne.cur.samm") == "tutvu", "kooli rada algab tutvumisega")
        kontrolli(not js, "konsoolis vigu pole (kool)", "; ".join(js))
        ctx.close()
        b.close()

    print("\nKÕIK LÄBI" if not T.vead else f"\n{len(T.vead)} VIGA: " + "; ".join(T.vead))
    sys.exit(1 if T.vead else 0)


if __name__ == "__main__":
    main()
