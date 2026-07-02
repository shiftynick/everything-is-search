import { useState } from 'react'
import SearchScene from './scenes/SearchScene.jsx'
import ActI from './scenes/ActI.jsx'
import ActII from './scenes/ActII.jsx'
import ActIII from './scenes/ActIII.jsx'

// Phase 2: SearchScene is the new single-canvas foundation. The three legacy acts stay
// reachable behind the nav until Phase 3 folds everything into the one-screen shell.
const SCENES = { new: SearchScene, I: ActI, II: ActII, III: ActIII }

export default function App() {
  const [act, setAct] = useState('new')
  const Scene = SCENES[act]

  return (
    <>
      <Scene />
      <nav className="actnav">
        <button className={act === 'new' ? 'on' : ''} onClick={() => setAct('new')}>New</button>
        <button className={act === 'I' ? 'on' : ''} onClick={() => setAct('I')}>I · Thesis</button>
        <button className={act === 'II' ? 'on' : ''} onClick={() => setAct('II')}>II · Atlas</button>
        <button className={act === 'III' ? 'on' : ''} onClick={() => setAct('III')}>III · Sandbox</button>
      </nav>
    </>
  )
}
