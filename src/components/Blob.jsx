import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildSpace } from '../lib/possibilitySpace'
import { useStore } from '../store'

const tmpObj = new THREE.Object3D()
const tmpColor = new THREE.Color()

// palette (linear-ish RGB triples, tuned so the frontier crosses the bloom threshold)
const IMPOSSIBLE = [0.09, 0.09, 0.08]
const FAINT = [0.15, 0.16, 0.15]
const AMBER = [0.95, 0.62, 0.16]
const TEAL_NEW = [0.32, 0.74, 0.6]
const TEAL_OLD = [0.05, 0.32, 0.27]
const FRONTIER = [0.85, 1.0, 0.92]
const CORE = [0.5, 0.95, 0.82]

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export default function Blob({ onStats }) {
  const meshRef = useRef()
  const space = useMemo(() => buildSpace(20), [])
  const { cells, maxOrder, maxTargetDist } = space
  const count = cells.length

  useLayoutEffect(() => {
    if (onStats) onStats(space.stats)
    const mesh = meshRef.current
    for (let i = 0; i < count; i++) {
      tmpObj.position.set(cells[i].px, cells[i].py, cells[i].pz)
      tmpObj.scale.setScalar(0.4)
      tmpObj.updateMatrix()
      mesh.setMatrixAt(i, tmpObj.matrix)
      mesh.setColorAt(i, tmpColor.setRGB(FAINT[0], FAINT[1], FAINT[2]))
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.instanceColor.needsUpdate = true
  }, [count, space, onStats])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    // advance the timeline
    const st = useStore.getState()
    if (st.playing) {
      let nt = st.t + delta * 0.11 * st.speed
      if (nt >= 1) { nt = 1; useStore.setState({ t: 1, playing: false }) }
      else useStore.setState({ t: nt })
    }

    const { t, mode, reveal } = useStore.getState()
    const tOrder = t * maxOrder
    const band = Math.max(1.5, maxOrder * 0.06)

    for (let i = 0; i < count; i++) {
      const cell = cells[i]
      let br, bg, bb // family B (blooms)
      let ar, ag, ab // family A (converges)

      if (cell.impossible) {
        br = ar = IMPOSSIBLE[0]; bg = ag = IMPOSSIBLE[1]; bb = ab = IMPOSSIBLE[2]
      } else if (cell.order === Infinity) {
        const c = reveal ? AMBER : FAINT
        br = c[0]; bg = c[1]; bb = c[2]
        // in A, the unrealized reads dimmer (there is no open frontier to belong to)
        ar = reveal ? AMBER[0] * 0.55 : FAINT[0]
        ag = reveal ? AMBER[1] * 0.55 : FAINT[1]
        ab = reveal ? AMBER[2] * 0.55 : FAINT[2]
      } else if (cell.order > tOrder) {
        br = ar = FAINT[0]; bg = ag = FAINT[1]; bb = ab = FAINT[2]
      } else {
        // arrived. Family B: history + glowing frontier.
        const age = tOrder - cell.order
        if (age < band) {
          br = FRONTIER[0]; bg = FRONTIER[1]; bb = FRONTIER[2]
        } else {
          const k = clamp01(age / maxOrder)
          br = TEAL_NEW[0] + (TEAL_OLD[0] - TEAL_NEW[0]) * k
          bg = TEAL_NEW[1] + (TEAL_OLD[1] - TEAL_NEW[1]) * k
          bb = TEAL_NEW[2] + (TEAL_OLD[2] - TEAL_NEW[2]) * k
        }
        // Family A: brightness collapses toward the optimum, frontier does not glow.
        const prox = 1 - clamp01(cell.targetDist / maxTargetDist)
        const bright = 0.16 + 0.84 * Math.pow(prox, 1.6)
        ar = CORE[0] * bright; ag = CORE[1] * bright; ab = CORE[2] * bright
      }

      const r = br + (ar - br) * mode
      const g = bg + (ag - bg) * mode
      const b = bb + (ab - bb) * mode
      mesh.setColorAt(i, tmpColor.setRGB(r, g, b))
    }
    mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
