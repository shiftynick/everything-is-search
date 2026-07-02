import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { simulate, STATE, EVENT } from '../lib/engine'
import { writeRenderCell } from '../lib/renderCell'

const _obj = new THREE.Object3D()
const _col = new THREE.Color()

// Per-instance alpha: instanced meshes give us per-instance colour for free (instanceColor),
// but not per-instance opacity. We add an `aAlpha` instanced attribute and patch the basic
// material to fold it into the fragment alpha. That's the whole see-through-volume mechanism.
function patchAlpha(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace(
        '#include <dithering_fragment>',
        'gl_FragColor.a *= vAlpha;\n#include <dithering_fragment>',
      )
  }
  material.needsUpdate = true
}

// Scale a cell gets by state. Impossible cells are a touch bigger — a "pore", reads as solid
// exclusion rather than more dust. Frontier cells swell slightly so the rim feels alive.
function scaleFor(state) {
  if (state === STATE.IMPOSSIBLE) return 0.30
  if (state === STATE.FRONTIER) return 0.30
  return 0.24
}

// Run the engine, expose geometry + a live-scrubbed instanced mesh.
//   preset   — knobs {impossibility,reach,ratchet,generativity,targetPull,phase,radiusBase,grid,seed}
//   palette  — optional colour overrides (per domain)
//   playRef  — ref: { t } timeline 0..1; the scene drives it, we render from it
//   reveal   — highlight the unrealized
//   onResult — called once with the sim result (stats, bounding radius, verdict)
export default function EngineBlob({ preset, palette, playRef, reveal, onResult }) {
  const meshRef = useRef()
  const cursor = useRef({ tick: -1 })

  const sim = useMemo(() => simulate(preset), [preset])
  const { cells, events, ticks } = sim
  const count = cells.length

  // Live per-cell working state for replay.
  const work = useMemo(() => {
    const state = new Int8Array(count)
    const lastAct = new Float32Array(count) // tick a cell most recently actualized
    return { state, lastAct }
  }, [count])

  const alphaAttr = useMemo(
    () => new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
    [count],
  )

  // Bounding radius for camera auto-fit; report it up with the stats.
  useLayoutEffect(() => {
    let rad = 1
    for (const c of cells) {
      const d = Math.hypot(c.px, c.py, c.pz)
      if (d > rad) rad = d
    }
    if (onResult) onResult({ ...sim, boundingRadius: rad })
  }, [sim, cells, onResult])

  // Static matrices (positions never move; only colour/alpha/scale animate — but scale is per
  // state, so we rewrite matrices too when a cell changes state). Init at t=0.
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    // Dev-only handle: the preview runs in a hidden tab that freezes rAF, so screenshots are
    // impossible — verification pumps frames and reads pixels off this mesh instead. Stripped
    // from production builds.
    if (import.meta.env.DEV && typeof window !== 'undefined') window.__blob = mesh
    patchAlpha(mesh.material)
    cursor.current.tick = -1 // force a full rebuild on the next frame
    // seed everything dark/impossible so the very first paint isn't a flash of default colour
    for (let i = 0; i < count; i++) {
      work.state[i] = cells[i].impossible ? STATE.IMPOSSIBLE : STATE.DARK
      work.lastAct[i] = 0
      _obj.position.set(cells[i].px, cells[i].py, cells[i].pz)
      _obj.scale.setScalar(scaleFor(work.state[i]))
      _obj.updateMatrix()
      mesh.setMatrixAt(i, _obj.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [sim, cells, count, work])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const t = playRef.current.t
    const target = Math.round(t * ticks)

    // Rewind if the user scrubbed backward: reset to the dark ground state, replay forward.
    if (target < cursor.current.tick) {
      for (let i = 0; i < count; i++) {
        work.state[i] = cells[i].impossible ? STATE.IMPOSSIBLE : STATE.DARK
        work.lastAct[i] = 0
      }
      cursor.current.tick = -1
    }

    // Apply events in (cursor, target]. Events are chronological.
    if (target > cursor.current.tick) {
      // find range by scanning; events list is small (few thousand). Linear scan from a cached
      // index would be faster, but replay only runs when the playhead advances.
      for (const e of events) {
        if (e.t <= cursor.current.tick) continue
        if (e.t > target) break
        if (e.k === EVENT.ACTUALIZE) { work.state[e.i] = STATE.ACTUALIZED; work.lastAct[e.i] = e.t }
        else if (e.k === EVENT.FADE) work.state[e.i] = STATE.FADED
        else if (e.k === EVENT.OPEN) work.state[e.i] = STATE.FRONTIER
        else if (e.k === EVENT.CLOSE) work.state[e.i] = STATE.DARK
      }
      cursor.current.tick = target
    }

    // Repaint: colour + alpha + (state-dependent) scale for every cell.
    const maxAge = Math.max(1, ticks * 0.9)
    const arr = alphaAttr.array
    let matrixDirty = false
    for (let i = 0; i < count; i++) {
      const s = work.state[i]
      const age = s === STATE.ACTUALIZED ? target - work.lastAct[i] : 0
      const a = writeRenderCell(_col, { state: s, age, maxAge, fit: cells[i].fit, reveal }, palette)
      mesh.setColorAt(i, _col)
      arr[i] = a
      // keep scale in sync with state (cheap; only frontier/impossible differ)
      const sc = scaleFor(s)
      _obj.position.set(cells[i].px, cells[i].py, cells[i].pz)
      _obj.scale.setScalar(sc)
      _obj.updateMatrix()
      mesh.setMatrixAt(i, _obj.matrix)
      matrixDirty = true
    }
    mesh.instanceColor.needsUpdate = true
    alphaAttr.needsUpdate = true
    if (matrixDirty) mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]}>
        <primitive object={alphaAttr} attach="attributes-aAlpha" />
      </icosahedronGeometry>
      {/* No `vertexColors`: an InstancedMesh auto-enables USE_INSTANCING_COLOR from
          `instanceColor` (setColorAt). `vertexColors` would additionally switch on USE_COLOR,
          which multiplies by a per-vertex `color` attribute the icosahedron doesn't have —
          it defaults to (0,0,0) and blacks out every cell. */}
      <meshBasicMaterial toneMapped={false} transparent depthWrite={false} />
    </instancedMesh>
  )
}
