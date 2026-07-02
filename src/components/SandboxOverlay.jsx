function Row({ label, sub, value, set }) {
  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-sub">{sub}</span>
      </div>
      <input
        className="range"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
        aria-label={label}
      />
      <span className="slider-val">{Math.round(value * 100)}</span>
    </div>
  )
}

function describe(cell) {
  if (cell.impossible) return { tag: 'Impossible', text: "Can't exist under these rules — a structural gap in the space." }
  if (cell.order === Infinity) return { tag: 'The unrealized', text: 'Possible, but nothing ever reached it — a structure that could exist, and does not.' }
  return { tag: 'Actualized', text: 'Reached from the seed and kept — part of what got built.' }
}

export default function SandboxOverlay({ imp, setImp, reach, setReach, rat, setRat, reveal, setReveal, stats, pick }) {
  const frac = stats.possible ? stats.reached / stats.possible : 0
  const verdict = frac < 0.12 ? 'Dies to a core' : frac < 0.5 ? 'Fragments' : 'Blooms'
  const vclass = frac < 0.12 ? 'v-die' : frac < 0.5 ? 'v-frag' : 'v-bloom'
  const reached = Math.round(frac * 100)
  const dark = 100 - reached
  const info = pick ? describe(pick) : null

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Act III · the sandbox</p>
        <h1>Set the rules</h1>
        <p className="thesis">The same dynamics bloom or die depending on three rules. You set them.</p>
      </header>

      <div className="sandbox-panel">
        <div className="sandbox-head">
          <div className="verdict-wrap">
            <span className={'verdict ' + vclass}>{verdict}</span>
            <span className="sandbox-stats">{reached}% actualized · {dark}% never reached</span>
          </div>
          <button className={reveal ? 'btn on' : 'btn'} onClick={() => setReveal(!reveal)}>
            Reveal the unrealized
          </button>
        </div>

        <Row label="Impossibility" sub="how much of the space can't exist" value={imp} set={setImp} />
        <Row label="Reach" sub="how far one step travels" value={reach} set={setReach} />
        <Row label="Ratchet" sub="how selective persistence is" value={rat} set={setRat} />

        {info ? (
          <p className="pick"><b>{info.tag}.</b> {info.text}</p>
        ) : (
          <p className="pick-hint">Click any cell in the blob to name it.</p>
        )}
      </div>
    </>
  )
}
