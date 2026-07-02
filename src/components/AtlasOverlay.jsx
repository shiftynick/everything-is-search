export default function AtlasOverlay({ domain, index, count, go, reveal, setReveal, descend, setDescend, domains }) {
  const isB = domain.family === 'B'

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Act II · the atlas</p>
        <h1>{domain.name}</h1>
        <p className="thesis">{domain.goal}</p>
      </header>

      <div className="atlas-panel">
        <div className="badge-row">
          <span className={isB ? 'badge b' : 'badge a'}>{isB ? 'Family B · blooms' : 'Family A · converges'}</span>
          <span className="scale">{domain.scaleLabel}</span>
        </div>

        <dl className="lenses">
          <div><dt>Possibility volume</dt><dd>{domain.lenses.volume}</dd></div>
          <div><dt>Adjacency</dt><dd>{domain.lenses.adjacency}</dd></div>
          <div><dt>Ratchet</dt><dd>{domain.lenses.ratchet}</dd></div>
          <div><dt>Generativity</dt><dd>{domain.lenses.generativity}</dd></div>
          <div><dt>Stays dark</dt><dd>{domain.lenses.unrealized}</dd></div>
        </dl>

        {descend && domain.child && <p className="nesting">↳ {domain.child.note}</p>}

        <details className="honesty">
          <summary>Where this portrait lies</summary>
          <p>{domain.caveat}</p>
        </details>

        <div className="panel-actions">
          <button className={reveal ? 'btn on' : 'btn'} onClick={() => setReveal(!reveal)}>
            Reveal the unrealized
          </button>
          {domain.child && (
            <button className={descend ? 'btn on' : 'btn'} onClick={() => setDescend(!descend)}>
              {descend ? '⤴ Back out' : '⤵ Descend into a cell'}
            </button>
          )}
        </div>
      </div>

      <div className="scalestrip">
        <button className="arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous scale">‹</button>
        <div className="ticks">
          {domains.map((d, i) => (
            <button key={d.id} className={i === index ? 'tick on' : 'tick'} onClick={() => go(i)}>
              <span className="tickdot" style={{ background: d.accent }} />
              <span className="ticklabel">{d.short}</span>
            </button>
          ))}
        </div>
        <button className="arrow" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label="Next scale">›</button>
      </div>
    </>
  )
}
