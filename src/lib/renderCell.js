// Per-cell appearance for the engine's discrete states — colour AND alpha, so the volume
// reads as a see-through solid (REDESIGN §5). The old cellColor.js is BFS-order based and
// stays with the legacy scenes; this one speaks the engine's state machine.
//
// The whole legibility bet: dark cells are near-invisible dust so you see THROUGH them into
// the interior; the frontier is the one loud, near-opaque, bloom-crossing thing; actualized
// cells are translucent and carry history (age gradient) + persistence tint (fitness);
// impossible cells are a visually distinct "pore", not just another grey.

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

// state ids match engine.js STATE
export const R = {
  IMPOSSIBLE: 0, DARK: 1, FRONTIER: 2, ACTUALIZED: 3, FADED: 4,
}

// Colour triples (kept out of tone mapping; frontier deliberately > 1-ish luminance for bloom).
const IMPOSSIBLE = [0.22, 0.15, 0.12] // warm brown-grey: "can't", a pore
const DARK = [0.22, 0.26, 0.24] // cool ghost, shown at very low alpha
const AMBER = [1.0, 0.66, 0.2] // the revealed unrealized
const FADED = [0.28, 0.31, 0.29] // fossil: was actualized, lost to the ratchet
const FRONTIER = [0.92, 1.0, 0.95] // the adjacent possible — the star
const HIST_NEW = [0.46, 0.98, 0.76] // freshly actualized
const HIST_OLD = [0.13, 0.5, 0.42] // old accretion (kept luminous so the core doesn't go black)

// Alpha per state — the see-through budget. Dark stays near-invisible (you see THROUGH the
// unreached volume); actualized is solid enough to read as accreted history; frontier is
// nearly opaque and bloom-bright.
const A_IMPOSSIBLE = 0.42
const A_DARK = 0.06
const A_DARK_REVEALED = 0.6
const A_FADED = 0.2
const A_FRONTIER = 0.98
const A_ACT_MIN = 0.45
const A_ACT_MAX = 0.85

// Writes r,g,b into `col` (THREE.Color) and returns alpha. Palette lets a domain retint the
// history/frontier/core ramp (see domains presets); pass null for the defaults above.
// ctx: { state, age, maxAge, fit, reveal }
//   age    — ticks since this cell last actualized (0 = just now)
//   maxAge — normaliser for the history ramp
//   fit    — cell persistence 0..1 (drives the tint: robust = bright, marginal = dim)
export function writeRenderCell(col, ctx, palette) {
  const P = palette || {}
  const histNew = P.fresh || HIST_NEW
  const histOld = P.old || HIST_OLD
  const frontier = P.frontier || FRONTIER

  switch (ctx.state) {
    case R.IMPOSSIBLE:
      col.setRGB(IMPOSSIBLE[0], IMPOSSIBLE[1], IMPOSSIBLE[2])
      return A_IMPOSSIBLE

    case R.FRONTIER:
      col.setRGB(frontier[0], frontier[1], frontier[2])
      return A_FRONTIER

    case R.FADED:
      col.setRGB(FADED[0], FADED[1], FADED[2])
      return A_FADED

    case R.ACTUALIZED: {
      const k = clamp01(ctx.age / (ctx.maxAge || 1)) // 0 fresh -> 1 old
      let r = histNew[0] + (histOld[0] - histNew[0]) * k
      let g = histNew[1] + (histOld[1] - histNew[1]) * k
      let b = histNew[2] + (histOld[2] - histNew[2]) * k
      // Persistence tint: robust cells stay bright, marginal ones dim toward their own shade.
      const tint = 0.68 + 0.32 * clamp01(ctx.fit)
      col.setRGB(r * tint, g * tint, b * tint)
      // Freshly actualized cells ride a little more opaque (feels like a settling wave).
      const a = A_ACT_MAX - (A_ACT_MAX - A_ACT_MIN) * k
      return a
    }

    case R.DARK:
    default:
      if (ctx.reveal) {
        col.setRGB(AMBER[0], AMBER[1], AMBER[2])
        return A_DARK_REVEALED
      }
      col.setRGB(DARK[0], DARK[1], DARK[2])
      return A_DARK
  }
}
