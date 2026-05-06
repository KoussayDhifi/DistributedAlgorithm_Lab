import React, { useState, useRef, useEffect } from 'react'
import { Container, Grid, Card, Title } from '@mantine/core'
import ControlPanel from './components/ControlPanel'
// Visualizer replaced by GraphCanvas (d3 + cinema model)
import GraphCanvas from './features/sim/components/GraphCanvas'
import RingSnapshotCanvas from './features/sim/components/RingSnapshotCanvas'
import LogView from './components/LogView'
import { SimProvider } from './features/sim/state/SimProvider'
import TimelineControls from './features/sim/components/TimelineControls'
import { Simulator } from './algorithms/simulation'
import { createRicartAgrawala } from './algorithms/ricartAgrawala'
import { createTokenRing } from './algorithms/tokenRing'
import { Process } from './types'
import type { Message } from './types'
import type { RingVariant } from './features/sim/algorithms/ringElectionCinema'

export default function App() {
  const initialProcesses: Process[] = [1, 2, 3, 4, 5].map((id) => ({ id, state: 'idle', log: [] }))
  const [processes, setProcesses] = useState<Process[]>(initialProcesses)
  const [numberOfProcesses, setNumberOfProcesses] = useState<number>(initialProcesses.length)
  const [logs, setLogs] = useState<string[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const simRef = useRef<Simulator | null>(null)
  const raInstances = useRef<any>(null)
  const [selectedProcess, setSelectedProcess] = useState<number>(1)
  const [autoRun, setAutoRun] = useState<boolean>(true)
  const [speed, setSpeed] = useState<number>(300)
  const [algorithm, setAlgorithm] = useState<string>('ricart')

  function appendLog(s: string) {
    setLogs((l) => [...l, new Date().toLocaleTimeString() + ' ' + s].slice(-500))
  }

  function start() {
    const sim = new Simulator({ processes, onLog: appendLog, onMessage: (m) => setMessages((s) => [...s, m].slice(-200)) })
    simRef.current = sim
    // create and register algorithm handlers
    const peers = processes.map((p) => p.id).filter((id) => id !== 1)
    const ras: Record<number, any> = {}
    processes.forEach((p) => {
      const ra = createRicartAgrawala(p.id)
      ras[p.id] = ra
      sim.registerHandler(p.id, (msg) => ra.handle(msg, (m) => sim.send(m)))
    })
    raInstances.current = ras
    if (autoRun) sim.start(speed)
    appendLog('Simulation started')

    // initialize SimProvider processes
    try {
      // dynamic import to avoid circular during boot
      const { dispatch } = require('./features/sim/state/SimProvider').useSim ? require('./features/sim/state/SimProvider') : { dispatch: null }
    } catch (e) {
      // fallback: use global window (we will dispatch via context in a real wiring step)
    }
    // dispatch INIT_PROCESSES
    try {
      // import hook and dispatch
      // We can't call hook here; instead just send a simple CustomEvent for now
      const payload = processes.map((p) => ({ id: p.id, label: `P${p.id}`, color: 'skyblue' }))
      window.dispatchEvent(new CustomEvent('sim:init_processes', { detail: payload }))
    } catch (e) {
      // ignore
    }
  }

  // respond to numberOfProcesses changes by updating processes list and notifying provider
  React.useEffect(() => {
    const newProcs: Process[] = Array.from({ length: numberOfProcesses }).map((_, i) => ({ id: i + 1, state: 'idle', log: [] }))
    setProcesses(newProcs)
    try {
      const payload = newProcs.map((p) => ({ id: p.id, label: `P${p.id}`, color: 'skyblue' }))
      window.dispatchEvent(new CustomEvent('sim:init_processes', { detail: payload }))
    } catch (e) {
      // ignore
    }
    // keep selectedProcess valid
    setSelectedProcess((cur) => Math.max(1, Math.min(cur, numberOfProcesses)))
  }, [numberOfProcesses])

  function stop() {
    simRef.current?.stop()
    appendLog('Simulation stopped')
  }

  async function requestCS() {
    appendLog('Requesting CS (Ricart–Agrawala)')
    const sim = simRef.current
    if (!sim) return appendLog('Start simulation first')
    const requester = selectedProcess
    const peers = processes.map((p) => p.id).filter((id) => id !== requester)
    const ra = raInstances.current?.[requester]
    if (!ra) return appendLog('RA instance missing')
    // mark UI state
    setProcesses((ps) => ps.map((pp) => (pp.id === requester ? { ...pp, state: 'requesting' } : pp)))
    ra.requestCS(Date.now(), (m: Message) => sim.send(m), peers)
    appendLog(`Process ${requester} sent RA_REQUEST to peers`)

    // watch for replies; when all replies received, enter CS
    const checkInterval = setInterval(() => {
      try {
        if (ra.gotAll(peers)) {
          clearInterval(checkInterval)
          appendLog(`Process ${requester} received all RA_REPLY — entering CS`)
          setProcesses((ps) => ps.map((pp) => (pp.id === requester ? { ...pp, state: 'in_cs' } : pp)))
          // hold CS for 2s then release
          setTimeout(() => {
            appendLog(`Process ${requester} leaving CS — releasing replies`)
            ra.release((m: Message) => sim.send(m))
            setProcesses((ps) => ps.map((pp) => (pp.id === requester ? { ...pp, state: 'idle' } : pp)))
          }, 2000)
        }
      } catch (e) {
        clearInterval(checkInterval)
      }
    }, 150)

    // generate and load cinema for deterministic playback demo
    try {
      const { generateRicartAgrawalaCinema } = await import('./features/sim/algorithms/ricartAgrawalaCinema')
      const payload = generateRicartAgrawalaCinema(requester, processes.map((p) => p.id))
      window.dispatchEvent(new CustomEvent('sim:load_cinema', { detail: payload }))
      appendLog('Loaded cinema payload for playback')
    } catch (e) {
      appendLog('Failed to load cinema payload: ' + String(e))
    }
  }

  function step() {
    const sim = simRef.current
    if (!sim) return appendLog('Start simulation first')
    sim.step()
  }

  // control speed and auto-run
  function handleSetAutoRun(v: boolean) {
    setAutoRun(v)
    const sim = simRef.current
    if (!sim) return
    if (v) sim.start(speed)
    else sim.stop()
  }

  function handleSetSpeed(v: number) {
    setSpeed(v)
    const sim = simRef.current
    if (!sim) return
    sim.setTick(v)
  }

  useEffect(() => {
    // notify SimProvider about selected algorithm
    try {
      window.dispatchEvent(new CustomEvent('sim:set_algorithm', { detail: algorithm }))
    } catch (e) {
      // ignore
    }
  }, [algorithm])

  function passToken() {
    appendLog('Pass token (Token Ring) from process 1 to 2')
  }
  
  async function runRingElection(variant: RingVariant, initiators: number[], customIds: number[]) {
    appendLog(`Lancement Ring Election — Variante: ${variant === 'leLann' ? 'Le Lann' : 'Chang-Roberts'}`)
    appendLog(`Initiateurs: ${initiators.map(i => `P${i}`).join(', ')}`)
    
    try {
      const { generateRingElectionCinema } = await import('./features/sim/algorithms/ringElectionCinema')
      
      const ring = processes.map((p, i) => ({
        id: p.id,
        processId: customIds[i] || (i + 1)
      }))
      
      appendLog(`Anneau: ${ring.map(r => `P${r.id}(id=${r.processId})`).join(' → ')}`)
      
      const cinemaProcesses = ring.map(r => ({
        id: r.id,
        label: `P${r.id}`,
        color: 'white',
        processId: r.processId
      }))
      
      window.dispatchEvent(new CustomEvent('sim:init_processes', { detail: cinemaProcesses }))
      
      const payload = generateRingElectionCinema(variant, ring, initiators)
      
      window.dispatchEvent(new CustomEvent('sim:load_cinema', { detail: payload }))
      window.dispatchEvent(new CustomEvent('sim:set_algorithm', { detail: 'ring' }))
      
      appendLog('✓ Scénario chargé')
      
      // Écouter les changements d'index pour afficher les narrations
      window.dispatchEvent(new CustomEvent('sim:enable_narration_logs', { detail: true }))
    } catch (e) {
      appendLog('❌ Erreur: ' + String(e))
      console.error(e)
    }
  }
  
  // Écouter les narrations de la simulation
  useEffect(() => {
    function handleNarration(e: any) {
      const text = e?.detail
      if (typeof text === 'string') {
        appendLog(text)
      }
    }
    window.addEventListener('sim:narration', handleNarration)
    return () => {
      window.removeEventListener('sim:narration', handleNarration)
    }
  }, [])

  return (
    <SimProvider>
      <div className="app">
        <Container fluid>
          <Title order={2}>Distributed Algorithms Simulator — TP</Title>
          <div className="content">
            <div className="left">
              <Card shadow="sm">
                <ControlPanel
                  onStart={start}
                  onStop={stop}
                  onRequestCS={requestCS}
                  onPassToken={passToken}
                  onStep={step}
                  onRunRingElection={runRingElection}
                  processes={processes.map((p) => p.id)}
                  selectedProcess={selectedProcess}
                  setSelectedProcess={setSelectedProcess}
                  autoRun={autoRun}
                  setAutoRun={handleSetAutoRun}
                  speed={speed}
                  setSpeed={handleSetSpeed}
                  algorithm={algorithm}
                  setAlgorithm={setAlgorithm}
                  numberOfProcesses={numberOfProcesses}
                  setNumberOfProcesses={setNumberOfProcesses}
                />
                
                
              </Card>
              <Card shadow="sm" style={{ marginTop: 12 }}>
                <LogView logs={logs} />
              </Card>
            </div>
            <div className="right">
              <Card shadow="sm">
                <div style={{ marginBottom: 8 }}>
                  <React.Suspense fallback={null}>
                    <TimelineControls />
                  </React.Suspense>
                </div>
                {/* Afficher RingSnapshotCanvas uniquement pour Ring Election */}
                {algorithm === 'ring' ? (
                  <RingSnapshotCanvas />
                ) : (
                  <GraphCanvas />
                )}
              </Card>
            </div>
          </div>
        </Container>
      </div>
    </SimProvider>
  )
}
