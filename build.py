"""Concatenate src/ parts into the single-file game.

Writes two files:
  twinfang.html      the public build, from src/ only
  twinfang.dev.html  the developer build, src/ plus the parts in dev/ (git-ignored, never published)

Usage: python build.py
"""
import glob
import io
import os

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "src")
dev = os.path.join(here, "dev")


def read(path):
    with io.open(path, encoding="utf-8") as f:
        return f.read()


def js_parts(folder):
    return [read(p).rstrip("\n") + "\n\n" for p in sorted(glob.glob(os.path.join(folder, "*.js")))]


def write(name, parts):
    with io.open(os.path.join(here, name), "w", encoding="utf-8", newline="\n") as f:
        f.write("".join(parts))
    print("built %s from %d parts" % (name, len(parts)))


head = read(os.path.join(src, "00-head.html"))
tail = read(os.path.join(src, "99-tail.html"))
game = js_parts(src)

write("twinfang.html", [head] + game + [tail])
dev_parts = js_parts(dev) if os.path.isdir(dev) else []
if dev_parts:
    write("twinfang.dev.html", [head.replace("<title>TWINFANG</title>", "<title>TWINFANG (dev)</title>")] + game + dev_parts + [tail])
