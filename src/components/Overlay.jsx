import { useStore } from '../store'

function Timeline() {
  const t = useStore((s) => s.t)
  const setT = useStore((s) => s.setT)
  return (
    <input
      className="range"
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={t}
      onChange={(e) => setT(parseFloat(e.target.value))}
      aria-label="Timeline — fraction of the fill revealed"
    />
  )
}

export default function Overlay({ stats }) {
  const playing = useStore((s) => s.playing)
  const mode = useStore((s) => s.mode)
  const reveal = useStore((s) => s.reveal)
  const setMode = useStore((s) => s.setMode)
  const toggleReveal = useStore((s) => s.toggleReveal)
  const togglePlay = useStore((s) => s.togglePlay)
  const replay = useStore((s) => s.replay)

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Act I · the thesis</p>
        <h1>The space of the possible</h1>
        <p className="thesis">
          Nothing is searching. The possible is filling itself in, one adjacent step at a
          time — and most of it never will.
        </p>
      </header>

      <div className="legend">
        <span><i className="dot" style={{ background: '#dbffe9' }} /> Adjacent possible</span>
        <span><i className="dot" style={{ background: '#4fbf9c' }} /> Actualized</span>
        <span><i className="dot" style={{ background: '#f29e29' }} /> Never reached</span>
        <span><i className="dot" style={{ background: '#4a4a46' }} /> Impossible</span>
      </div>

      <div className="panel">
        <div className="row">
          <button className="btn" onClick={replay} title="Replay the fill">↺ Replay</button>
          <button className="btn" onClick={togglePlay}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <Timeline />
        </div>

        <div className="row">
          <label className="mode-label">Open-ended <span className="muted">(blooms)</span></label>
          <input
            className="range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={mode}
            onChange={(e) => setMode(parseFloat(e.target.value))}
            aria-label="Family — open-ended to optimization"
          />
          <label className="mode-label right">Optimization <span className="muted">(converges)</span></label>
          <button className={reveal ? 'btn on' : 'btn'} onClick={toggleReveal}>
            Reveal the unrealized
          </button>
        </div>

        {stats && (
          <p className="stats">
            {stats.reached.toLocaleString()} of {stats.possible.toLocaleString()} possible cells ever
            get reached · {(stats.possible - stats.reached).toLocaleString()} stay dark forever
          </p>
        )}
      </div>
    </>
  )
}
