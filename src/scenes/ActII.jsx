import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import DomainBlob from '../components/DomainBlob.jsx'
import AtlasOverlay from '../components/AtlasOverlay.jsx'
import { DOMAINS } from '../lib/domains'

// Eases the shared focus value toward the selected domain each frame.
function Rig({ focusRef, focusTargetRef }) {
  useFrame((_, dt) => {
    focusRef.current += (focusTargetRef.current - focusRef.current) * Math.min(1, dt * 4)
  })
  return null
}

export default function ActII() {
  const focusRef = useRef(0)
  const focusTargetRef = useRef(0)
  const [focusIndex, setFocusIndex] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [descend, setDescend] = useState(false)

  const go = (i) => {
    const clamped = Math.max(0, Math.min(DOMAINS.length - 1, i))
    focusTargetRef.current = clamped
    setFocusIndex(clamped)
    setDescend(false)
    setReveal(false)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(focusTargetRef.current + 1)
      if (e.key === 'ArrowLeft') go(focusTargetRef.current - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    return () => cancelAnimationFrame(id)
  }, [])

  const domain = DOMAINS[focusIndex]

  return (
    <div className="app">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#080a0c']} />
        <fog attach="fog" args={['#080a0c', 9, 26]} />
        <PerspectiveCamera makeDefault position={[0, 1.4, 12]} fov={42} />
        {DOMAINS.map((d, i) => (
          <DomainBlob
            key={d.id}
            index={i}
            focusRef={focusRef}
            domain={d}
            reveal={reveal && i === focusIndex}
            descend={descend && i === focusIndex}
          />
        ))}
        <Rig focusRef={focusRef} focusTargetRef={focusTargetRef} />
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={6}
          maxDistance={20}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.68}
          autoRotate
          autoRotateSpeed={0.3}
        />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.25} intensity={0.85} mipmapBlur />
        </EffectComposer>
      </Canvas>
      <AtlasOverlay
        domain={domain}
        index={focusIndex}
        count={DOMAINS.length}
        go={go}
        reveal={reveal}
        setReveal={setReveal}
        descend={descend}
        setDescend={setDescend}
        domains={DOMAINS}
      />
    </div>
  )
}
