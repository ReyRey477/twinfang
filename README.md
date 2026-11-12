# TWINFANG

A short character-action prototype: one corridor, two blades, a handful of enemies. Runs in the browser with Three.js; all models, animation and audio are procedural.

## Play

Open `twinfang.html` in a desktop browser (needs an internet connection for Three.js and fonts).

## Controls

| Input | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Camera |
| Left click / J | Slash — chain up to four, or pause after the second for a flurry |
| Right click / K | Launcher (hold to follow); in the air: plunge |
| E | Rush thrust |
| Space | Jump, double jump |
| Shift / L | Dodge — dodge at the last instant to slow time |
| Q | Lock-on |
| R | Restart after the results or defeat screen |

A gamepad also works.

## Debugging

Append `?debug` to the URL to keep the canvas readable for screenshots. `window.G`, `window.cam` and `window.step(n, dt)` are exposed for stepping the simulation manually.
