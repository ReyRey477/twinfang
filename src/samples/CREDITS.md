# Samples

Short excerpts of recordings, all released under Creative Commons CC0 1.0 (public-domain dedication). Thank you to their makers.

| Files | From | By | Source |
| --- | --- | --- | --- |
| `kick*`, `sn*`, `t1`-`t4`, `hh*`, `crash`, `china` | Big Rusty Drums | Karoryfer Samples | github.com/sfzinstruments/karoryfer.big-rusty-drums |
| `g<note>_*`, `gm_*` | Emilyguitar (electric guitar, recorded direct) | Karoryfer Samples | github.com/sfzinstruments/karoryfer.emilyguitar |
| `bs*`, `bt*` | Growlybass | Karoryfer Samples | github.com/sfzinstruments/karoryfer.growlybass |
| `swl_*`, `swh_*` | Swishes Sound Pack | artisticdude | opengameart.org/content/swishes-sound-pack |
| `shing_*`, `growl_*` | RPG Sound Pack | artisticdude | opengameart.org/content/rpg-sound-pack |
| `mhit_*`, `mbig_*` | 100 CC0 metal and wood SFX | rubberduck | opengameart.org/content/100-cc0-metal-and-wood-sfx |

The raw downloads are not in the repository. `python tools/fetch_samples.py` fetches them into `samples_src/` (git-ignored) and `python tools/make_samples.py` cuts, levels and encodes the files here. `index.json` holds the measured pitch of each tuned sample. `build.py` embeds everything in `twinfang.html` as base64, because a page opened from a file cannot load side files.
