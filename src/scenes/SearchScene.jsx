import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import EngineBlob from '../components/EngineBlob'
import { DOMAINS } from '../lib/domains.js'

// Phase 3: the one-screen shell. One persistent Canvas, one possibility space, a system
// switcher across the top — each system a preset of the SAME engine (that reuse is the
// argument). Custom unlocks the five knobs. The five-lens copy and the live verdict dock
// beside the canvas; a frontier-size sparkline makes the regime legible as a shape.

const RENDER = { grid: 22, maxTicks: 300 } // rendering budget, shared by every preset
const SYSTEM_IDS = ['physics', 'biology', 'society'] // start with three sharply-tuned systems
const SYSTEMS = SYSTEM_IDS.map((id) => DOMAINS.find((d) => d.id === id)).filter(Boolean)

const KNOBS = [
  { key: 'impossibility', label: 'Impossibility', sub: "how much can't exist" },
  { key: 'reach', label: 'Reach', sub: 'how far one step travels' },
  { key: 'ratchet', label: 'Ratchet', sub: 'how selective persistence is' },
  { key: 'generativity', label: 'Generativity', sub: 'whether the frontier compounds' },
  { key: 'targetPull', label: 'Target pull', sub: 'bias toward an objective' },
]
const CUSTOM_DEFAULT = { phase: 1.6, radiusBase: 6.2, impossibility: 0.34, reach: 0, ratchet: 0.3, generativity: 0.65, targetPull: 0, seed: 3 }

const VERDICT_CLASS = { blooming: 'v-bloom', saturated: 'v-bloom', fragmented: 'v-frag', converged: 'v-frag', died: 'v-die' }
const VERDICT_LINE = {
  blooming: 'Blooming — a living frontier, and most of the space still unrealized.',
  converged: 'Converged — climbed to the one optimum and stopped; the rest stays dark.',
  fragmented: 'Fragmented — filled its pocket; the remainder is walled away.',
  died: 'Died — the frontier went extinct before it spread.',
  saturated: 'Saturated — filled nearly everything it could reach.',
}
const cap = (v) => (v ? v[0].toUpperCase() + v.slice(1) : '')

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

// Frontier size over time — the regime diagnostic made visible. A bloom rises then decays; a
// converged climb is a low flat line; extinction collapses early. Marks the playhead.
function Sparkline({ series, t }) {
  const f = series?.frontier
  if (!f || f.length < 2) return null
  const w = 150, h = 32
  const max = Math.max(1, ...f)
  const pts = f.map((v, i) => `${((i / (f.length - 1)) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label="frontier size over time">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <line x1={t * w} y1="0" x2={t * w} y2={h} stroke="var(--accent)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" />
    </svg>
  )
}

export default function SearchScene() {
  const playRef = useRef({ t: 0, playing: true })
  const controlsRef = useRef()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [reveal, setReveal] = useState(false)
  const [result, setResult] = useState(null)
  const [systemId, setSystemId] = useState('biology')
  const [custom, setCustom] = useState(CUSTOM_DEFAULT)

  const isCustom = systemId === 'custom'
  const system = isCustom ? null : SYSTEMS.find((s) => s.id === systemId)
  const knobs = isCustom ? custom : system.knobs
  const palette = isCustom ? undefined : system.palette

  const preset = useMemo(() => ({ ...RENDER, ...knobs }), [knobs])

  // Re-run from the top whenever the system or a knob changes, so you watch the new space bloom.
  useEffect(() => {
    playRef.current.t = 0
    playRef.current.playing = true
    setT(0)
    setPlaying(true)
  }, [preset])

  // One-shot resize nudge: the hidden-tab preview sometimes skips the initial ResizeObserver.
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
  const setKnob = (key, v) => setCustom((c) => ({ ...c, [key]: v }))
  const fork = () => { setCustom({ ...knobs }); setSystemId('custom') }

  const s = result?.stats
  const radius = result?.boundingRadius
  const verdict = result?.verdict

  return (
    <div className="app">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={['#070809']} />
        <fog attach="fog" args={['#070809', radius ? radius * 2.2 : 20, radius ? radius * 5 : 48]} />
        <PerspectiveCamera makeDefault position={[0, 2, 30]} fov={42} />
        <EngineBlob preset={preset} palette={palette} playRef={playRef} reveal={reveal} onResult={setResult} />
        <CameraFit radius={radius} controlsRef={controlsRef} />
        <OrbitControls ref={controlsRef} enablePan={false} enableZoom autoRotate autoRotateSpeed={0.3} />
        <Playhead playRef={playRef} secondsToFill={9} onSync={onSync} />
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.55} luminanceSmoothing={0.25} intensity={1.0} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <nav className="switcher">
        {SYSTEMS.map((sy) => (
          <button key={sy.id} className={systemId === sy.id ? 'on' : ''} onClick={() => setSystemId(sy.id)}>{sy.short}</button>
        ))}
        <button className={isCustom ? 'on' : ''} onClick={() => setSystemId('custom')}>Custom</button>
      </nav>

      <header className="masthead">
        <p className="eyebrow">Everything is search</p>
        <h1>{isCustom ? 'A space of your own' : system.name}</h1>
        <p className="thesis">{isCustom ? 'Author a possibility space with the five knobs — and watch it bloom, converge, or die.' : system.goal}</p>
      </header>

      <div className="legend">
        <span><i className="dot" style={{ background: '#e6fff0' }} /> Adjacent possible</span>
        <span><i className="dot" style={{ background: '#4fbf9c' }} /> Actualized</span>
        <span><i className="dot" style={{ background: '#f2a329' }} /> Never reached</span>
        <span><i className="dot" style={{ background: '#3a2c24' }} /> Impossible</span>
      </div>

      {isCustom ? (
        <aside className="atlas-panel">
          <div className="badge-row">
            <span className="badge b">Custom</span>
            <span className="scale">your knobs</span>
          </div>
          {KNOBS.map((k) => (
            <div className="slider-row" key={k.key}>
              <span className="slider-label"><span>{k.label}</span><span className="slider-sub">{k.sub}</span></span>
              <input className="range" type="range" min="0" max="1" step="0.01" value={custom[k.key]}
                onChange={(e) => setKnob(k.key, parseFloat(e.target.value))} aria-label={k.label} />
              <span className="slider-val">{custom[k.key].toFixed(2)}</span>
            </div>
          ))}
        </aside>
      ) : (
        <aside className="atlas-panel">
          <div className="badge-row">
            <span className={`badge ${system.family === 'A' ? 'a' : 'b'}`}>Family {system.family} · {system.family === 'A' ? 'converges' : 'blooms'}</span>
            <span className="scale">{system.scaleLabel}</span>
          </div>
          <dl className="lenses">
            <div><dt>Possibility volume</dt><dd>{system.lenses.volume}</dd></div>
            <div><dt>Adjacency</dt><dd>{system.lenses.adjacency}</dd></div>
            <div><dt>Ratchet</dt><dd>{system.lenses.ratchet}</dd></div>
            <div><dt>Generativity</dt><dd>{system.lenses.generativity}</dd></div>
            <div><dt>The unrealized</dt><dd>{system.lenses.unrealized}</dd></div>
          </dl>
          <details className="honesty"><summary>Where this portrait bends</summary><p>{system.caveat}</p></details>
          <div className="panel-actions"><button className="btn" onClick={fork}>Fork to Custom</button></div>
        </aside>
      )}

      <div className="panel">
        <div className="row">
          <button className="btn" onClick={replay}>↺ Replay</button>
          <button className="btn" onClick={toggle}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
          <input className="range" type="range" min="0" max="1" step="0.001" value={t}
            onChange={(e) => scrub(parseFloat(e.target.value))} aria-label="Timeline" />
          <button className={reveal ? 'btn on' : 'btn'} onClick={() => setReveal(!reveal)}>Reveal the unrealized</button>
        </div>
        {s && (
          <div className="verdict-row">
            <div className="verdict-wrap">
              <span className={`verdict ${VERDICT_CLASS[verdict] || ''}`}>{cap(verdict)}</span>
              <span className="sandbox-stats">
                {s.everReached.toLocaleString()} of {s.possible.toLocaleString()} reached ·{' '}
                {(s.possible - s.everReached).toLocaleString()} unrealized · {(s.total - s.possible).toLocaleString()} impossible
              </span>
            </div>
            <span className="spark-wrap" title="frontier size over time"><Sparkline series={result.series} t={t} /></span>
          </div>
        )}
        {verdict && <p className="stats">{VERDICT_LINE[verdict]}</p>}
      </div>
    </div>
  )
}
