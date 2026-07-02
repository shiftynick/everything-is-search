// The search engine: a stepped, stochastic growth process over a possibility space.
//
// This replaces the one-shot BFS of possibilitySpace.js (kept for the legacy scenes until
// Phase 2). One engine, five knobs, every system a preset — see REDESIGN.md §4.
//
//   impossibility — fraction + granularity of structurally excluded cells. Two components:
//                   large smooth voids (shape) and fine scatter (percolation). The scatter
//                   is what actually strands regions.
//   reach         — neighbourhood radius of one step (0 → 6-face neighbours, 1 → radius 2.5).
//   ratchet       — selectivity of persistence: per-tick probability an actualized cell
//                   fades back out, weighted against its fitness. Fading retracts support:
//                   frontier cells with no remaining actualized neighbour drop back to dark.
//   generativity  — branching feedback: the first time an actualized cell reaches a never-yet-
//                   reached neighbour, that neighbour joins the frontier with this probability
//                   — and it is the neighbour's ONE chance (one-shot recruitment). A miss leaves
//                   it permanently dark. So generativity behaves like a site-percolation
//                   occupation probability: low → the fill fizzles; a broad middle band → the
//                   fill spreads but strands a continuous fraction forever (the open-ended
//                   unrealized); near 1 → it takes almost every step and saturates. (FADED cells
//                   are exempt from one-shot: the ratchet's churn can re-recruit what already
//                   proved reachable.) At 0 nothing ever opens.
//   targetPull    — bias toward an objective: cells that improve on the best distance-to-
//                   optimum actualize normally, non-improving cells are suppressed by
//                   (1 - pull)^3. At 1 the process is a strict hill-climber that stalls
//                   (converges) once nothing improves.
//
// All five knobs are 0..1. The run is deterministic for a given (opts, seed): mulberry32
// RNG, stable iteration order. Every state transition is recorded as an event, so the
// timeline scrubber replays history instead of recomputing it (see replayStates).
//
// Future (deferred, see REDESIGN.md §4): generativity as literal space growth — the lattice
// expanding at the rim — rather than recruitment probability.

export const STATE = {
  IMPOSSIBLE: 0,
  DARK: 1, // possible, unreached
  FRONTIER: 2, // adjacent possible: dark, opened by a neighbouring actualization
  ACTUALIZED: 3,
  FADED: 4, // was actualized, lost to the ratchet; re-actualizable
}

// Event kinds (event = { t, i, k }):
//   'A' actualized   'F' faded   'O' opened (dark/faded -> frontier)   'C' closed (frontier -> dark)
export const EVENT = { ACTUALIZE: 'A', FADE: 'F', OPEN: 'O', CLOSE: 'C' }

export const VERDICT = {
  BLOOMING: 'blooming', // horizon hit while the fill is still actively spreading
  CONVERGED: 'converged', // optimum reached and activity suppressed to (near) zero
  DIED: 'died', // frontier extinguished with reachable dark left, or everything faded
  FRAGMENTED: 'fragmented', // sealed off: filled its pocket, the rest is unreachable
  SATURATED: 'saturated', // filled (nearly) everything possible
}

const BASE_RATE = 0.35 // per-tick actualization probability of an unbiased frontier cell
const FADE_RATE = 0.22 // fade probability scale at ratchet = 1 for a zero-fitness cell
const FIT_SHELTER = 0.85 // how much high fitness shelters a cell from fading
const STALL_TICKS = 40 // ticks without an actualization before the run is declared stalled
const SATURATED_FRAC = 0.85
const CONVERGE_WINDOW = 50 // trailing window for the convergence activity check

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// Deterministic small PRNG (mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Smooth deterministic fields (same family as possibilitySpace.js so blob shapes carry over).
function noise(x, y, z) {
  return (
    Math.sin(x * 1.9 + 1.3) * Math.sin(y * 1.7 + 2.1) * Math.sin(z * 1.5 + 0.7) +
    0.5 * Math.sin(x * 3.3 + 0.5) * Math.sin(y * 2.9 + 1.1) * Math.sin(z * 3.7 + 2.4)
  )
}

function fitness(x, y, z) {
  const v =
    Math.sin(x * 0.9 + 4.1) * Math.sin(y * 1.3 + 1.7) * Math.sin(z * 1.1 + 3.3) +
    0.5 * Math.sin(x * 2.1 + 2.2) * Math.cos(z * 1.9 + 0.4)
  return clamp01((v + 1.5) / 3)
}

function blobRadius(nx, ny, nz, base, phase) {
  return (
    base +
    1.4 * Math.sin(nx * 2.5 + 1.0 + phase) * Math.cos(ny * 2.0 + phase) +
    1.0 * Math.sin(nz * 3.0 + 0.7 + phase) +
    0.8 * Math.cos(nx * 3.5 + ny * 2.0 + phase)
  )
}

// All lattice offsets within `radius` of the origin (origin excluded).
function neighborOffsets(radius) {
  const offs = []
  const m = Math.ceil(radius)
  for (let dx = -m; dx <= m; dx++) {
    for (let dy = -m; dy <= m; dy++) {
      for (let dz = -m; dz <= m; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue
        if (Math.hypot(dx, dy, dz) <= radius + 1e-6) offs.push([dx, dy, dz])
      }
    }
  }
  return offs
}

// ---------------------------------------------------------------------------
// Space construction: lattice culled to an irregular blob, impossibility carved
// as smooth voids + fine scatter, fitness field sampled per cell.
// ---------------------------------------------------------------------------

export function buildSpace(opts = {}, rng = mulberry32(opts.seed ?? 1)) {
  const grid = opts.grid ?? 20
  const phase = opts.phase ?? 0
  const base = opts.radiusBase ?? grid * 0.29
  const impossibility = clamp01(opts.impossibility ?? 0.3)

  // Smooth-void threshold: imp 0 -> above the noise range (no voids); imp 1 -> heavy voids.
  const voidThresh = 1.5 - impossibility * 1.35
  // Fine scatter: the percolation component. Superlinear so low knob values stay mostly open.
  const scatterProb = 0.8 * Math.pow(impossibility, 1.5)

  const c = (grid - 1) / 2
  const cells = []
  const index = new Map()
  const keyOf = (x, y, z) => (x * grid + y) * grid + z

  for (let x = 0; x < grid; x++) {
    for (let y = 0; y < grid; y++) {
      for (let z = 0; z < grid; z++) {
        const dx = x - c, dy = y - c, dz = z - c
        const d = Math.hypot(dx, dy, dz)
        const len = d || 1
        if (d > blobRadius(dx / len, dy / len, dz / len, base, phase)) continue
        const impossible =
          noise(x * 0.55 + phase, y * 0.55 + phase, z * 0.55 + phase) > voidThresh ||
          rng() < scatterProb
        index.set(keyOf(x, y, z), cells.length)
        cells.push({
          x, y, z, px: dx, py: dy, pz: dz, d, impossible,
          fit: fitness(x + phase, y + phase, z + phase),
          targetDist: 0,
        })
      }
    }
  }

  return { grid, cells, index, keyOf }
}

// Precompute per-cell neighbour index lists for a given reach knob.
function buildAdjacency(space, reach) {
  const radius = 1 + clamp01(reach) * 1.5
  const offs = neighborOffsets(radius)
  const { grid, cells, index, keyOf } = space
  const neighbors = new Array(cells.length)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const list = []
    for (const [ox, oy, oz] of offs) {
      const nx = cell.x + ox, ny = cell.y + oy, nz = cell.z + oz
      if (nx < 0 || nx >= grid || ny < 0 || ny >= grid || nz < 0 || nz >= grid) continue
      const ni = index.get(keyOf(nx, ny, nz))
      if (ni !== undefined) list.push(ni)
    }
    neighbors[i] = list
  }
  return neighbors
}

// ---------------------------------------------------------------------------
// The simulation.
// ---------------------------------------------------------------------------

export function simulate(opts = {}) {
  const seed = opts.seed ?? 1
  const rng = mulberry32(seed)
  const impossibility = clamp01(opts.impossibility ?? 0.3)
  const reach = clamp01(opts.reach ?? 0)
  const ratchet = clamp01(opts.ratchet ?? 0)
  const generativity = clamp01(opts.generativity ?? 1)
  const targetPull = clamp01(opts.targetPull ?? 0)
  const maxTicks = opts.maxTicks ?? 400

  const space = buildSpace({ ...opts, impossibility }, rng)
  const { grid, cells } = space
  const n = cells.length
  const neighbors = buildAdjacency(space, reach)

  // Optimum: the possible cell nearest the blob centre (what a convergent search collapses
  // toward). Origin/seed: a possible cell off to one side, so a pulled fill has somewhere
  // to travel from.
  const c = (grid - 1) / 2
  const originX = c + (opts.radiusBase ?? grid * 0.29) * 0.55
  let optimum = -1, optBest = Infinity
  let origin = -1, originBest = Infinity
  for (let i = 0; i < n; i++) {
    if (cells[i].impossible) continue
    if (cells[i].d < optBest) { optBest = cells[i].d; optimum = i }
    const od = Math.hypot(cells[i].x - originX, cells[i].y - c, cells[i].z - c)
    if (od < originBest) { originBest = od; origin = i }
  }

  const possible = cells.filter((cl) => !cl.impossible).length

  const state = new Int8Array(n)
  for (let i = 0; i < n; i++) state[i] = cells[i].impossible ? STATE.IMPOSSIBLE : STATE.DARK

  const events = []
  const series = { frontier: [], actualized: [], reached: [] }
  const emptyStats = {
    total: n, possible, everReached: 0, finalActualized: 0, faded: 0,
    reachedFrac: 0, optimumReached: false, stopReason: 'empty',
  }
  if (origin === -1) {
    // Nothing is possible at all. An honest degenerate run, not a crash (old buildSpace
    // dereferenced cells[-1] here).
    return { grid, cells, events, series, ticks: 0, verdict: VERDICT.DIED, stats: emptyStats, seed, optimum, origin }
  }

  for (let i = 0; i < n; i++) {
    cells[i].targetDist = Math.hypot(
      cells[i].px - cells[optimum].px,
      cells[i].py - cells[optimum].py,
      cells[i].pz - cells[optimum].pz,
    )
  }

  const support = new Int16Array(n) // actualized-neighbour count per cell
  const exposed = new Uint8Array(n) // one-shot: has this cell had its single recruitment roll?
  const everReachedFlag = new Uint8Array(n)
  let everReached = 0
  let actualizedCount = 0
  let fadedCount = 0
  let bestDist = Infinity
  let optimumReached = false

  let frontierList = []
  let actualizedList = []

  const suppress = Math.pow(1 - targetPull, 3) // non-improving actualization multiplier

  const actualize = (i, t) => {
    state[i] = STATE.ACTUALIZED
    events.push({ t, i, k: EVENT.ACTUALIZE })
    actualizedList.push(i)
    actualizedCount++
    if (!everReachedFlag[i]) { everReachedFlag[i] = 1; everReached++ }
    if (cells[i].targetDist < bestDist) bestDist = cells[i].targetDist
    if (i === optimum) optimumReached = true
    for (const ni of neighbors[i]) {
      support[ni]++
      // One-shot recruitment for never-reached cells: a DARK cell gets exactly ONE generativity
      // roll — the first time an actualized neighbour reaches it. A miss makes it permanently
      // unreachable (it never opens). This is what makes `generativity` a true site-percolation
      // knob: a continuous fraction of the reachable volume stays dark forever (the living
      // "adjacent possible never taken"), instead of the old retry rule where every reachable
      // cell eventually opened and the fill was all-or-nothing (fizzle vs. saturate). See
      // REDESIGN §4. FADED cells are exempt — they already proved reachable, so the ratchet's
      // churn can re-recruit them; one-shot governs only what was *never* reached.
      if (state[ni] === STATE.DARK) {
        if (!exposed[ni]) {
          exposed[ni] = 1
          if (rng() < generativity) {
            state[ni] = STATE.FRONTIER
            events.push({ t, i: ni, k: EVENT.OPEN })
            frontierList.push(ni)
          }
        }
      } else if (state[ni] === STATE.FADED && rng() < generativity) {
        state[ni] = STATE.FRONTIER
        events.push({ t, i: ni, k: EVENT.OPEN })
        frontierList.push(ni)
      }
    }
  }

  // Tick 0: the origin actualizes unconditionally.
  exposed[origin] = 1
  actualize(origin, 0)
  series.frontier.push(frontierList.length)
  series.actualized.push(actualizedCount)
  series.reached.push(everReached)

  let ticks = 0
  let stall = 0
  let stopReason = 'maxTicks'
  const recentA = [] // actualizations per tick, trailing CONVERGE_WINDOW

  for (let t = 1; t <= maxTicks; t++) {
    ticks = t
    let aThisTick = 0

    // 1. Actualization pass over a snapshot of the frontier (cells opened this tick wait
    //    for the next — keeps iteration order deterministic and the wave one step per tick).
    const snapshot = frontierList
    frontierList = []
    for (const i of snapshot) {
      if (state[i] !== STATE.FRONTIER) continue // demoted by a fade earlier this run
      const improving = cells[i].targetDist < bestDist - 1e-9
      const p = BASE_RATE * (improving ? 1 : suppress)
      if (rng() < p) {
        actualize(i, t)
        aThisTick++
      } else {
        frontierList.push(i)
      }
    }

    // 2. Ratchet pass: actualized cells fade with probability scaled by selectivity and
    //    sheltered by fitness. Fading withdraws support; unsupported frontier closes.
    if (ratchet > 0) {
      const keep = []
      for (const i of actualizedList) {
        const fadeP = ratchet * FADE_RATE * (1 - FIT_SHELTER * cells[i].fit)
        if (rng() < fadeP) {
          state[i] = STATE.FADED
          events.push({ t, i, k: EVENT.FADE })
          actualizedCount--
          fadedCount++
          for (const ni of neighbors[i]) {
            support[ni]--
            if (state[ni] === STATE.FRONTIER && support[ni] <= 0) {
              state[ni] = STATE.DARK
              events.push({ t, i: ni, k: EVENT.CLOSE })
            }
          }
        } else {
          keep.push(i)
        }
      }
      actualizedList = keep
      if (frontierList.some((i) => state[i] !== STATE.FRONTIER)) {
        frontierList = frontierList.filter((i) => state[i] === STATE.FRONTIER)
      }
    }

    series.frontier.push(frontierList.length)
    series.actualized.push(actualizedCount)
    series.reached.push(everReached)
    recentA.push(aThisTick)
    if (recentA.length > CONVERGE_WINDOW) recentA.shift()

    stall = aThisTick === 0 ? stall + 1 : 0
    if (frontierList.length === 0) { stopReason = 'frontierEmpty'; break }
    if (stall >= STALL_TICKS) { stopReason = 'stall'; break }
  }

  // Final tallies from the live state array (actualizedCount is maintained live too, but
  // recount so stats.faded is the *current* faded count, not the cumulative fade events —
  // cells fade and re-actualize many times under a strong ratchet).
  let finalActualized = 0
  let finalFaded = 0
  // Anatomy of the unreached, needed to tell the two flavours of "unrealized" apart:
  //   refused  — a possible cell the frontier DID reach but whose one-shot roll missed: the
  //              open-ended remainder (reachable in principle, never taken).
  //   unexposedPossible — a possible cell the frontier never even came adjacent to: walled off
  //              behind impossibility (or behind a ring of refusals) — fragmentation.
  let refused = 0
  let unexposedPossible = 0
  for (let i = 0; i < n; i++) {
    if (state[i] === STATE.ACTUALIZED) finalActualized++
    else if (state[i] === STATE.FADED) finalFaded++
    if (cells[i].impossible || everReachedFlag[i]) continue
    if (exposed[i]) refused++
    else unexposedPossible++
  }

  // -------------------------------------------------------------------------
  // Verdict — read the diagnostics, not the knobs.
  // -------------------------------------------------------------------------
  const reachedFrac = possible ? everReached / possible : 0
  const recentRate = recentA.reduce((a, b) => a + b, 0) / Math.max(1, recentA.length)

  let verdict
  if (stopReason === 'stall') {
    // Cells were available but nothing actualized: only target suppression does this.
    // Converged — to the optimum if it was reached, to a walled local optimum otherwise.
    verdict = VERDICT.CONVERGED
  } else if (stopReason === 'frontierEmpty') {
    if (finalActualized === 0) {
      verdict = VERDICT.DIED // extinct: everything that actualized has faded
    } else if (reachedFrac >= SATURATED_FRAC) {
      verdict = VERDICT.SATURATED // filled (nearly) all of the possible volume
    } else if (refused <= everReached * 0.1 && unexposedPossible >= possible * 0.3) {
      // The fill accepted essentially every step it was offered (few refusals) yet still left a
      // big untouched remainder: it wasn't the dice that stopped it, it was walls. Filled its
      // pocket; the rest is sealed off behind impossibility. Fragmented.
      verdict = VERDICT.FRAGMENTED
    } else if (reachedFrac >= 0.12) {
      // The fill spread through a real chunk of the space and settled, leaving a large refused
      // remainder: the open-ended bloom that takes some adjacent steps and not others. This is
      // the thesis state — most of the space stays possible-but-never-taken.
      verdict = VERDICT.BLOOMING
    } else {
      verdict = VERDICT.DIED // never got going: a subcritical fizzle
    }
  } else {
    // Horizon reached with a living frontier.
    if (optimumReached && recentRate < Math.max(0.5, 0.005 * frontierList.length)) {
      verdict = VERDICT.CONVERGED
    } else if (reachedFrac >= SATURATED_FRAC && recentRate < 0.5) {
      verdict = VERDICT.SATURATED
    } else {
      verdict = VERDICT.BLOOMING
    }
  }

  return {
    grid,
    cells,
    events,
    series,
    ticks,
    verdict,
    seed,
    optimum,
    origin,
    stats: {
      total: n,
      possible,
      everReached,
      finalActualized,
      faded: finalFaded,
      totalFadeEvents: fadedCount,
      reachedFrac,
      refused, // reached-adjacent but one-shot-refused: the open-ended unrealized remainder
      unexposedPossible, // never touched by the frontier: walled off (fragmentation)
      optimumReached,
      stopReason,
    },
  }
}

// ---------------------------------------------------------------------------
// Replay: reconstruct every cell's state at a given tick from the event log.
// This is what the timeline scrubber renders from. O(events); for interactive
// scrubbing, replay forward incrementally from the last position.
// ---------------------------------------------------------------------------

export function replayStates(result, tick, out) {
  const { cells, events } = result
  const state = out ?? new Int8Array(cells.length)
  for (let i = 0; i < cells.length; i++) {
    state[i] = cells[i].impossible ? STATE.IMPOSSIBLE : STATE.DARK
  }
  for (const e of events) {
    if (e.t > tick) break // events are chronological
    if (e.k === EVENT.ACTUALIZE) state[e.i] = STATE.ACTUALIZED
    else if (e.k === EVENT.FADE) state[e.i] = STATE.FADED
    else if (e.k === EVENT.OPEN) state[e.i] = STATE.FRONTIER
    else if (e.k === EVENT.CLOSE) state[e.i] = STATE.DARK
  }
  return state
}
