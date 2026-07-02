// Shared per-cell colouring for every blob (Act I hero and Act II atlas).
//
// A cell's colour is a blend, by `mode`, of two readings of the SAME fill:
//   mode 0 (Family B, blooms)   — history + a glowing frontier; unreached cells can be revealed.
//   mode 1 (Family A, converges) — brightness collapses toward the central optimum; no frontier.

export const BASE_PALETTE = {
  impossible: [0.09, 0.09, 0.08],
  faint: [0.15, 0.16, 0.15],
  amber: [0.95, 0.62, 0.16],
  fresh: [0.32, 0.74, 0.6],
  old: [0.05, 0.32, 0.27],
  frontier: [0.85, 1.0, 0.92],
  core: [0.5, 0.95, 0.82],
}

export function mergePalette(overrides = {}) {
  return { ...BASE_PALETTE, ...overrides }
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// Writes the computed colour into `target` (a THREE.Color). No allocation.
export function writeCellColor(target, cell, ctx) {
  const { tOrder, band, maxOrder, maxTargetDist, mode, reveal, P } = ctx
  let br, bg, bb // family B
  let ar, ag, ab // family A

  if (cell.impossible) {
    br = ar = P.impossible[0]; bg = ag = P.impossible[1]; bb = ab = P.impossible[2]
  } else if (cell.order === Infinity) {
    const c = reveal ? P.amber : P.faint
    br = c[0]; bg = c[1]; bb = c[2]
    ar = reveal ? P.amber[0] * 0.55 : P.faint[0]
    ag = reveal ? P.amber[1] * 0.55 : P.faint[1]
    ab = reveal ? P.amber[2] * 0.55 : P.faint[2]
  } else if (cell.order > tOrder) {
    br = ar = P.faint[0]; bg = ag = P.faint[1]; bb = ab = P.faint[2]
  } else {
    const age = tOrder - cell.order
    if (age < band) {
      br = P.frontier[0]; bg = P.frontier[1]; bb = P.frontier[2]
    } else {
      const k = clamp01(age / maxOrder)
      br = P.fresh[0] + (P.old[0] - P.fresh[0]) * k
      bg = P.fresh[1] + (P.old[1] - P.fresh[1]) * k
      bb = P.fresh[2] + (P.old[2] - P.fresh[2]) * k
    }
    const prox = 1 - clamp01(cell.targetDist / maxTargetDist)
    const bright = 0.16 + 0.84 * Math.pow(prox, 1.6)
    ar = P.core[0] * bright; ag = P.core[1] * bright; ab = P.core[2] * bright
  }

  target.setRGB(br + (ar - br) * mode, bg + (ag - bg) * mode, bb + (ab - bb) * mode)
}
