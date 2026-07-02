# Handoff — The Space of the Possible

Where things stand and what's next. For *what it is / how to run it* read [README.md](README.md);
for the *architecture + plan* read [REDESIGN.md](REDESIGN.md); for the *conceptual anatomy* read
[DESIGN.md](DESIGN.md).

_Last updated: 2026-07-02 (redesign built, merged to `main`, pushed)._

## Where we are

The **[REDESIGN.md](REDESIGN.md) plan is fully built and on `main`** (pushed to
https://github.com/shiftynick/everything-is-search). The three-act site was replaced by **one
screen**: a single possibility space driven by one engine, with a system switcher across the top.

- `npm install && npm run dev`, then use the switcher (top-centre) to change systems.
- `npm test` — 15 tests pass (engine regimes + domain-preset guards). `npm run build` passes.
- Still one small Vite + react-three-fiber app, no backend. Every blob is generated
  deterministically by `src/lib/engine.js` from a seed + five knobs.

## The idea in one breath

**Everything is search.** A space of the possible fills itself in one adjacent step at a time;
**persistence is the ratchet** (a filter, not a goal) that decides what stays; and most of the
space never gets reached. Two families — **A** (target pull → *converges*) and **B** (no target
→ *blooms*) — are settings of one dial, not separate exhibits. The resolving beat: none of them
is *trying* — aim is what a filter looks like from inside it.

## What's built (the redesign, 4 commits)

1. **Engine** (`lib/engine.js`) — stepped stochastic growth, five knobs (impossibility / reach /
   ratchet / generativity / targetPull), event log for scrub-replay, emergent verdicts
   (blooming / converged / fragmented / died / saturated). Uses **one-shot recruitment** (see
   Key decisions).
2. **Presets** (`lib/domains.js`) — six systems tuned to the new knobs via a `knobs` field;
   `tests/domains.test.js` asserts **no preset saturates** and the A/B families are real.
3. **Shell** (`scenes/SearchScene.jsx`, `components/EngineBlob.jsx`, `lib/renderCell.js`) — the
   one-screen visualizer: switcher (Physics · Biology · Society · Custom), lens panel + A/B
   badge + caveat + Fork-to-Custom, Custom knob sliders, live verdict, stats line, frontier
   sparkline, camera auto-fit, bloom. `App.jsx` renders only this (act nav deleted).
4. **Polish** — perf (skip repaint when idle; matrix rewrite only on scale change), settled-look
   legibility, thesis copy woven into the verdict lines, REDESIGN §4 synced to the code.

## Key decisions (the non-obvious reasoning)

- **One-shot recruitment.** The first engine re-rolled every dark neighbour on each adjacent
  actualization, so reachable cells always eventually opened → the fill was bistable (fizzle vs
  ~99% saturate), and open-ended bloom could never leave a stable remainder. Now a DARK cell
  gets ONE generativity roll on first contact; a miss is permanently dark. Generativity became a
  percolation knob with a smooth partial-fill band. (FADED cells are exempt, so ratchet churn
  survives.) The verdict logic tells the open-ended remainder (`stats.refused`) from
  fragmentation (`stats.unexposedPossible`).
- **"Everything is search" restored** as the thesis (universality); **"nothing is searching"**
  demoted to a resolving beat, now delivered by the *converged* verdict line where it lands
  hardest.
- **See-through instanced volume.** Per-instance colour via `instanceColor`, per-instance alpha
  via a custom `aAlpha` attribute + a small shader patch. Do **not** set `vertexColors` on the
  material — it switches on the per-vertex `color` path the icosahedron lacks and blacks out
  every cell (the bug that made the whole blob invisible before this session).
- Least action stays flagged as the honest edge case — a variational trajectory, not selection
  (the "where this portrait bends" caveat on Physics).

## Environment gotchas (still true)

- **Hidden-tab preview freezes `requestAnimationFrame`**, so live screenshots are impossible and
  the initial `ResizeObserver` can be skipped (SearchScene does a one-shot resize nudge on mount —
  keep it). Verification trick: `EngineBlob` exposes `window.__blob` in DEV; get the r3f store
  via `window.__blob.__r3f.root.getState()`, override `st.clock.getDelta`, pump `st.advance(ts)`
  in a loop, and read pixels with `gl.getContext().readPixels` (render + read in the SAME eval —
  the drawing buffer clears between calls). A real `preview_resize` fires the ResizeObserver so
  r3f commits its first frame.
- `vite.config.js` reads `process.env.PORT` so the preview proxy and dev server agree — keep it.
- No `gh` CLI; GitHub over **SSH** (authenticates as `shiftynick`). Commit identity is set
  **repo-local** to `shiftynick <shiftynick@gmail.com>` (global git is a work identity).

## Next (all deferred, author's call)

1. Grow the catalog from **three systems to six** — Chemistry / Mind / Cosmos presets are
   already tuned in `domains.js`; they just need adding to `SYSTEM_IDS` in `SearchScene.jsx`.
2. **Descend into a cell** → a real camera push that re-seeds the engine with a child preset
   (the "zoom is the connective tissue" claim made literal). Not a crossfade.
3. Per-domain **growth morphologies** (dendritic, reaction-diffusion, branching).
4. A **real-data embedding** (chemical / protein / latent space) to earn a blob's shape.
5. **Permalink / seed sharing** for Custom (URL-encoded knobs + seed).
6. Add a **LICENSE** — repo is public, currently all-rights-reserved by default (MIT is the usual pick).
7. **Delete the legacy files** once their keepers are folded in — `scenes/ActI|II|III.jsx`,
   `components/Blob|DomainBlob|SandboxBlob|*Overlay.jsx`, `lib/possibilitySpace.js`, `store.js`
   are unreferenced (nothing imports them; `App.jsx` renders only the shell).
8. Perf: code-split three.js if the ~1 MB bundle starts to matter.

## Resume checklist

```bash
cd /n/everything-is-search   # or wherever it's cloned
npm install
npm test                     # 15 pass
npm run dev                  # open the printed localhost URL; switcher changes systems
```
