export const meta = {
  name: 'twinfang-visual-round',
  description: 'One improvement round for TWINFANG graphics: independent critics rate the captured pictures, then fixers improve characters and combat effects / HUD in separate worktrees',
  phases: [
    { title: 'Critique', detail: 'one art-director agent per track rates the review pictures' },
    { title: 'Improve', detail: 'one engineer per track fixes the top findings in its own worktree' },
  ],
}

// args: { round, dir (the picture set from tools/review.py), base (commit the engineers start from), prevFile (round<N-1>.json
// written by tools/review_round.py, or null), critiqueOnly (true = score only, change nothing), repo (checkout root) }
const { round, dir, base, prevFile, critiqueOnly } = args
const REPO = args.repo || 'G:/AI/twinfang'
const REFS = REPO + '/references'

const TRACKS = [
  {
    key: 'char',
    title: 'CHARACTERS',
    look: `every picture whose group is "char" (30 pictures: the hero with each weapon set, Husk, Brute, Stalker, Gatewarden armoured and shed, Lantern and Stormvane in several states, a cast line-up), plus any 4 "fx" pictures to see how the characters read in real play lighting and at real game distance`,
    refs: `The owner's ten reference images are in ${REFS} (jpg). Read all of them. How they map: the slim white androids, the black armoured suit and the dark winged swordsman are the hero (and the Stalker for the dark winged one); the heavy green mech is the Brute; the General-Grievous-like droid is the Husk and the Gatewarden; the six-armed floating figure is the Lantern; the mechanical birds are the Stormvane boss.`,
    dims: [
      ['silhouette', 'distinct, readable shapes at game distance; each character instantly told apart'],
      ['proportion', 'proportions and anatomy of the machine bodies; elegance or menace as intended; nothing stubby, floating or tube-like'],
      ['surface_detail', 'secondary and tertiary forms: plate breaks, panel lines, vents, pistons, cables, bolts, layered armour; not smooth blobs or bare primitives'],
      ['materials_lighting', 'material separation (paint vs bare metal vs rubber vs glow), highlights, wear, emissive accents, how light describes the form'],
      ['cohesion', 'do they belong to one world, and do they live up to the owner\'s references'],
      ['hero_appeal', 'is the hero a character you want to play: iconic head, strong back view (the camera sits behind them), weapons that look deadly'],
    ],
    scope: `geometry assembled in code from primitives, bevelled plates and lofted shells (stacked superellipse rings); proportions; procedural PBR materials (colour, roughness, metalness, procedural wear, emissive); glow strips; per-character accent lights; poses. There are no imported meshes and no painted textures, so "add a hand-painted texture" is not actionable, while "the chest is one smooth shell: split it into three overlapping plates with a dark 1 cm seam and add two vents under the collar" is.`,
    files: `src/07-rig.js (rig, the loft() kit, and the models of hero, Husk, Brute, Stalker, Gatewarden), src/10-data.js (the character material definitions near the top ONLY; leave moves and encounters alone), src/04-textures.js (procedural material sets), the model-building and part-animation code of src/11b-lantern.js and src/11d-stormvane.js (they have their own small modelling kit, LN_/SV_ names, at the top of 11b-lantern.js), and, for standing poses only, the IDLE / E_IDLE poses in src/08-clips.js and the STANCE table in src/08b-clips2.js (how a body stands and holds its weapon at rest; never the timing or the keys of an attack clip)`,
    notFiles: `src/06-fx.js, src/06b-fx2.js, src/00-head.html, src/03-renderer.js, src/13-camera.js, src/14-game.js, src/12-player.js, src/11-enemy.js, src/11c-warden.js (another engineer is changing combat effects, post-processing and the HUD there right now), and any line that calls fx.*, sfx.* or G.msg`,
    tools: `node tools/run.mjs tools/s_show.mjs --w 900 --h 900 --kinds "hero:25:d=2.6;h=1.05,hero:205:d=2.6;h=1.05,husk:25:d=2.9;h=1.1;clip=eIdle"   (kind:angle:options; kinds hero husk brute stalker lantern warden storm all; options d distance, h height, clip, t, set=0..2), node tools/run.mjs tools/s_poses.mjs (hero stepped to clip times with each weapon set), node tools/run.mjs tools/s_states.mjs (Lantern and Stormvane forced into each state; read its header), node tools/run.mjs tools/s_grip.mjs (must show no new JUMP lines if you touch the rig), then python tools/sheet.py <prefix> <columns> <scale> to tile shots (show_*, pose_*, state_*) into one sheet you can read cheaply`,
  },
  {
    key: 'fx',
    title: 'COMBAT EFFECTS, SCREEN TREATMENT AND HUD',
    look: `every picture whose group is "fx" (about 40 combat moments caught as they happen: hits, heavy hits, pistol shots, ground impacts, enemy warning flares, deaths, finishers, slow motion, dodges, orbs, spawns, barriers, boss roars, lightning) and every picture whose group is "hud" (title screen, idle, combat with style rank and combo, boss bar, low health, defeat, results)`,
    refs: `There are no reference images for this track; your bar is the combat feedback and interface of Devil May Cry 5 and Metal Gear Rising: Revengeance: hits that feel heavy and sharp without hiding the action, readable enemy tells, stylish but disciplined screen effects, a HUD with confident typography and a style meter with real flair.`,
    dims: [
      ['hit_impact', 'do hits look heavy and sharp: spark shapes, directional streaks, hit-stop frame, shock rings, debris'],
      ['readability', 'can you always tell what is happening: is the hero visible, are enemy warning flares unmistakable, is the screen ever washed out or cluttered'],
      ['effect_quality', 'shape language, colour discipline and layering of sparks, trails, rings, smoke, flashes, tracers, orbs, barriers, lightning'],
      ['post_processing', 'bloom, exposure, tone mapping and colour grade: highlights that glow without blowing out, contrast, slow-motion and damage treatments'],
      ['hud_design', 'layout, typography, hierarchy, spacing and polish of the in-play interface'],
      ['hud_feedback', 'do vitality, style rank, combo counter, weapon selector, lock-on and boss bar convey state with flair'],
      ['screens', 'title, defeat and results screens: composition, typography, mood'],
    ],
    scope: `sprite and particle effects (sparks, flares, glows, embers, smoke puffs), ribbon trails, ground rings and marks, flashes and pooled lights, shockwaves, wreckage, tracers, lightning, camera shake and FOV kicks, hit-stop and slow-motion screen treatment, the post chain (ambient occlusion, bloom strength / threshold / radius, lens effects, tone map, grade, vignette, chromatic aberration), and the HUD and menu screens, which are plain HTML and CSS over the canvas (fonts come from Google Fonts: Cinzel and Rajdhani are loaded). No image or audio files may be added.`,
    files: `src/06-fx.js and src/06b-fx2.js (effects), src/03-renderer.js (post chain), src/13-camera.js, src/00-head.html (all HUD and screen markup and CSS), src/14-game.js (game loop, HUD updates, hit and finisher feedback), and the lines in src/12-player.js, src/11-enemy.js, src/11c-warden.js, src/11b-lantern.js, src/11d-stormvane.js and src/05-world.js that spawn effects or drive telegraph glow (keep edits to those files surgical: change the effect calls, nothing else)`,
    notFiles: `src/07-rig.js, src/10-data.js, src/04-textures.js and the model-building code of src/11b-lantern.js and src/11d-stormvane.js (another engineer is rebuilding character detail there right now), src/02-audio.js, src/08-clips.js, src/08b-clips2.js`,
    tools: `python tools/review.py mine  (re-shoots the WHOLE review set, about 4 minutes, into tools/shots/review/mine; use it at the end and at most once or twice in between), node tools/run.mjs tools/s_scenes.mjs --w 1280 --h 720 --only corfight,warden,roomAfight,storm (fixed in-game views), and your own short scenario files for staging one effect: a scenario is "export default async ({page, shot, ev, log}) => {...}" run with "node tools/run.mjs path/to/file.mjs --w 1280 --h 720"; inside ev(() => ...) the page offers G (game; G.update(1/60) steps it), HX (harness: HX.begin(), HX.hud(true|false), HX.tp(x,y,z,yaw), HX.view(camX,camY,camZ,lookX,lookY,lookZ), HX.free(), HX.render()), cam, fx, sfx, onAction('light'|'heavy'|'rush'|'dodge'|'jump'|'w0'|'w1'|'w2'), DBG ({ENCS, LOCKS, door, CL, MOVES, keys, held, walkable}) and T3 ({scene, camera, renderer, bloom}); read tools/s_review.mjs for a worked example that plays the game with a bot and photographs events. Then python tools/sheet.py <prefix> <columns> <scale> [dir] tiles shots into one sheet you can read cheaply`,
  },
]

const CRITIQUE = {
  type: 'object',
  properties: {
    scores: { type: 'array', items: { type: 'object', properties: { dimension: { type: 'string' }, score: { type: 'number' }, reason: { type: 'string' } }, required: ['dimension', 'score', 'reason'] } },
    findings: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, subject: { type: 'string' },
      pictures: { type: 'array', items: { type: 'string' } }, problem: { type: 'string' }, suggestion: { type: 'string' } },
      required: ['id', 'severity', 'subject', 'pictures', 'problem', 'suggestion'] } },
    previous: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, verdict: { type: 'string', enum: ['fixed', 'improved', 'unchanged', 'worse'] }, note: { type: 'string' } }, required: ['id', 'verdict', 'note'] } },
    keep: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['scores', 'findings', 'keep', 'summary'],
}

const REPORT = {
  type: 'object',
  properties: {
    branch: { type: 'string' }, commit: { type: 'string' }, worktree: { type: 'string' },
    addressed: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, change: { type: 'string' }, files: { type: 'string' } }, required: ['id', 'change'] } },
    skipped: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] } },
    checks: { type: 'string' }, perf: { type: 'string' }, notes: { type: 'string' },
  },
  required: ['branch', 'commit', 'worktree', 'addressed', 'skipped', 'checks', 'notes'],
}

const criticPrompt = t => `You are a senior art director reviewing TWINFANG before a public demo. It is a third-person character-action game that runs in the browser (Three.js). Everything in it is generated by code. The owner's stated bar is Devil May Cry 5 and Metal Gear Rising: Revengeance; they said the game "looks better than before, but is still lacking".

This pass covers one track only: ${t.title}. This is review round ${round}.

WHAT TO LOOK AT
- Pictures: ${dir} . First Read manifest.json there: it lists every picture with its group and a caption saying what it shows. Then Read ${t.look}. The pictures are 1280x720 PNG files; look at each one properly before judging.
- ${t.refs}
- Judge only what is on screen. Do not read source code, do not run anything, do not edit anything.

HOW TO JUDGE
Be demanding, concrete and fair, the way an art director is when the work is about to be shown. Say what you see (shape, proportion, material, colour, light, motion cues, layout, type), where (file name and which part of the frame), and why it reads as cheap, unclear or unfinished next to the bar. Do not praise by default and do not pile on: a finding earns its place by how much fixing it would raise the picture.

Every finding must be actionable by an engineer who can only change code. What can be changed: ${t.scope}

Score each of these dimensions from 0 to 10, where 10 would hold up next to the bar, 5 is an acceptable indie prototype and 3 is programmer art:
${t.dims.map(d => `- ${d[0]}: ${d[1]}`).join('\n')}

RETURN
- scores: one entry per dimension above (use exactly those dimension names), with a one-sentence reason.
- findings: at most 12, most important first. id: a short stable slug (for example "hero-back-flat"). severity: critical (undermines the whole picture), major, or minor. subject: what it is about. pictures: the file names that show it. problem: what is wrong and why it matters. suggestion: a specific change, in terms of what can be changed above, with numbers or part names where you can.
- keep: up to 6 things that work and must not be lost.
- summary: at most 120 words, the overall verdict.
${prevFile ? `
PREVIOUS ROUND
Form your own view from the pictures first. Then Read ${prevFile} (JSON). Under the key "${t.key}" it holds the previous round: "critique" (its scores and findings) and "fix" (what the engineer reported: addressed, skipped, notes). Check every previous finding against the new pictures and return one "previous" entry per finding with a verdict (fixed, improved, unchanged, worse) and a short note. A previous finding that is still a problem must also appear in your new findings under the same id. Score on the same scale as the previous round so the numbers can be compared: do not raise a score because work was done, only because the picture is better, and lower it if something got worse.` : ''}`

const fixerPrompt = (t, crit) => `You are a senior graphics engineer on TWINFANG, a third-person character-action game that runs in the browser (Three.js r160, one built file twinfang.html, authored as parts in src/ and concatenated by "python build.py"). Everything is generated by code: models, materials, effects, audio. An art director has just reviewed the game (round ${round}) and your job is to fix what they found in one track: ${t.title}.

SET UP (do this first, in your working directory, which is your own git worktree of the repository)
1. Run: git reset --hard ${base}     (the worktree may have been cut from an older commit; ${base} is the current work). Check with: git log --oneline -1
2. Before every tool run in a shell: export THREE_DIR="${REPO}/node_modules/three" PW_MODULES="${REPO}/node_modules/"
3. Read README.md and HANDOFF.md (source layout, developer harness, how weapons are held, the shader rule, working rules) and tools/README.md (test scripts). The source is dense, one long statement per line: search with Grep and read the parts you need.

THE REVIEW
The pictures the art director judged are in ${dir} (manifest.json lists them with captions; the interface pictures now show the real web fonts). Look at the ones each finding names before you change anything.${t.key === 'char' ? ` The owner's reference images are in ${REFS}; read them.` : ''}
Scores: ${JSON.stringify(crit.scores)}
Findings, most important first: ${JSON.stringify(crit.findings)}
Keep (do not lose these): ${JSON.stringify(crit.keep)}
Summary: ${crit.summary}

${prevFile ? `EARLIER ROUNDS\nThis is not the first round. ${prevFile} holds the previous round under the key "${t.key}": what was found and what the last engineer changed, skipped and noted. Read it so you build on that work instead of undoing it.\n\n` : ''}WHAT TO DO
Work through the findings in order, critical and major first. For each: make the change, run "python build.py", photograph the result, look at it, and iterate until it is clearly better than the picture the finding names. Aim to finish at least the top five; a finished, verified subset beats an unfinished whole, so do not start a finding you cannot complete and check. If a suggestion is wrong or not worth its cost, do what serves the picture and say why. You may improve things the review did not name when you see them, inside your files.

Your files: ${t.files}.
Not yours, do not edit: ${t.notFiles}.

How to see your work (the tools run a headless Edge on the real GPU, an RTX 4070 SUPER through Direct3D): ${t.tools}. Screenshots go to tools/shots/ (git-ignored). Read the PNGs you produce; never judge a change you have not looked at.

RULES
- Visual changes only. Do not change gameplay: move timings, damage, hit ranges, enemy behaviour, collision (AREAS), encounter data, input.
- Enemy warning flares and the hero must stay clearly readable; never trade readability for spectacle.
- Performance: the game may spend up to 16 ms per frame at 1920x1080 in total, and another engineer is spending part of that at the same time. Keep the worst scene of "node tools/run.mjs tools/s_perf.mjs --w 1920 --h 1080" under 11 ms (it is 4 to 7.5 ms now). Its numbers are noisy while other tools run; repeat it if it looks off. Merge static geometry per moving part and material; do not add one mesh per small detail.
- Shader rule (README): clamp before pow, sqrt, normalize and division in any shader you write; a single invalid pixel is smeared into a black block by bloom.
- No asset files. Keep the code in the style of the files you touch (compact, a short comment where the intent is not obvious). Do not bump BUILD, do not edit twinfang.html by hand, do not touch README or HANDOFF, never push.

BEFORE YOU FINISH
1. python build.py, then these must pass: "node tools/run.mjs tools/s_bot.mjs" (ends RUN COMPLETE, errors: 0), "node tools/run.mjs tools/s_nan.mjs" (NAN CHECK PASSED), "node tools/run.mjs tools/s_ctx.mjs" (every line: invalid px raw 0 final 0)${t.key === 'char' ? ', and "node tools/run.mjs tools/s_grip.mjs" (no JUMP lines beyond the 14 borderline ones that exist today, none above 0.8)' : ''}. Run s_perf and note the worst scene.
2. Delete any throwaway scenario files you wrote. Commit on your worktree's branch only files under src/ (and tools/ if you added a tool worth keeping), NOT twinfang.html, with a message that says what changed and ends with the line: Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
3. Return the report: branch (git rev-parse --abbrev-ref HEAD), commit (short hash), worktree (absolute path), addressed (finding id, what you changed, which files), skipped (finding id and the honest reason), checks (the result of each check above, as it printed), perf (worst scene and its ms), notes (anything the next reviewer or the person merging should know, including anything that still looks weak).`

const results = await pipeline(
  TRACKS,
  t => agent(criticPrompt(t), { label: `critic:${t.key}`, phase: 'Critique', schema: CRITIQUE }),
  (crit, t) => {
    if (!crit) return null
    if (critiqueOnly) return { track: t.key, critique: crit, fix: null }
    return agent(fixerPrompt(t, crit), { label: `fix:${t.key}`, phase: 'Improve', schema: REPORT, isolation: 'worktree' })
      .then(fix => ({ track: t.key, critique: crit, fix }))
  }
)
return { round, results: results.filter(Boolean) }
