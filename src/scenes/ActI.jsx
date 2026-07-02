import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import Blob from '../components/Blob.jsx'
import Overlay from '../components/Overlay.jsx'

export default function ActI() {
  const [stats, setStats] = useState(null)

  // Some embedded/headless webviews don't fire the initial ResizeObserver that r3f relies
  // on, leaving the canvas at its 300x150 default. Nudge a resize once after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="app">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#0a0b0d']} />
        <fog attach="fog" args={['#0a0b0d', 16, 40]} />
        <PerspectiveCamera makeDefault position={[0, 2, 23]} fov={42} />
        <Blob onStats={setStats} />
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.35}
          enablePan={false}
          enableZoom
          minDistance={13}
          maxDistance={34}
        />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.25} intensity={0.9} mipmapBlur />
        </EffectComposer>
      </Canvas>
      <Overlay stats={stats} />
    </div>
  )
}
