# Redesign — One Visualizer, Everything Is Search

_2026-07-02. This document supersedes the site plan in [DESIGN.md](DESIGN.md) (§5–§8) and
redirects the project. The conceptual anatomy in DESIGN.md §1–§4 survives; the thesis framing,
the three-act structure, and the visual approach change. Written after the first real-browser
review of the build (findings below) and an interview with the author._

---

## 1. Why a redesign

Two kinds of problems surfaced, and the second is the one that matters.

**The build has visual/structural defects** (first time anyone saw it render):

- Act I's default space reaches **100% of possible cells** — the app's own stats line reads
  "679 of 679 possible cells ever get reached · 0 stay dark forever," directly contradicting
  the hero line "…and most of it never will." "Reveal the unrealized" is a silent no-op.
- The blob is **opaque and fills from the center**, so the fill's first two-thirds happens
  invisibly inside a gray shell; the history gradient and the Family-A "bright core" are
  permanently occluded; the frontier is visible only as light leaking through crevices.
- Act II's carousel is **illegible**: blob diameters (~10–12 units) exceed the 6.5-unit
  spacing, so all six domains interpenetrate into one cloud, with the camera inside it and
  transparent `depthWrite:false` materials producing a milky X-ray wash.
- The sandbox's Impossibility slider barely affects reachability (smooth noise carves
  *connected* voids — 71% impossibility still yields "Blooms · 100% actualized"); only
  Ratchet produces a gradient, with a cliff to "Dies · 0%."
- Smaller: per-act `<Canvas>` teardown loses the WebGL context on every act switch;
  "impossible" vs "not-yet-reached" grays are nearly indistinguishable; the blob overflows
  the viewport; `buildSpace` crashes on an all-impossible space and NaNs when `maxOrder = 0`;
  the design's "persistence tint" channel (§6) was never implemented (`cell.fit` gates the
  BFS but is never rendered).

**The design drifted from the author's intent** (interview, 2026-07-02):

- The intended thesis is **"everything is search"** — the universality claim: *so many
  processes in the universe are the same thing, a search across a space of possibilities.*
  DESIGN.md §7 dropped that framing as "unfalsifiable" and made the deflationary reframe
  ("nothing is searching") the headline. That was over-correction. The repo is named
  `everything-is-search` for a reason.
- The **three-act structure doesn't land** — the author's words: "I don't understand the
  three act approach honestly. A single visualizer that can toggle between systems is the
  right approach."
- The most valuable thing to build toward is **richer dynamics** — a real growth model in
  which bloom / fragment / die genuinely *emerge*, not a decorative BFS replay.
- Primary purpose: **a thinking tool for the author first**, a public interactive essay
  second. Correctness and expressiveness of the model outrank polish.
- Visual direction to explore: **solid transparent volumes** — the author originally
  imagined see-through volumes, tolerated the opaque-cell approach, and wants transparency
  explored now that its cost (invisible interior) is clear.

## 2. The thesis, restored

> **Everything is search.** Evolution, chemistry, technology, minds, markets, stars — the
> same anatomy everywhere: a space of the possible, an adjacency that says what one step is,
> a ratchet that decides what persists, a generativity that decides whether the frontier
> grows, and a vast unrealized remainder.

What makes this substantive rather than vacuous is the **anatomy** — the five lenses of
DESIGN.md §2 survive unchanged as the load-bearing structure. A process is a search exactly
when you can point at its space, its step, and its filter; where you can't (least action),
the site says so out loud. The honesty layer survives and does the falsifiability work that
scared the earlier design away from the thesis.

"Nothing is searching" is demoted from headline to **resolving beat**: after you've seen six
systems run on the same engine, the payoff line is that none of them is *trying* — "aim is
what a filter looks like from inside it." Same insight, correct billing.

The two families (A converges / B blooms) and the nesting ("A tiles B") also survive — but
as **parameter settings of one engine**, which is a stronger form of the argument than
side-by-side exhibits (see §4).

## 3. The product: one visualizer

One screen. One 3D possibility space. One control deck. A **system switcher** across the
top: Physics · Chemistry · Biology · Mind · Society · Cosmos · **Custom**.

- Each system is a **preset of the same knobs** plus its copy (the five lenses, the caveat,
  the scale label). Switching systems re-seeds the same engine with different parameters and
  palette — *that reuse is the argument.* The user watches the identical machinery produce
  settling matter, blooming chemistry, converging protein folds.
- **Custom** is the old sandbox: all knobs unlocked, verdict live. It is not a separate act;
  it is the same deck with the preset lock removed. A "fork this system" affordance turns
  any preset into an editable custom copy — the thinking-tool move: *test whether a
  candidate process fits the anatomy by trying to tune the engine into it.*
- The five-lens panel and the "where this portrait lies" caveat dock beside the canvas
  (current AtlasOverlay, kept nearly as-is — the copy is the best part of the build).
- The thesis line, the legend, the timeline scrubber, and "reveal the unrealized" live on
  the one screen. No acts, no nav shell.
- One persistent `<Canvas>` for the whole app (kills the context-loss bug).

The nesting idea ("descend into a cell") is deferred until the base visualizer is right; when
it returns it should be a real camera push into a cell that re-seeds the engine with the
child preset — one continuous zoom, which is the "zoom is the connective tissue" claim made
literal. Not a crossfade.

## 4. The engine: from BFS replay to a living growth process

Replace the one-shot BFS in `possibilitySpace.js` with a **stepped, stochastic simulation**
that runs live (fixed timestep, deterministic seeded RNG so runs are reproducible and
scrubbable). Cell states: `impossible` · `dark` (possible, unreached) · `frontier`
(adjacent-possible) · `actualized` · `faded` (actualized, then lost — a fossil tint).

Per tick, for each frontier cell: actualize with probability shaped by the knobs; on
actualization, its neighbors join the frontier. Recruitment is **one-shot** — the first time an
actualized cell reaches a never-yet-reached neighbour, that neighbour opens with probability
`generativity`, and that is its only chance; a miss leaves it permanently dark. This is what
makes the "vast unrealized remainder" a *stable* regime rather than an all-or-nothing race
between fizzle and total fill (an earlier retry rule re-rolled every reachable cell until it
opened, so open-ended bloom always saturated — see the implementation note below). The knobs —
same set for every system:

| Knob | What it does mechanically | Anatomy lens |
|---|---|---|
| **Impossibility** | Fraction + granularity of structurally excluded cells. Two components: large connected voids (shape) *and* fine-grained scatter (percolation). The scatter term is what actually strands regions — this fixes the "71% impossible still blooms" failure. | Possibility volume |
| **Reach** | Neighborhood radius of one step. Below ~percolation threshold the fill fragments; above it, it floods. | Adjacency |
| **Ratchet** | Retention: probability an actualized cell *persists* each tick vs fades back to dark. Strict ratchet + low generativity = the fill can genuinely die out — extinction becomes possible, not just slow filling. | Ratchet |
| **Generativity** | The one-shot occupation probability above: each newly-reached cell opens with this chance, once. It behaves like a **site-percolation** knob — low fizzles, a broad middle band spreads but strands a continuous fraction forever (the open-ended unrealized), near 1 saturates. (FADED cells are exempt from one-shot, so the ratchet's churn can re-recruit what already proved reachable.) Literal lattice growth at the rim — Family B's "expanding space" — is deferred; recruitment stands in for it on a fixed lattice. **The most on-thesis knob.** | Generativity |
| **Target pull** | Bias actualization probability by an objective gradient (distance to an optimum, or the `fit` field). At max, the process converges and the frontier dies at the optimum: Family A. At 0: open-ended. **Families become one continuous dial, not two hand-painted color modes.** | (the A/B axis) |

What this buys:

- **Bloom / fragment / die-out / converge are emergent regimes** of five numbers, observable
  live — frontier size over time is the diagnostic (blooming = growing frontier, converged =
  frontier dead at optimum, extinct = frontier dead early, fragmented = multiple disconnected
  frontiers). The verdict logic reads these measurements instead of a reached-fraction with
  hand-tuned cliffs.
- **Every preset is honest.** Physics = high target-pull, low generativity (settles and
  stops). Chemistry/Biology = low pull, high generativity (blooms). The unrealized fraction
  is guaranteed meaningful per-preset because presets are tuned to leave dark volume — the
  thesis-contradicting "679 of 679" class of bug becomes structurally impossible to ship,
  and the live stats line becomes the *evidence*.
- **The timeline scrubber survives**: record per-cell event times (actualized-at, faded-at)
  during the run; scrubbing replays recorded history, exactly as cheap as today.
- `fit` finally renders: **persistence tint** (robust = bright, marginal = dim) on
  actualized cells — DESIGN.md §6's folded-in fitness landscape, implemented.

Engine lives in a pure module (`lib/engine.js`), UI-independent and unit-testable: assert
percolation behavior, extinction under strict ratchet, convergence under target pull —
cheap guards against the "verdict math says bloom but nothing visibly changed" class of bug.

**Implementation note (recruitment, resolved).** The first engine used *retry* recruitment:
every actualization re-rolled each dark neighbour, so the probability a reachable cell ever
opened tended to 1. That made the fill bistable — it either fizzled (subcritical) or filled
~99% of its reachable volume (supercritical), with no stable in-between. So open-ended bloom
always *saturated*, and "reveal the unrealized" was near-empty — the exact thesis-contradicting
failure §1 flagged, reintroduced by the engine's own dynamics. The fix is **one-shot
recruitment** (above): generativity becomes a percolation occupation probability with a smooth
partial-fill band, so a bloom can settle leaving most of the space reachable-but-never-taken.
The verdict logic distinguishes that open-ended remainder (`refused`: reached-adjacent, roll
missed) from fragmentation (`unexposedPossible`: the frontier never arrived, walled off).
`tests/engine.test.js` pins both regimes; `tests/domains.test.js` asserts no preset saturates.

## 5. The visual language: a volume you can see into

Direction chosen to explore first: **solid transparent volume** (author's original instinct).

- **Cells shrink** (scale ~0.15–0.25 at the current lattice pitch, or a denser lattice with
  points/small octahedra). Gaps between cells are what make an interior readable from
  outside; the current 0.4-radius icosahedra form a closed shell.
- **State-dependent opacity, not uniform ghosting**: dark cells nearly invisible (faint dust
  — you should *feel* the unrealized volume, not stare at gray armor); actualized cells
  modest alpha with history/persistence tint; frontier cells opaque, bright, bloom-crossing —
  the only loud thing on screen (per DESIGN §6: stillness everywhere except the rim);
  impossible cells a *visually distinct* texture (darker, desaturated brown-gray, slightly
  larger — pores, not dust) so "can't" reads differently from "never did."
- Additive blending for frontier/actualized against the dark background sidesteps most
  transparency-sorting artifacts; if it still muddles, fall back to `AdditiveBlending` for
  glow layer + alpha-tested solids for history, or a slice/cutaway toggle as a debug-turned-
  feature view.
- **Camera frames the whole blob** with margin (the object is the hero; it must never clip
  into the masthead or hide behind the control deck). Auto-fit on preset switch.
- One blob on screen at a time (the system switcher replaces the carousel — kills the
  interpenetration bug by construction).
- Custom shader material for per-instance opacity if needed (instanced `meshBasicMaterial`
  can't vary alpha per instance; plan for an `InstancedBufferAttribute` + small shader patch,
  or two instanced meshes — solid + additive — with cells assigned by state).
- Fix the visible lattice slice-gap artifact (icosahedron orientation/spacing tuning).

Explicitly deferred: per-domain growth morphologies, real-data embeddings, descend/zoom,
onboarding narrative. All still wanted (HANDOFF list), all downstream of the engine + visual
foundation.

## 6. What survives from the current build

| Keep | Why |
|---|---|
| All overlay copy: five lenses, goals, caveats, scale labels (`lib/domains.js`) | The best material in the repo; slots directly into the side panel |
| `writeCellColor` structure (shared palette-driven coloring) | Extend with opacity + persistence tint rather than rewrite |
| Instancing + non-reactive zustand reads in `useFrame` | Right architecture, keep |
| Raycast click-to-name (`SandboxBlob`) | Works as verified; becomes a core feature — click any cell in any system |
| Timeline scrub / replay / reveal-the-unrealized interactions | Survive unchanged on top of recorded event times |
| `buildSpace`'s blob-shaping (direction-dependent radius, noise voids) | Becomes the space-construction stage of the engine |

## 7. Build plan (each phase verified in a real browser before the next)

**Status (2026-07-02): all four phases built, merged to `main`, pushed.** 15 tests pass. The
per-phase notes below are kept as the record of what each covered.

1. **Engine** ✅ — `lib/engine.js`: stepped stochastic sim, five knobs, event-time recording,
   seeded RNG, regime diagnostics (frontier-size series). Unit tests for the regimes. Landed
   with **one-shot recruitment** (see §4 implementation note).
2. **Visual foundation** ✅ — single persistent Canvas; instanced rendering with per-state
   opacity/blending; camera auto-fit; distinct impossible-vs-dark treatment; persistence
   tint. Verified by frame-pumping + framebuffer readback (hidden-tab preview can't screenshot):
   interior legible mid-fill, frontier reads as the star.
3. **One-screen shell** ✅ — system switcher (started with three: Physics · Biology · Society)
   + custom mode + lens panel + verdict + frontier sparkline; act nav deleted. All six presets
   retuned; `tests/domains.test.js` asserts no preset saturates.
4. **Polish pass** ✅ — thesis "everything is search / nothing is searching" arc woven into the
   verdict lines; settled-look legibility; render perf. Deferred list (six systems, descend-zoom,
   morphologies, real data, permalink) re-ranked in [HANDOFF.md](HANDOFF.md).

## 8. Open questions for the author

- Six systems on the switcher, or start with three sharply-tuned ones (Physics · Biology ·
  Society) and grow the catalog?
- Should "Custom / fork this system" expose the seed + share a permalink (cheap, high value
  for a thinking tool)?
- Frontier-size sparkline on screen (the regime diagnostic made visible) — scientist-mode
  clutter or exactly the point?
