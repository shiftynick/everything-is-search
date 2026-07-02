import { mergePalette } from './cellColor.js'

// The six atlas exhibits, ordered by scale of organisation (physics -> cosmos).
// Physics is the pure Family A anchor (converges). The rest are Family B (bloom), and each
// carries a `child`: the converging optimisation you find when you descend into one of its cells.

export const DOMAINS = [
  {
    id: 'physics',
    name: 'Matter settling',
    short: 'Physics',
    scaleLabel: '≈ 10⁻¹⁰ m · atoms',
    family: 'A',
    accent: '#4f8fdf',
    palette: mergePalette({ fresh: [0.3, 0.55, 0.85], old: [0.06, 0.16, 0.34], core: [0.45, 0.7, 0.98] }),
    sim: { phase: 0.0, threshold: 0.5, radiusBase: 4.3 },
    // Engine knobs (grid/maxTicks come from the renderer). Family A: high target pull climbs to
    // the optimum and stalls — reaches ~5%, leaving the rest dark. Verdict: converged.
    knobs: { phase: 0.0, radiusBase: 6.2, impossibility: 0.12, reach: 0, ratchet: 0.05, generativity: 1.0, targetPull: 0.78, seed: 5 },
    goal: 'Matter has no goal — it just rolls to the lowest place it can reach, and stays.',
    lenses: {
      volume: 'Every arrangement of atoms',
      adjacency: 'One atom slips to a neighbouring site',
      ratchet: 'Lower potential energy',
      generativity: 'Low — it settles and stops',
      unrealized: 'Glasses and quasicrystals that never nucleated',
    },
    caveat:
      'At the deepest level (least action) this is not even selection — it is a single determined trajectory. The "search" framing is a genuine stretch here.',
    child: null,
  },
  {
    id: 'chemistry',
    name: 'The first metabolisms',
    short: 'Chemistry',
    scaleLabel: '≈ 10⁻⁹ m · molecules',
    family: 'B',
    accent: '#35c39a',
    palette: mergePalette({ fresh: [0.32, 0.74, 0.6], old: [0.05, 0.32, 0.27], core: [0.5, 0.95, 0.82] }),
    sim: { phase: 1.6, threshold: 0.4, radiusBase: 4.7 },
    // Family B: no target, mid generativity — blooms to ~60% and settles, ~35% left unrealized.
    knobs: { phase: 1.6, radiusBase: 6.2, impossibility: 0.30, reach: 0, ratchet: 0.25, generativity: 0.66, targetPull: 0, seed: 3 },
    goal: 'No target. Whatever molecule can be built from what already exists — and remade.',
    lenses: {
      volume: 'Every molecule that could be built',
      adjacency: 'One reaction away from what exists',
      ratchet: 'Autocatalytic stability — what gets remade',
      generativity: 'High — each molecule opens new reactions',
      unrealized: 'Molecules no chemistry on Earth ever assembled',
    },
    caveat: 'The line between a "possible" and an "impossible" molecule is far fuzzier than a crisp blob boundary suggests.',
    child: { note: 'A single reaction is a converging search: reactants sliding down to one transition-state minimum.' },
  },
  {
    id: 'biology',
    name: 'Evolution',
    short: 'Biology',
    scaleLabel: '10⁻⁵–10⁰ m · cells to organisms',
    family: 'B',
    accent: '#7bc043',
    palette: mergePalette({ fresh: [0.45, 0.75, 0.35], old: [0.12, 0.3, 0.08], core: [0.6, 0.9, 0.4] }),
    sim: { phase: 3.2, threshold: 0.38, radiusBase: 5.0 },
    // Family B: strong ratchet (differential reproduction) trims history — blooms to ~57%.
    knobs: { phase: 3.2, radiusBase: 6.2, impossibility: 0.34, reach: 0, ratchet: 0.35, generativity: 0.68, targetPull: 0, seed: 2 },
    goal: 'No fixed target. Whatever manages to reproduce in this world, right now.',
    lenses: {
      volume: 'Every genome and body plan',
      adjacency: 'One mutation or recombination',
      ratchet: 'Differential reproduction',
      generativity: 'High — each innovation opens new niches',
      unrealized: 'Viable creatures that never happened to evolve',
    },
    caveat: 'A 3D blob flattens a space of astronomically many dimensions. The shape is a feeling, not a map.',
    child: { note: 'One organism is protein folding: a converging search down the funnel to a single stable shape.' },
  },
  {
    id: 'mind',
    name: 'A mind modelling the world',
    short: 'Mind',
    scaleLabel: '≈ 10⁻¹ m · one brain',
    family: 'B',
    accent: '#9b7be0',
    palette: mergePalette({ fresh: [0.6, 0.5, 0.85], old: [0.2, 0.12, 0.4], core: [0.72, 0.6, 0.98] }),
    sim: { phase: 4.8, threshold: 0.4, radiusBase: 4.7 },
    // Family B: slightly lower generativity — a mind reaches fewer of its adjacent concepts (~54%).
    knobs: { phase: 4.8, radiusBase: 6.2, impossibility: 0.30, reach: 0, ratchet: 0.30, generativity: 0.63, targetPull: 0, seed: 4 },
    goal: 'No fixed target. A model of the world that keeps predicting a little better.',
    lenses: {
      volume: 'Every concept the brain could form',
      adjacency: 'One association from what is understood',
      ratchet: 'Predictive success — what reduces surprise',
      generativity: 'High — each idea makes new ideas thinkable',
      unrealized: 'Thoughts no one has the priors to reach',
    },
    caveat: 'Whether concept-space has any fixed "boundary" at all is a real open question, not a settled fact.',
    child: { note: 'Mastering one skill is optimisation: error-correction converging on a single competent routine.' },
  },
  {
    id: 'society',
    name: 'Technology and markets',
    short: 'Society',
    scaleLabel: '10³–10⁶ m · populations',
    family: 'B',
    accent: '#e0993a',
    palette: mergePalette({ fresh: [0.85, 0.6, 0.3], old: [0.35, 0.2, 0.05], core: [0.98, 0.75, 0.4] }),
    sim: { phase: 6.4, threshold: 0.42, radiusBase: 4.8 },
    // Family B: a little reach (recombination jumps gaps) — spreads to ~60%.
    knobs: { phase: 6.4, radiusBase: 6.2, impossibility: 0.28, reach: 0.15, ratchet: 0.30, generativity: 0.66, targetPull: 0, seed: 6 },
    goal: 'No blueprint. Whatever tool or idea spreads and gets copied.',
    lenses: {
      volume: 'Every tool, institution, or price',
      adjacency: 'Recombine two things that already exist',
      ratchet: 'Adoption — what gets kept and copied',
      generativity: 'High — each invention is a part for the next',
      unrealized: 'Inventions whose prerequisites never lined up',
    },
    caveat: '"Adoption" bundles fashion, power, and luck — nothing as clean as a single scalar like energy.',
    child: { note: 'One firm is optimisation: iterating toward a local profit maximum.' },
  },
  {
    id: 'cosmos',
    name: 'The universe complexifying',
    short: 'Cosmos',
    scaleLabel: '≈ 10²¹ m · galaxies',
    family: 'B',
    accent: '#c05bd0',
    palette: mergePalette({ fresh: [0.7, 0.4, 0.75], old: [0.28, 0.1, 0.35], core: [0.85, 0.55, 0.95] }),
    sim: { phase: 8.0, threshold: 0.44, radiusBase: 5.2 },
    // Family B: heaviest impossibility + low generativity — expansion outran much of it. Blooms
    // to only ~51% with the largest unrealized+impossible remainder of the six.
    knobs: { phase: 8.0, radiusBase: 6.2, impossibility: 0.42, reach: 0.2, ratchet: 0.30, generativity: 0.6, targetPull: 0, seed: 7 },
    goal: 'No aim at all — a filter that has been running since the first second.',
    lenses: {
      volume: 'Every structure matter could assemble',
      adjacency: 'One step of gravitational or nuclear assembly',
      ratchet: 'What persists against expansion and decay',
      generativity: 'High — stars forge the atoms that make planets, life…',
      unrealized: 'Structures the expansion outran before they formed',
    },
    caveat: 'Whether the universe itself "reproduces" (Smolin) is speculative — this node is the most poetic and least settled.',
    child: { note: 'One star is a converging search: gravity and pressure settling into hydrostatic equilibrium.' },
  },
]
