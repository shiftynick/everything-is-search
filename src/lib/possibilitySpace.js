// Builds the "space of the possible": a 3D lattice culled to an irregular blob,
// with some cells marked impossible, then flood-filled (BFS) from a central seed.
//
// The BFS `order` on each cell is the heart of the visual: it is the arrival time of
// actualization. Cells the fill can never reach (walled off, out of reach, or rejected by
// the ratchet) keep order = Infinity — those are "possible but never realized".
//
// buildSpace(grid, opts):
//   phase, threshold, radiusBase — vary the shape and void pattern per domain.
//   reach   — how far one step travels (1 = 6-neighbour; larger connects/leaps over gaps).
//   ratchet — persistence gate in [0,1); a cell is only retained if its fitness clears it.
// Defaults (reach 1, ratchet 0) reproduce the original Act I / Act II blobs exactly.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// Deterministic, seed-free noise so a given space is identical on every load.
function noise(x, y, z) {
  return (
    Math.sin(x * 1.9 + 1.3) * Math.sin(y * 1.7 + 2.1) * Math.sin(z * 1.5 + 0.7) +
    0.5 * Math.sin(x * 3.3 + 0.5) * Math.sin(y * 2.9 + 1.1) * Math.sin(z * 3.7 + 2.4)
  )
}

// A second, independent field: how "persistent" a cell is (0..1). Drives the ratchet.
function fitness(x, y, z) {
  const v =
    Math.sin(x * 0.9 + 4.1) * Math.sin(y * 1.3 + 1.7) * Math.sin(z * 1.1 + 3.3) +
    0.5 * Math.sin(x * 2.1 + 2.2) * Math.cos(z * 1.9 + 0.4)
  return clamp01((v + 1.5) / 3)
}

// Direction-dependent radius -> an irregular blob rather than a sphere.
function blobRadius(nx, ny, nz, base, phase) {
  return (
    base +
    1.4 * Math.sin(nx * 2.5 + 1.0 + phase) * Math.cos(ny * 2.0 + phase) +
    1.0 * Math.sin(nz * 3.0 + 0.7 + phase) +
    0.8 * Math.cos(nx * 3.5 + ny * 2.0 + phase)
  )
}

// All lattice offsets within `reach` (excluding the origin). reach 1 -> the 6 face neighbours.
function neighborOffsets(reach) {
  const offs = []
  const m = Math.ceil(reach)
  for (let dx = -m; dx <= m; dx++) {
    for (let dy = -m; dy <= m; dy++) {
      for (let dz = -m; dz <= m; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue
        if (Math.hypot(dx, dy, dz) <= reach + 1e-6) offs.push([dx, dy, dz])
      }
    }
  }
  return offs
}

export function buildSpace(grid = 20, opts = {}) {
  const phase = opts.phase ?? 0
  const threshold = opts.threshold ?? 0.42
  const base = opts.radiusBase ?? 5.7
  const reach = opts.reach ?? 1
  const ratchet = opts.ratchet ?? 0

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
        const r = blobRadius(dx / len, dy / len, dz / len, base, phase)
        if (d > r) continue
        const impossible = noise(x * 0.55 + phase, y * 0.55 + phase, z * 0.55 + phase) > threshold
        index.set(keyOf(x, y, z), cells.length)
        cells.push({
          x, y, z, px: dx, py: dy, pz: dz, d, impossible,
          fit: fitness(x + phase, y + phase, z + phase),
          order: Infinity, targetDist: 0,
        })
      }
    }
  }

  // Seed: the possible cell nearest the centre (the "origin" of actualization). Always retained.
  let seed = -1, best = Infinity
  for (let i = 0; i < cells.length; i++) {
    if (!cells[i].impossible && cells[i].d < best) { best = cells[i].d; seed = i }
  }

  // Breadth-first flood fill. A neighbour is actualized only if it is possible, unclaimed,
  // and its fitness clears the ratchet. Rejected cells stay dark and do not propagate.
  const offs = neighborOffsets(reach)
  const queue = [seed]
  cells[seed].order = 0
  let head = 0, maxOrder = 0
  while (head < queue.length) {
    const cur = cells[queue[head++]]
    for (const [ox, oy, oz] of offs) {
      const nx = cur.x + ox, ny = cur.y + oy, nz = cur.z + oz
      if (nx < 0 || nx >= grid || ny < 0 || ny >= grid || nz < 0 || nz >= grid) continue
      const ni = index.get(keyOf(nx, ny, nz))
      if (ni === undefined) continue
      const nb = cells[ni]
      if (nb.impossible || nb.order !== Infinity) continue
      if (nb.fit < ratchet) continue
      nb.order = cur.order + 1
      if (nb.order > maxOrder) maxOrder = nb.order
      queue.push(ni)
    }
  }

  // Family A target = the optimum a convergent search collapses toward (the centre/seed).
  const target = cells[seed]
  let maxTargetDist = 1
  for (const cell of cells) {
    cell.targetDist = Math.hypot(cell.px - target.px, cell.py - target.py, cell.pz - target.pz)
    if (cell.order !== Infinity && cell.targetDist > maxTargetDist) maxTargetDist = cell.targetDist
  }

  const reached = cells.filter((c) => c.order !== Infinity).length
  const possible = cells.filter((c) => !c.impossible).length

  return { cells, maxOrder, maxTargetDist, grid, stats: { total: cells.length, possible, reached } }
}
