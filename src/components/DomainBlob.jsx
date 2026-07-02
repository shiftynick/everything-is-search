import { useRef, useMemo, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildSpace } from '../lib/possibilitySpace'
import { writeCellColor } from '../lib/cellColor'

const _obj = new THREE.Object3D()
const _col = new THREE.Color()
const SPACING = 6.5
const DEPTH = 3
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

function initMesh(mesh, space) {
  const n = space.cells.length
  for (let i = 0; i < n; i++) {
    const c = space.cells[i]
    _obj.position.set(c.px, c.py, c.pz)
    _obj.scale.setScalar(0.4)
    _obj.updateMatrix()
    mesh.setMatrixAt(i, _obj.matrix)
    mesh.setColorAt(i, _col.setRGB(0.15, 0.16, 0.15))
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor.needsUpdate = true
}

function paint(mesh, space, t, mode, P, reveal) {
  const { cells, maxOrder, maxTargetDist } = space
  const ctx = { tOrder: t * maxOrder, band: Math.max(1.5, maxOrder * 0.06), maxOrder, maxTargetDist, mode, reveal, P }
  for (let i = 0; i < cells.length; i++) {
    writeCellColor(_col, cells[i], ctx)
    mesh.setColorAt(i, _col)
  }
  mesh.instanceColor.needsUpdate = true
}

// One self-contained domain blob: manages its own fill timeline, its layout along the rail
// (read from the shared focusRef), and the descend crossfade into its nested child search.
export default function DomainBlob({ index, focusRef, domain, reveal, descend }) {
  const groupRef = useRef()
  const mainRef = useRef()
  const childRef = useRef()
  const anim = useRef({ t: 0.25, ct: 0, phase: 0 })

  const space = useMemo(() => buildSpace(13, domain.sim), [domain])
  const child = useMemo(
    () => (domain.child ? buildSpace(11, { phase: domain.sim.phase + 3.1, threshold: 0.36, radiusBase: 4.0 }) : null),
    [domain],
  )
  const P = domain.palette
  const mode = domain.family === 'A' ? 1 : 0

  useLayoutEffect(() => {
    initMesh(mainRef.current, space)
    paint(mainRef.current, space, anim.current.t, mode, P, false)
    if (child && childRef.current) initMesh(childRef.current, child)
  }, [space, child, P, mode])

  useFrame((_, dt) => {
    const a = anim.current
    const g = groupRef.current
    const rel = index - focusRef.current
    if (g) {
      g.position.x = rel * SPACING
      g.position.z = -Math.abs(rel) * DEPTH
      g.rotation.y += dt * 0.12
    }
    const focusFade = clamp(1 - Math.abs(rel) * 0.34, 0.2, 1)

    a.t += dt * 0.1
    if (a.t > 1.2) a.t = 0
    a.phase += ((descend ? 1 : 0) - a.phase) * Math.min(1, dt * 3)

    paint(mainRef.current, space, a.t, mode, P, reveal)
    mainRef.current.material.opacity = focusFade * (1 - a.phase)

    if (child && childRef.current) {
      if (a.phase > 0.02) {
        a.ct += dt * 0.11
        if (a.ct > 1.2) a.ct = 0
        paint(childRef.current, child, a.ct, 1, P, false)
        childRef.current.material.opacity = focusFade * a.phase
        childRef.current.visible = true
      } else if (childRef.current.visible) {
        childRef.current.visible = false
      }
    }
  })

  return (
    <group ref={groupRef}>
      <instancedMesh ref={mainRef} args={[null, null, space.cells.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} transparent depthWrite={false} />
      </instancedMesh>
      {child && (
        <instancedMesh ref={childRef} args={[null, null, child.cells.length]} frustumCulled={false} visible={false}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial toneMapped={false} transparent depthWrite={false} />
        </instancedMesh>
      )}
    </group>
  )
}
