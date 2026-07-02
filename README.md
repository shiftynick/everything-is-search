# The Space of the Possible — Act I hero

A react-three-fiber build of the site. Switch acts with the nav at the top.

- **Act I · Thesis** — a single 3D **possibility blob** that fills itself in from a seed, one
  adjacent step at a time. The glowing rim is the *adjacent possible*; teal cells are
  *actualized*; dark pockets are either *impossible* or *possible-but-never-reached*. A
  timeline scrubber and an Open-ended↔Optimization morph drive it.
- **Act II · Atlas** — a scale-ordered carousel of six domain search-spaces (physics →
  cosmos), each its own blob with a Family A/B badge and the five-lens anatomy. **Descend
  into a cell** on any open-ended (B) domain to reveal the converging (A) optimisation
  nested inside it — the "A tiles B" thesis, made literal.
- **Act III · Sandbox** — you author a possibility space with three rules —
  **Impossibility** (how much can't exist), **Reach** (how far one step travels), and
  **Ratchet** (how selective persistence is) — and watch the same dynamics *bloom* to fill
  it or *die* to a core, with a live verdict. Click any cell to name it: actualized,
  impossible, or the unrealized.

See [DESIGN.md](DESIGN.md) for the full concept and site plan, and [HANDOFF.md](HANDOFF.md) for
current status, decisions, and next steps.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a static bundle:

```bash
npm run build
npm run preview
```

## Controls

- **Replay / Play / Pause / timeline** — scrub the fill (the BFS arrival order).
- **Open-ended ↔ Optimization** — morph the *same* blob between the two families:
  open-ended *blooms* (history + a living frontier, pockets left dark) and optimization
  *converges* (brightness collapses toward the central optimum, the frontier dies).
- **Reveal the unrealized** — light up the possible cells the fill never reached.
- Drag to orbit; scroll to zoom.

## How it works

- `src/lib/possibilitySpace.js` — builds a lattice culled to an irregular blob, marks some
  cells impossible, and BFS-floods from a central seed. Each cell's `order` is its
  actualization time; unreached cells keep `order = Infinity`.
- `src/components/Blob.jsx` — one `InstancedMesh` for every cell; per-frame per-instance
  colour driven by the timeline `t`, the family `mode`, and the `reveal` flag.
- Bloom (`@react-three/postprocessing`) makes the bright frontier cells glow.

## Layout

- `src/App.jsx` — nav shell switching between the two acts.
- `src/scenes/ActI.jsx`, `src/scenes/ActII.jsx` — the two acts.
- `src/lib/possibilitySpace.js` — the blob + BFS fill (parameterised per domain).
- `src/lib/cellColor.js` — shared per-cell colouring for both acts.
- `src/lib/domains.js` — the six atlas exhibits (families, five lenses, nesting notes).
- `src/components/Blob.jsx` (Act I), `DomainBlob.jsx` (Act II) — the instanced meshes.

## Next

- Swap one blob for a real-data embedding (chemical or latent space) to earn the shape.
- True camera fly-through on descend in Act II (currently a crossfade); distinct growth
  morphologies per domain (dendritic, reaction-diffusion, branching).
- Onboarding / transitions between the three acts; a short guided narrative.
