"""One review round's pictures: build, capture everything a critic should judge, write a manifest and contact sheets.

  python tools/review.py r1          ->  tools/shots/review/r1/{*.png, manifest.json, sheet_*.png}

Runs tools/s_review.mjs (interface, combat moments, rig characters) and tools/s_states.mjs (Lantern and Stormvane in
their states) at 1280x720 on the real GPU. tools/shots is git-ignored; the pictures are working material.
"""
import json, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
name = sys.argv[1] if len(sys.argv) > 1 else "r1"
out = os.path.join(here, "shots", "review", name); os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith(".png") or f == "manifest.json": os.remove(os.path.join(out, f))

def run(*a):
    print(">", " ".join(a)); r = subprocess.run(a, cwd=root, capture_output=True, text=True, encoding="utf-8", errors="replace")
    tail = [l for l in (r.stdout + r.stderr).splitlines() if not l.startswith("shot ")][-8:]
    print("\n".join("  " + l[:230] for l in tail)); return r.returncode

run(sys.executable, "build.py")
run("node", "tools/run.mjs", "tools/s_review.mjs", "--w", "1280", "--h", "720", "--out", out)
STATES = [
    ("lantern:float:1:25", "Lantern (hovering ranged enemy) idle, front. Staged in the gear hall."),
    ("lantern:float:1:200", "Lantern idle, back."),
    ("lantern:float:1:30:2.6:.9", "Lantern close-up of mask, arms and core."),
    ("lantern:charge:.55:25", "Lantern charging a shot: the tell the player reads."),
    ("lantern:stun:1.6:25", "Lantern stunned and pulled low."),
    ("storm:fly:1.2:30", "Stormvane boss (mechanical raptor) in flight, wings spread."),
    ("storm:fly:1.55:150", "Stormvane in flight from behind."),
    ("storm:gidle:1.6:30", "Stormvane grounded, standing."),
    ("storm:gidle:1.6:35:7:1:9:head", "Stormvane head close-up."),
    ("storm:stun:1.5:40", "Stormvane stunned on the ground (the damage window)."),
    ("storm:wsw:.75:20", "Stormvane winding up a wing sweep."),
]
run("node", "tools/run.mjs", "tools/s_states.mjs", "--w", "1280", "--h", "720", "--out", out, "--states", ",".join(s for s, _ in STATES))
mp = os.path.join(out, "manifest.json"); man = json.load(open(mp, encoding="utf-8")) if os.path.exists(mp) else []
states = sorted(f for f in os.listdir(out) if f.startswith("state_"))
for f, (_, cap) in zip(states, STATES):
    new = "char_" + f[len("state_"):]; os.replace(os.path.join(out, f), os.path.join(out, new)); man.append({"file": new, "group": "char", "caption": cap})
json.dump(man, open(mp, "w", encoding="utf-8"), indent=1)
for g in ("hud", "fx", "char"):
    run(sys.executable, "tools/sheet.py", g, "5", ".4", out)
print("review set:", out, len(man), "pictures", {g: sum(1 for m in man if m["group"] == g) for g in ("hud", "fx", "char")})
