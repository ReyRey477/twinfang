# TWINFANG

A character-action prototype that runs in the browser with Three.js. All models, animation and audio are procedural.

Fight down a corridor, beat the Gatewarden in its hall, climb the winding stair, clear three sealed rooms on the upper level, then face the Stormvane on the roof.

## Play

Open `twinfang.html` in a desktop browser (needs an internet connection for Three.js and fonts).

## Controls

| Input | Action |
| --- | --- |
| W A S D, mouse | Move, camera |
| 1 2 3, F, mouse wheel | Switch weapon set (works mid-combo) |
| Left click / J | Attack chain |
| Right click / K | Twin Fangs: launcher (hold to follow). Blade & Pistol: fire, hold for auto-fire. Great Maul: hold to charge a smash |
| E | Twin Fangs and Great Maul: rush thrust. Blade & Pistol: launcher |
| Space | Jump, double jump |
| Shift / L | Dodge; dodge at the last instant to slow time |
| Q | Lock-on |
| R | Retry from the last checkpoint after a defeat; restart after the results screen |

A gamepad also works.

## Weapon sets

- **Twin Fangs** – fast four-hit chain, a pause combo (slash, slash, wait for the glint, slash), launcher and plunge.
- **Blade & Pistol** – the third sword hit launches. The pistol does little damage but interrupts attacking enemies, keeps airborne enemies up, pops orbs and keeps the combo alive.
- **Great Maul** – slow, wide sweeps. A fully charged smash breaks armour on big enemies and bosses. The air attack bounces everything nearby into the air.

## Enemies

- **Husk** – basic melee.
- **Brute** – armoured; only heavy hits move it until its armour breaks.
- **Stalker** – drops from the ceiling, then dashes through you.
- **Lantern** – hovers out of reach, fires slow orbs and shields one ally with a tether. Slash an orb back to stun it; pistol shots drag it lower.

## Source layout

The game is authored as parts in `src/` and concatenated into the single file `twinfang.html`:

```bash
python build.py
```

Edit the parts, not `twinfang.html`.
## Debugging

Append `?debug` to the URL to keep the canvas readable for screenshots. `window.G`, `window.cam` and `window.step(n, dt)` are exposed for stepping the simulation manually. `devtest.js` is a console harness with a random-input bot that plays through every encounter.
