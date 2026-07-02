// Regime tests for the search engine (REDESIGN.md §4, §7 phase 1).
// Run with: npm test  (node --test, no dependencies)
//
// These assert that bloom / fragment / die / converge / saturate EMERGE from the knobs —
// the whole point of replacing the decorative BFS. If a tuning change breaks one of these,
// the engine has lost a regime, not just a number.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulate, replayStates, STATE, VERDICT } from '../src/lib/engine.js'

const BASE = { grid: 16, seed: 7, maxTicks: 400 }

test('determinism: identical opts give identical runs; different seeds diverge', () => {
  const opts = { ...BASE, impossibility: 0.4, reach: 0.3, ratchet: 0.3, generativity: 0.7, targetPull: 0.2 }
  const a = simulate(opts)
  const b = simulate(opts)
  assert.deepEqual(a.events, b.events)
  assert.equal(a.verdict, b.verdict)
  assert.equal(a.stats.everReached, b.stats.everReached)

  const c = simulate({ ...opts, seed: 8 })
  assert.notDeepEqual(
    { n: c.events.length, r: c.stats.everReached },
    { n: a.events.length, r: a.stats.everReached },
  )
})

test('flood: no obstacles, full generativity, no ratchet -> saturates', () => {
  const r = simulate({ ...BASE, impossibility: 0, reach: 0, ratchet: 0, generativity: 1, targetPull: 0 })
  assert.equal(r.verdict, VERDICT.SATURATED)
  assert.ok(r.stats.reachedFrac > 0.99, `reachedFrac ${r.stats.reachedFrac}`)
})

test('percolation: heavy impossibility strands regions at short reach; longer reach jumps the gaps', () => {
  const short = simulate({ ...BASE, impossibility: 0.85, reach: 0, ratchet: 0, generativity: 1, targetPull: 0 })
  assert.equal(short.verdict, VERDICT.FRAGMENTED)
  assert.ok(short.stats.reachedFrac < 0.6, `short reach reachedFrac ${short.stats.reachedFrac}`)

  const long = simulate({ ...BASE, impossibility: 0.85, reach: 1, ratchet: 0, generativity: 1, targetPull: 0 })
  assert.ok(
    long.stats.reachedFrac > short.stats.reachedFrac * 1.5,
    `long reach ${long.stats.reachedFrac} should far exceed short reach ${short.stats.reachedFrac}`,
  )
})

test('extinction is a joint regime: high ratchet + marginal generativity dies; strong generativity outruns the ratchet', () => {
  // Marginal generativity here means "just above the one-shot percolation threshold" (~0.5 on
  // this lattice): a fill that blooms on its own but is fragile. A strict ratchet tips it into
  // extinction.
  const died = simulate({ ...BASE, impossibility: 0.2, reach: 0, ratchet: 1, generativity: 0.5, targetPull: 0 })
  assert.equal(died.verdict, VERDICT.DIED)
  assert.ok(died.stats.reachedFrac < 0.1, `strict ratchet should crush the fill: reachedFrac ${died.stats.reachedFrac}`)

  // Same marginal generativity, no ratchet: the fill survives far better — the ratchet, not
  // the generativity, drove the collapse (subcritical fills would fizzle either way).
  const noRatchet = simulate({ ...BASE, impossibility: 0.2, reach: 0, ratchet: 0, generativity: 0.5, targetPull: 0 })
  assert.ok(
    noRatchet.stats.reachedFrac > died.stats.reachedFrac * 3,
    `dropping the ratchet should sharply raise reach: ${noRatchet.stats.reachedFrac} vs ${died.stats.reachedFrac}`,
  )

  // Crank generativity up (autocatalysis) and the same strict ratchet can no longer kill it.
  const survives = simulate({ ...BASE, impossibility: 0.2, reach: 0, ratchet: 1, generativity: 0.9, targetPull: 0 })
  assert.notEqual(survives.verdict, VERDICT.DIED)
})

test('subcritical generativity: the frontier fizzles even without a ratchet', () => {
  const r = simulate({ ...BASE, impossibility: 0.1, reach: 0, ratchet: 0, generativity: 0.08, targetPull: 0 })
  assert.equal(r.verdict, VERDICT.DIED)
  assert.ok(r.stats.reachedFrac < 0.25, `reachedFrac ${r.stats.reachedFrac}`)
})

test('convergence: full target pull climbs to the optimum along a thin path and stalls, leaving the space dark', () => {
  // Clear space (imp 0.05) so the climb to the centre optimum is not walled off short.
  const r = simulate({ ...BASE, impossibility: 0.05, reach: 0, ratchet: 0, generativity: 1, targetPull: 1 })
  assert.equal(r.verdict, VERDICT.CONVERGED)
  assert.ok(r.stats.optimumReached, 'the climber should reach the optimum')
  assert.ok(r.stats.reachedFrac < 0.2, `a hill-climber touches a sliver, not the volume: reachedFrac ${r.stats.reachedFrac}`)
  // Order matters: the pulled fill is a path, dramatically smaller than the pull-free flood.
  const flood = simulate({ ...BASE, impossibility: 0.05, reach: 0, ratchet: 0, generativity: 1, targetPull: 0 })
  assert.ok(flood.stats.everReached > r.stats.everReached * 2, `flood ${flood.stats.everReached} vs climb ${r.stats.everReached}`)
})

test('bloom: an active fill expands its frontier before the horizon (peak well after the start)', () => {
  // On a finite lattice the frontier necessarily peaks and then decays as space runs out
  // (true open-endedness needs a growing lattice — REDESIGN §4, deferred). The bloom
  // signature here is a frontier that *expands* far above its seed value and peaks well
  // after t=0, unlike a dying fill whose frontier decays monotonically from the start.
  const r = simulate({ ...BASE, grid: 20, maxTicks: 120, impossibility: 0.3, reach: 0, ratchet: 0.15, generativity: 0.85, targetPull: 0 })
  assert.equal(r.verdict, VERDICT.BLOOMING)
  const f = r.series.frontier
  const peak = Math.max(...f)
  const peakTick = f.indexOf(peak)
  assert.ok(peak > 30, `frontier should expand substantially: peak ${peak}`)
  assert.ok(peakTick > 3, `frontier should grow before peaking, not start at its max: peak at tick ${peakTick}`)
  assert.ok(peak > f[1] * 5, `peak ${peak} should dwarf the seed frontier ${f[1]}`)

  // Contrast: a dying fill's frontier peaks early and low.
  const dying = simulate({ ...BASE, grid: 20, maxTicks: 120, impossibility: 0.2, reach: 0, ratchet: 1, generativity: 0.35, targetPull: 0 })
  assert.equal(dying.verdict, VERDICT.DIED)
  assert.ok(Math.max(...dying.series.frontier) < peak, 'a dying fill should never out-expand a blooming one')
})

test('open-ended remainder: mid generativity blooms and settles, leaving most of the space reachable-but-never-taken', () => {
  // The thesis state that one-shot recruitment exists to produce: the fill spreads through a
  // real chunk of the space, then settles — and the bulk of what it leaves dark is *refused*
  // (the frontier reached those cells; their one recruitment roll missed), NOT walled off.
  // This is "most of the space stays possible but never gets taken" as an open-ended bloom,
  // distinct from fragmentation (sealed by impossibility) and convergence (a targeted climb).
  const r = simulate({ ...BASE, grid: 20, impossibility: 0.3, reach: 0, ratchet: 0.2, generativity: 0.65, targetPull: 0 })
  assert.equal(r.verdict, VERDICT.BLOOMING)
  assert.ok(r.stats.reachedFrac > 0.2 && r.stats.reachedFrac < 0.85, `a partial bloom, not fizzle or flood: reachedFrac ${r.stats.reachedFrac}`)
  const unreached = r.stats.possible - r.stats.everReached
  assert.ok(unreached > r.stats.possible * 0.2, `a large unrealized remainder must survive: ${unreached}/${r.stats.possible}`)
  assert.ok(
    r.stats.refused > r.stats.unexposedPossible,
    `the remainder must be refused (reachable-but-not-taken), not walled off: refused ${r.stats.refused} vs unexposed ${r.stats.unexposedPossible}`,
  )
})

test('replay: event log reconstructs the final state exactly', () => {
  const r = simulate({ ...BASE, impossibility: 0.4, reach: 0.3, ratchet: 0.5, generativity: 0.6, targetPull: 0.3 })
  const state = replayStates(r, r.ticks)
  let actualized = 0, faded = 0, impossible = 0
  for (let i = 0; i < state.length; i++) {
    if (state[i] === STATE.ACTUALIZED) actualized++
    else if (state[i] === STATE.FADED) faded++
    else if (state[i] === STATE.IMPOSSIBLE) impossible++
  }
  assert.equal(actualized, r.stats.finalActualized)
  assert.equal(faded, r.stats.faded)
  assert.equal(impossible, r.stats.total - r.stats.possible)
  // Replay at tick 0: exactly the origin is actualized.
  const t0 = replayStates(r, 0)
  assert.equal(t0[r.origin], STATE.ACTUALIZED)
  assert.equal(t0.filter((s) => s === STATE.ACTUALIZED).length, 1)
})

test('events are chronological and well-formed', () => {
  const r = simulate({ ...BASE, impossibility: 0.3, ratchet: 0.4, generativity: 0.7 })
  let prev = 0
  for (const e of r.events) {
    assert.ok(e.t >= prev, 'event times must be non-decreasing')
    assert.ok(e.i >= 0 && e.i < r.cells.length)
    prev = e.t
  }
})

test('degenerate space: near-total impossibility is an honest tiny run, not a crash', () => {
  const r = simulate({ ...BASE, impossibility: 1, radiusBase: 2 })
  // scatter impossibility caps below 1.0, so a few cells survive: the fill fills its pocket
  // and seals (fragmented) or is snuffed out (died). Either way: no crash, negligible reach.
  assert.ok([VERDICT.DIED, VERDICT.FRAGMENTED].includes(r.verdict), `verdict ${r.verdict}`)
  assert.ok(r.stats.possible < r.stats.total * 0.2, `almost nothing should be possible: ${r.stats.possible}/${r.stats.total}`)
  assert.ok(r.stats.everReached < 10, `reach should be negligible in absolute terms: ${r.stats.everReached}`)
})

test('the unrealized is real: the interesting regimes leave possible-but-unreached cells', () => {
  // "Unrealized" = possible yet never reached. It arises from fragmentation (reach too short
  // to cross the voids) and from convergence (a climber ignores most of the space) — NOT from
  // impossibility, which only shrinks the possible set. Assert those two regimes leave a gap.
  const fragmented = simulate({ ...BASE, impossibility: 0.85, reach: 0, ratchet: 0, generativity: 1, targetPull: 0 })
  assert.equal(fragmented.verdict, VERDICT.FRAGMENTED)
  assert.ok(fragmented.stats.everReached < fragmented.stats.possible, 'fragmentation must strand possible cells')

  const converged = simulate({ ...BASE, impossibility: 0.05, reach: 0, ratchet: 0, generativity: 1, targetPull: 1 })
  assert.equal(converged.verdict, VERDICT.CONVERGED)
  assert.ok(
    converged.stats.everReached < converged.stats.possible * 0.5,
    'a converged climb must leave most of the possible space dark',
  )
})
