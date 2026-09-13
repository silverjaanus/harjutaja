# Ehitab korrutaja/korrutaja.src.html -> korrutaja/index.html.
# Kaivita: python korrutaja/build.py
#
# Erinevus vanast, eraldi saidil olnud build'ist:
#   - oma manifesti ja oma ikoone enam ei tehta. Kogu apil on uks logo ja uks manifest
#     (Harjutaja oma, juurkaustas) - vt claude/harjutaja-ulevaade.md, "Uks logo, moodulitel maskotid".
#   - oma service workerit enam ei registreerita. Uhel originil on uks service worker;
#     Korrutaja vana sw kustutas aktiveerudes koik vahemalud, mis polnud tema omad, ja
#     oleks samal originil havitanud Harjutaja omad. Juure sw.js katab Korrutaja ara.
#   - Pillow'i enam vaja ei ole, sest ikoone ei genereerita.
import json, os

root = os.path.dirname(os.path.abspath(__file__))
frag = open(os.path.join(root, 'korrutaja.src.html'), encoding='utf-8').read()

# Supabase konfiguratsioon (klassid ja edetabelid)
cfg_path = os.path.join(root, 'config.json')
if os.path.exists(cfg_path):
    cfg = json.load(open(cfg_path, encoding='utf-8'))
    frag = frag.replace("var SB={url:'',key:''};",
                        "var SB={url:'%s',key:'%s'};" % (cfg.get('url', ''), cfg.get('key', '')), 1)

head_extra = ('<link rel="manifest" href="../manifest.webmanifest">\n'
              '<link rel="icon" href="../icons/harjutaja-ikoon-ummar.svg" type="image/svg+xml">\n'
              '<link rel="icon" href="../icons/harjutaja-32.png" sizes="32x32">\n'
              '<link rel="apple-touch-icon" href="../icons/harjutaja-180.png">\n'
              # Klassi identiteet on koigi moodulite uhine. Peab laadima enne mangu skripti.
              '<script src="../core/klass.js"></script>\n')

cut = frag.index('</style>') + len('</style>')
html = ('<!doctype html>\n<html lang="et">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">\n'
        + head_extra + frag[:cut] + '\n</head>\n<body>\n' + frag[cut:] + '\n</body>\n</html>\n')

open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(html)
print('korrutaja/index.html', os.path.getsize(os.path.join(root, 'index.html')) // 1024, 'KB')
