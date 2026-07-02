import { useState } from 'react'
import ActI from './scenes/ActI.jsx'
import ActII from './scenes/ActII.jsx'
import ActIII from './scenes/ActIII.jsx'

const SCENES = { I: ActI, II: ActII, III: ActIII }

export default function App() {
  const [act, setAct] = useState('I')
  const Scene = SCENES[act]

  return (
    <>
      <Scene />
      <nav className="actnav">
        <button className={act === 'I' ? 'on' : ''} onClick={() => setAct('I')}>I · Thesis</button>
        <button className={act === 'II' ? 'on' : ''} onClick={() => setAct('II')}>II · Atlas</button>
        <button className={act === 'III' ? 'on' : ''} onClick={() => setAct('III')}>III · Sandbox</button>
      </nav>
    </>
  )
}
