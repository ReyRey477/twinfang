"""Collect one round of the review workflow from its journal into tools/shots/review/round<N>.json and print a summary.

  python tools/review_round.py <N> <path to the workflow's journal.jsonl>

The journal holds one line per agent result: the two critiques (scores, findings, keep, summary) and the two fix
reports (branch, commit, addressed, skipped, checks, perf, notes). The saved file is what the next round is given.
"""
import io, json, os, sys
n, path = sys.argv[1], sys.argv[2]
rows = [json.loads(l) for l in io.open(path, encoding="utf-8") if l.strip()]
label = {r["agentId"]: r["label"] for r in rows if r["type"] == "started"}
out = {}
for r in rows:
    if r["type"] != "result" or not r.get("result"): continue
    kind, track = label[r["agentId"]].split(":"); out.setdefault(track, {})["critique" if kind == "critic" else "fix"] = r["result"]
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "review", "round%s.json" % n)
json.dump(out, io.open(dst, "w", encoding="utf-8"), indent=1)
for track, d in out.items():
    c, f = d.get("critique"), d.get("fix"); print("=====", track)
    if c:
        print(" scores:", "  ".join("%s %.1f" % (s["dimension"], s["score"]) for s in c["scores"]), "| mean %.2f" % (sum(s["score"] for s in c["scores"]) / len(c["scores"])))
        if c.get("previous"): print(" previous:", "  ".join("%s=%s" % (x["id"], x["verdict"]) for x in c["previous"]))
        print(" findings:", "  ".join("%s[%s]" % (x["id"], x["severity"][:3]) for x in c["findings"]))
        print(" summary:", c["summary"])
    if f:
        print(" FIX", f["branch"], f["commit"], "|", f["worktree"])
        for a in f["addressed"]: print("   +", a["id"], ":", a["change"][:230])
        for a in f["skipped"]: print("   -", a["id"], ":", a["reason"][:230])
        print("   checks:", f["checks"][:420]); print("   perf:", str(f.get("perf", ""))[:200]); print("   notes:", f["notes"][:800])
print("saved", dst)
