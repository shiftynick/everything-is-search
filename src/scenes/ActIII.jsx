import { useState, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import SandboxBlob from '../components/SandboxBlob.jsx'
import SandboxOverlay from '../components/SandboxOverlay.jsx'
import { buildSpace } from '../lib/possibilitySpace'

export default function ActIII() {
  const [imp, setImp] = useState(0.15)
  const [reach, setReach] = useState(0.2)
  const [rat, setRat] = useState(0.12)
  const [reveal, setReveal] = useState(false)
  const [pick, setPick] = useState(null)

  const space = useMemo(
    () => buildSpace(16, { threshold: 0.85 - imp * 0.85, reach: 1 + reach * 1.2, ratchet: rat * 0.92 }),
    [imp, reach, rat],
  )

  useEffect(() => { setPick(null) }, [space])
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="app">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#080a0c']} />
        <fog attach="fog" args={['#080a0c', 14, 40]} />
        <PerspectiveCamera makeDefault position={[0, 1.5, 17]} fov={42} />
        <SandboxBlob space={space} reveal={reveal} onPick={setPick} />
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={9}
          maxDistance={30}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.68}
          autoRotate
          autoRotateSpeed={0.3}
        />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.25} intensity={0.9} mipmapBlur />
        </EffectComposer>
      </Canvas>
      <SandboxOverlay
        imp={imp} setImp={setImp}
        reach={reach} setReach={setReach}
        rat={rat} setRat={setRat}
        reveal={reveal} setReveal={setReveal}
        stats={space.stats}
        pick={pick}
      />
    </div>
  )
}
