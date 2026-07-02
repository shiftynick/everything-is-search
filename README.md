# Everything is search — The Space of the Possible

A react-three-fiber visualizer for one idea: **so many processes in the universe are the same
thing — a search across a space of possibilities.** Evolution, chemistry, a mind, a market, a
star: a space of the possible, an adjacency that says what one step is, a ratchet that decides
what persists, a generativity that decides whether the frontier grows, and a vast unrealized
remainder.

One screen, one 3D possibility space, one engine. A **system switcher** re-seeds the *same*
engine with a different preset — that reuse is the argument. And none of the systems is
*trying*: aim is what a filter looks like from inside it.

> Live thesis, plan, and history: **[REDESIGN.md](REDESIGN.md)** (current architecture + build
> plan), **[DESIGN.md](DESIGN.md)** (the conceptual anatomy — the five lenses), and
> **[HANDOFF.md](HANDOFF.md)** (where things stand / what's next).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # node --test — engine + domain-preset regime guards
npm run build    # static bundle to dist/
npm run preview  # serve the built bundle
```

## What's on the screen

- **System switcher** (top): **Physics · Biology · Society · Custom**. Each system is a preset
  of the same engine plus its copy (the five lenses, the caveat, the scale label). Physics is
  the Family-A anchor — it *converges*; the rest are Family B — they *bloom*.
- **The blob** — a see-through instanced volume. Dark cells are near-invisible dust (the
  unrealized you should feel, not stare at); actualized cells are translucent history with a
  persistence tint; the frontier is the one loud, bloom-bright thing; impossible cells are a
  distinct dim "pore".
- **Lens panel** (right): the five-lens reading of the current system + an A/B family badge and
  a "where this portrait bends" caveat. **Fork to Custom** turns any preset into an editable copy.
- **Custom mode**: the five knobs as live sliders — the space re-simulates as you drag.
- **Playback deck** (bottom): Replay / Play-Pause / a timeline scrubber / **Reveal the
  unrealized**, plus a live **verdict**, a stats-as-evidence line, and a **frontier-size
  sparkline** (the regime made visible — a bloom rises then decays; a converged climb is a low
  flat line).

## How it works

- **`src/lib/engine.js`** — the engine. A stepped, stochastic growth process over a possibility
  space, deterministic for a given `(opts, seed)`. Five knobs, all 0..1:
  - **impossibility** — fraction + granularity of structurally excluded cells (smooth voids +
    fine percolation scatter).
  - **reach** — neighbourhood radius of one step.
  - **ratchet** — selectivity of persistence: actualized cells fade back out, sheltered by fitness.
  - **generativity** — a **one-shot** recruitment probability: the first time an actualized cell
    reaches a never-yet-reached neighbour, that neighbour opens with this chance — its *only*
    chance. A miss leaves it permanently dark. This makes generativity a site-percolation knob,
    so a bloom can settle leaving most of the space reachable-but-never-taken (not the old
    all-or-nothing fizzle-vs-saturate).
  - **targetPull** — bias toward an objective; at max the process is a hill-climber that
    converges (Family A). At 0 it is open-ended (Family B).

  Bloom / converge / fragment / die / saturate are **emergent verdicts** read from the run's
  diagnostics, not the knobs. Every state transition is recorded as an event, so the timeline
  scrubber replays history instead of recomputing it.
- **`src/lib/renderCell.js`** — per-cell colour **and** alpha for the engine's states (the
  see-through look).
- **`src/components/EngineBlob.jsx`** — one `InstancedMesh` for every cell; per-instance colour
  via `instanceColor` and per-instance alpha via a custom `aAlpha` attribute + a small
  `meshBasicMaterial` shader patch. Runs the sim, scrubs it live from the shared playhead.
- **`src/scenes/SearchScene.jsx`** — the one-screen shell: switcher, panels, playback, verdict,
  sparkline, camera auto-fit, bloom post-processing.
- **`src/lib/domains.js`** — the systems: each carries a `knobs` preset (tuned so **no preset
  saturates** — the unrealized always stays visible), a palette, and the lens copy.

## Layout

```
src/
  App.jsx                  # renders the shell (that's the whole app now)
  scenes/SearchScene.jsx   # the one-screen visualizer
  components/EngineBlob.jsx# the instanced see-through volume
  lib/engine.js            # the growth engine (five knobs, event log, verdicts)
  lib/renderCell.js        # per-state colour + alpha
  lib/domains.js           # the systems (knob presets + palettes + copy)
  lib/cellColor.js         # shared palette + legacy colouring
  styles.css
tests/
  engine.test.js           # regime guards: bloom / converge / fragment / die / saturate
  domains.test.js          # every preset leaves an honest remainder; A/B families are real
```

**Legacy (unreferenced):** the earlier three-act build — `scenes/ActI|II|III.jsx`,
`components/Blob|DomainBlob|SandboxBlob|*Overlay.jsx`, `lib/possibilitySpace.js`, `store.js` —
still sits in the repo but nothing imports it. It is kept only until its keepers (the atlas
overlay copy, the click-to-name raycast) are folded into the shell; safe to delete otherwise.

## Next (deferred)

Grow the catalog from three systems to six (Chemistry / Mind / Cosmos presets are already tuned
in `domains.js`); a real camera push on "descend into a cell"; per-domain growth morphologies;
a real-data embedding to earn a blob's shape; permalink/seed sharing. See
[HANDOFF.md](HANDOFF.md) and [REDESIGN.md](REDESIGN.md) §5–§8.
