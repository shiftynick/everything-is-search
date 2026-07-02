import { useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { writeCellColor, BASE_PALETTE } from '../lib/cellColor'

const _obj = new THREE.Object3D()
const _col = new THREE.Color()

function initMatrices(mesh, space) {
  for (let i = 0; i < space.cells.length; i++) {
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

function paint(mesh, space, t, reveal) {
  const { cells, maxOrder, maxTargetDist } = space
  const ctx = { tOrder: t * maxOrder, band: Math.max(1.5, maxOrder * 0.06), maxOrder, maxTargetDist, mode: 0, reveal, P: BASE_PALETTE }
  for (let i = 0; i < cells.length; i++) {
    writeCellColor(_col, cells[i], ctx)
    mesh.setColorAt(i, _col)
  }
  mesh.instanceColor.needsUpdate = true
}

// The sandbox blob: fills once and settles (so you can read the outcome), re-filling whenever
// the rules change. Click a cell to name it. Cell positions are identical across rule changes,
// so the instance matrices are set once; only colours animate.
export default function SandboxBlob({ space, reveal, onPick }) {
  const meshRef = useRef()
  const anim = useRef({ t: 0 })

  useLayoutEffect(() => {
    initMatrices(meshRef.current, space)
  }, [space.cells.length])

  useLayoutEffect(() => {
    anim.current.t = 0
  }, [space])

  useFrame((_, dt) => {
    const a = anim.current
    a.t += dt * 0.14
    if (a.t > 1.25) a.t = 1.25
    paint(meshRef.current, space, a.t, reveal)
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, space.cells.length]}
      frustumCulled={false}
      onClick={(e) => {
        e.stopPropagation()
        if (e.instanceId != null) onPick(space.cells[e.instanceId])
      }}
    >
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} transparent depthWrite={false} />
    </instancedMesh>
  )
}
