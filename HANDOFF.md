# Handoff — The Space of the Possible

Status notes for picking this back up. For the *why* read [DESIGN.md](DESIGN.md); for *what it
does / how to run it* read [README.md](README.md). This file is the "where we are and what's next."

_Last updated: 2026-07-02._

## Where we are

- All three acts are **built, running, and pushed**: https://github.com/shiftynick/everything-is-search (public, `main`).
- Production build passes. Run locally with `npm install && npm run dev`, then use the nav (top-center) to switch acts.
- The whole thing is one small Vite + react-three-fiber app. No backend, no data files — every blob is generated deterministically in `src/lib/possibilitySpace.js`.

## The idea in one breath

Search isn't a thing hunting a target — it's the **actualization of the adjacent possible**. A
space of what's possible fills in one reachable step at a time; **persistence is the ratchet**
(a filter, not a goal) that decides what stays lit; and most of the space never gets reached.
Two families: **A** (fixed space, real target, *converges*) and **B** (expanding space, no
target, *blooms*). A tiles B — optimization is search seen locally, open-endedness seen globally.

## What's built

- **Act I — Thesis** (`scenes/ActI.jsx`, `components/Blob.jsx`): one possibility blob fills from
  a seed; glowing frontier = adjacent possible; timeline scrubber; Open-ended↔Optimization morph;
  reveal-the-unrealized.
- **Act II — Atlas** (`scenes/ActII.jsx`, `components/DomainBlob.jsx`, `lib/domains.js`): scale-
  ordered carousel of six domains (physics→cosmos) with Family A/B badges and the five-lens
  panel; **Descend into a cell** on a B domain reveals the nested A search.
- **Act III — Sandbox** (`scenes/ActIII.jsx`, `components/SandboxBlob.jsx`): three rules —
  Impossibility / Reach / Ratchet — reshape the space live with a Blooms/Fragments/Dies verdict;
  click a cell to name it.
- Shared: `lib/possibilitySpace.js` (blob + BFS fill, parameterised by `phase/threshold/
  radiusBase/reach/ratchet`), `lib/cellColor.js` (per-cell colouring for all acts).

## Key decisions (the non-obvious reasoning)

- Dropped the slogan **"everything *is* search"** — it's unfalsifiable — for "actualization of the
  adjacent possible," which forbids things (no reachability ⇒ not search).
- **Persistence is a filter, not a goal.** "Aim" is what a filter looks like from inside it.
- Pivoted the visual from a **fitness-landscape ball** to a **possibility blob with a frontier and
  permanent voids** — the space is the hero, not a searcher on it.
- **Two families (A converges / B blooms)** are the organising spine; the nesting ("A tiles B,
  zoom is the connective tissue") is Act II's payoff.
- The sandbox exists so the user **operates the framework**: the three sliders map directly to
  the void threshold, BFS adjacency reach, and a fitness-gated retention (ratchet).
- Least action is flagged as the honest edge case — it's a variational trajectory, not selection.

## Not yet verified (do this first on return)

The dev preview used during the build runs in a **hidden browser tab**, which freezes
`requestAnimationFrame` — so animation never ran and screenshots were impossible there. Verified:
build, mount, WebGL context, DOM/logic, live verdict math, zero console errors. **Not** verified
by eye: actual blob rendering, bloom-glow feel, Act II carousel motion + descend crossfade, and
Act III click-to-name raycast. **→ First task next time: open all three acts in a real browser and
eyeball them.**

## Environment gotchas

- Hidden-tab preview freezes rAF (no animation/screenshots) and sometimes skips the initial
  ResizeObserver — each scene has a one-shot resize nudge on mount to compensate. Keep it.
- `vite.config.js` reads `process.env.PORT` so the preview proxy and dev server agree — don't remove.
- No `gh` CLI on this machine; GitHub push works over **SSH** (authenticates as `shiftynick`).
- Commit identity is set **repo-local** to `shiftynick <shiftynick@gmail.com>` (global git is a work identity).

## Open threads / next steps (roughly prioritised)

1. **Eyeball all three acts in a real browser**; tune look — glow intensity, cell density, blob
   spacing, rotation/auto-rotate balance, descend transition.
2. Add a **LICENSE** (MIT is the usual pick) — repo is public, currently all-rights-reserved by default.
3. Act III opens at a clean 100% bloom; nudge defaults so a little of the **unrealized** shows on
   load, making "reveal" meaningful immediately.
4. Swap one blob for a **real-data embedding** (chemical / protein / latent space) to earn its shape.
5. Act II descend → a **real camera push-in** (currently a crossfade); per-domain **growth
   morphologies** (dendritic, reaction-diffusion, branching).
6. **Onboarding / transitions** between acts; a short guided narrative or landing/intro.
7. Represent the **static-stability vs dynamic-persistence** distinction from the design convo
   (attractor geometry: point vs limit-cycle vs manifold) — discussed, not yet built.
8. Perf: code-split three.js if the ~1 MB bundle starts to matter.

## Resume checklist

```bash
cd /n/everything-is-search   # or wherever it's cloned
npm install
npm run dev                  # open the printed localhost URL; nav switches acts
```
