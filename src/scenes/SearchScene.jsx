import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import EngineBlob from '../components/EngineBlob'

// Phase-2 verification scene: one system, live, single persistent Canvas. The switcher /
// preset deck / lens panel come in Phase 3 — this exists to prove the visual foundation.

const DEFAULT_PRESET = {
  grid: 22,
  seed: 3,
  phase: 1.6,
  radiusBase: 6.2,
  impossibility: 0.34,
  reach: 0,
  ratchet: 0.3,
  generativity: 0.65, // one-shot percolation: blooms to ~55% and settles, leaving ~45% of the
  targetPull: 0,      // possible space reachable-but-never-taken — the visible "unrealized".
  maxTicks: 260,
}

// Advances the shared playhead each frame; syncs to React (throttled) for the slider.
function Playhead({ playRef, secondsToFill, onSync }) {
  const acc = useRef(0)
  useFrame((_, dt) => {
    const p = playRef.current
    if (p.playing) {
      p.t += dt / secondsToFill
      if (p.t >= 1) { p.t = 1; p.playing = false }
    }
    acc.current += dt
    if (acc.current > 0.08) { acc.current = 0; onSync(p.t, p.playing) }
  })
  return null
}

// Frames the blob: puts the camera at a distance that fits `radius` with margin.
function CameraFit({ radius, controlsRef }) {
  const { camera } = useThree()
  useEffect(() => {
    if (!radius) return
    const fov = (camera.fov * Math.PI) / 180
    const dist = (radius / Math.tan(fov / 2)) * 1.15
    camera.position.set(0, radius * 0.12, dist)
    camera.near = Math.max(0.1, dist - radius * 2.5)
    camera.far = dist + radius * 4
    camera.updateProjectionMatrix()
    if (controlsRef.current) {
      controlsRef.current.minDistance = dist * 0.55
      controlsRef.current.maxDistance = dist * 1.8
      controlsRef.current.update()
    }
  }, [radius, camera, controlsRef])
  return null
}

export default function SearchScene() {
  const playRef = useRef({ t: 0, playing: true })
  const controlsRef = useRef()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [reveal, setReveal] = useState(false)
  const [result, setResult] = useState(null)

  const preset = useMemo(() => DEFAULT_PRESET, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    return () => cancelAnimationFrame(id)
  }, [])

  const onSync = (nt, np) => { setT(nt); setPlaying(np) }
  const scrub = (v) => { playRef.current.t = v; playRef.current.playing = false; setT(v); setPlaying(false) }
  const toggle = () => {
    const p = playRef.current
    if (p.t >= 1) p.t = 0
    p.playing = !p.playing
    setPlaying(p.playing)
  }
  const replay = () => { playRef.current.t = 0; playRef.current.playing = true; setPlaying(true) }

  const s = result?.stats
  const radius = result?.boundingRadius

  return (
    <div className="app">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#070809']} />
        <fog attach="fog" args={['#070809', radius ? radius * 2.2 : 20, radius ? radius * 5 : 48]} />
        <PerspectiveCamera makeDefault position={[0, 2, 30]} fov={42} />
        <EngineBlob preset={preset} playRef={playRef} reveal={reveal} onResult={setResult} />
        <CameraFit radius={radius} controlsRef={controlsRef} />
        <OrbitControls ref={controlsRef} enablePan={false} enableZoom autoRotate autoRotateSpeed={0.3} />
        <Playhead playRef={playRef} secondsToFill={9} onSync={onSync} />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.25} intensity={1.0} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <header className="masthead">
        <p className="eyebrow">Everything is search</p>
        <h1>The space of the possible</h1>
        <p className="thesis">The same machinery, everywhere: a space fills itself in one adjacent step at a time — and most of it never does.</p>
      </header>

      <div className="legend">
        <span><i className="dot" style={{ background: '#e6fff0' }} /> Adjacent possible</span>
        <span><i className="dot" style={{ background: '#4fbf9c' }} /> Actualized</span>
        <span><i className="dot" style={{ background: '#f2a329' }} /> Never reached</span>
        <span><i className="dot" style={{ background: '#3a2c24' }} /> Impossible</span>
      </div>

      <div className="panel">
        <div className="row">
          <button className="btn" onClick={replay}>↺ Replay</button>
          <button className="btn" onClick={toggle}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
          <input className="range" type="range" min="0" max="1" step="0.001" value={t}
            onChange={(e) => scrub(parseFloat(e.target.value))} aria-label="Timeline" />
          <button className={reveal ? 'btn on' : 'btn'} onClick={() => setReveal(!reveal)}>Reveal the unrealized</button>
        </div>
        {s && (
          <p className="stats">
            {result.verdict} · {s.everReached.toLocaleString()} of {s.possible.toLocaleString()} possible cells reached ·{' '}
            {(s.possible - s.everReached).toLocaleString()} stay dark · {(s.total - s.possible).toLocaleString()} impossible
          </p>
        )}
      </div>
    </div>
  )
}
