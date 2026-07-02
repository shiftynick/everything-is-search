// Domain-preset guard tests. Each of the six systems is a preset of the same engine; these
// assert every preset lands in its intended regime and — the thesis-critical invariant —
// that NO preset saturates. The "679 of 679 possible cells reached" bug that shipped in the
// old build (Reveal-the-unrealized a silent no-op) becomes impossible to reintroduce.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulate, VERDICT } from '../src/lib/engine.js'
import { DOMAINS } from '../src/lib/domains.js'

// Rendering budget the engine needs beyond a domain's identity knobs.
const RENDER = { grid: 22, maxTicks: 300 }

test('every domain preset defines the full engine knob-set', () => {
  const required = ['phase', 'radiusBase', 'impossibility', 'reach', 'ratchet', 'generativity', 'targetPull', 'seed']
  for (const d of DOMAINS) {
    assert.ok(d.knobs, `${d.id} has no knobs`)
    for (const k of required) {
      assert.equal(typeof d.knobs[k], 'number', `${d.id}.knobs.${k} must be a number`)
    }
  }
})

test('no preset saturates: every system leaves an honest unrealized remainder', () => {
  for (const d of DOMAINS) {
    const r = simulate({ ...RENDER, ...d.knobs })
    assert.notEqual(r.verdict, VERDICT.SATURATED, `${d.id} must not saturate`)
    assert.ok(
      r.stats.reachedFrac < 0.85,
      `${d.id} reaches too much of its space (${(r.stats.reachedFrac * 100).toFixed(0)}%) — the unrealized must stay visible`,
    )
  }
})

test('families are real: Physics converges (Family A); the rest bloom (Family B)', () => {
  const byId = Object.fromEntries(DOMAINS.map((d) => [d.id, d]))

  const physics = simulate({ ...RENDER, ...byId.physics.knobs })
  assert.equal(physics.verdict, VERDICT.CONVERGED, 'physics is the Family-A anchor: it converges')
  assert.ok(physics.stats.optimumReached, 'a converging climb reaches its optimum')
  assert.ok(physics.stats.reachedFrac < 0.2, 'a climber touches a sliver, not the volume')

  for (const id of ['chemistry', 'biology', 'mind', 'society', 'cosmos']) {
    const r = simulate({ ...RENDER, ...byId[id].knobs })
    assert.equal(r.verdict, VERDICT.BLOOMING, `${id} is Family B: it blooms`)
    // The remainder must be the open-ended kind (reached-but-refused), not merely walled off.
    assert.ok(r.stats.refused > r.stats.unexposedPossible, `${id}'s remainder should be refused, not sealed`)
  }
})
