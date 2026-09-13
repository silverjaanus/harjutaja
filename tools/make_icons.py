"""Harjutaja ikoonide genereerimine.

Ainus tõeallikas on siinne geomeetria (sama mis icons/harjutaja-ikoon.svg):
neli kriipsu kahes paaris ja tõusev sild nende vahel, kollasel põhjal.

Kaks varianti, sest üks fail ei saa mõlemat rolli hästi täita:
  * "any"      - märk täissuuruses. Favicon, apple-touch-icon, veeb.
  * "maskable" - märk 20% väiksem. Android lõikab adaptiivsest ikoonist
                 välja ainult keskmise ringi (72/108 pildi laiusest), nii et
                 täissuuruses märgi otsad jäävad maskiga maha.

Käivita repo juurest:  python tools/make_icons.py
"""
import os
from PIL import Image, ImageDraw

BG = (243, 196, 69)   # #f3c445
INK = (22, 40, 74)    # #16284a
SEGS = [((28, 24), (28, 76)), ((38, 24), (38, 76)),
        ((62, 24), (62, 76)), ((72, 24), (72, 76)),
        ((38, 56), (62, 44))]
WIDTH = 8.6
MASKABLE_SCALE = 0.80

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "icons")
SS = 8  # ülediskreetimine, et servad siledaks jääks


def render(size, scale=1.0):
    """Joonistab ikooni antud suuruses. scale kahandab märki keskpunkti suhtes."""
    s = size * SS
    im = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(im)
    u = s / 100.0
    w = WIDTH * scale * u

    def t(x, y):
        return ((50 + (x - 50) * scale) * u, (50 + (y - 50) * scale) * u)

    for a, b in SEGS:
        pa, pb = t(*a), t(*b)
        d.line([pa, pb], fill=INK, width=int(round(w)))
        for p in (pa, pb):          # ümarad otsad
            r = w / 2.0
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=INK)
    return im.resize((size, size), Image.LANCZOS)


def svg(path, scale=1.0):
    def t(x, y):
        return (round(50 + (x - 50) * scale, 2), round(50 + (y - 50) * scale, 2))
    bars = "".join("M%s %sV%s" % (t(a[0], a[1])[0], t(a[0], a[1])[1], t(b[0], b[1])[1])
                   for a, b in SEGS[:4])
    br = "M%s %sL%s %s" % (t(*SEGS[4][0]) + t(*SEGS[4][1]))
    w = round(WIDTH * scale, 2)
    out = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
        'width="100" height="100" role="img" aria-label="Harjutaja">\n'
        '  <title>Harjutaja</title>\n'
        '  <rect width="100" height="100" fill="#f3c445"/>\n'
        '  <path d="%s" fill="none" stroke="#16284a" stroke-width="%s" stroke-linecap="round"/>\n'
        '  <path d="%s" fill="none" stroke="#16284a" stroke-width="%s" stroke-linecap="round"/>\n'
        '</svg>\n' % (bars, w, br, w))
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)


def main():
    os.makedirs(ICONS, exist_ok=True)
    for n in (512, 192, 180, 32):
        p = os.path.join(ICONS, "harjutaja-%d.png" % n)
        render(n).save(p, optimize=True)
        print("kirjutatud", os.path.basename(p), os.path.getsize(p), "baiti")
    for n in (512, 192):
        p = os.path.join(ICONS, "harjutaja-maskable-%d.png" % n)
        render(n, MASKABLE_SCALE).save(p, optimize=True)
        print("kirjutatud", os.path.basename(p), os.path.getsize(p), "baiti")
    svg(os.path.join(ICONS, "harjutaja-maskable.svg"), MASKABLE_SCALE)
    print("kirjutatud harjutaja-maskable.svg")

    # kontroll: iga fail peab uuesti avanema
    from PIL import Image as I
    for f in sorted(os.listdir(ICONS)):
        if f.startswith("harjutaja-") and f.endswith(".png"):
            im = I.open(os.path.join(ICONS, f)); im.load()
            print("  OK", f, im.size)


if __name__ == "__main__":
    main()
