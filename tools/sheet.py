"""Tile screenshots into one contact sheet.  python tools/sheet.py <prefix> [columns] [scale]  ->  tools/shots/sheet_<prefix>.png"""
import glob, os, sys
from PIL import Image, ImageDraw
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
prefix = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 5; scale = float(sys.argv[3]) if len(sys.argv) > 3 else 1
files = sorted(glob.glob(os.path.join(here, prefix + "_*.png")))
ims = [Image.open(f).convert("RGB") for f in files]
if scale != 1: ims = [im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS) for im in ims]
w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), (0, 0, 0)); d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * w, (i // cols) * h; sheet.paste(im, (x, y))
    d.text((x + 5, y + 4), os.path.basename(f)[len(prefix) + 1:-4], fill=(255, 255, 120))
out = os.path.join(here, "sheet_%s.png" % prefix); sheet.save(out); print(out, sheet.size)
