import React from 'react'
import { Button, Stack, Title, Group, Select, Slider, Switch, NumberInput } from '@mantine/core'
import RingElectionControls from './RingElectionControls'
import type { RingVariant } from '../features/sim/algorithms/ringElectionCinema'

type Props = {
  onStart: () => void
  onStop: () => void
  onRequestCS: () => void
  onPassToken: () => void
  onStep: () => void
  onRunRingElection?: (variant: RingVariant, initiators: number[], customIds: number[]) => void
  onBullyElection: () => void
  onSuzukiRequest: () => void
  onLamportScenario: () => void
  onVectorScenario: () => void
  onMatrixScenario: () => void
  processes: number[]
  selectedProcess: number
  setSelectedProcess: (id: number) => void
  autoRun: boolean
  setAutoRun: (v: boolean) => void
  speed: number
  setSpeed: (v: number) => void
  algorithm: string
  setAlgorithm: (a: string) => void
  numberOfProcesses: number
  setNumberOfProcesses: (n: number) => void
  tokenHolder: number
  setTokenHolder: (n: number) => void
}

export default function ControlPanel({
  onStart, onStop, onRequestCS, onPassToken, onStep, onRunRingElection, onBullyElection, onSuzukiRequest,
  onLamportScenario, onVectorScenario, onMatrixScenario,
  processes, selectedProcess, setSelectedProcess,
  autoRun, setAutoRun, speed, setSpeed,
  algorithm, setAlgorithm,
  numberOfProcesses, setNumberOfProcesses,
  tokenHolder, setTokenHolder,
}: Props) {
  return (
    <Stack>
      <Title order={4}>Controls</Title>
      <Group>
        <Button color="green" onClick={onStart}>Start</Button>
        <Button color="red" onClick={onStop}>Stop</Button>
      </Group>
      <Select
        label="Algorithm"
        value={algorithm}
        onChange={(v) => setAlgorithm(String(v))}
        data={[
          { value: 'ricart', label: 'Ricart-Agrawala' },
          { value: 'token', label: 'Token Ring' },
          { value: 'bully', label: 'Bully Election' },
          { value: 'ring', label: 'Ring Election' },
          { value: 'lamport', label: 'Horloge de Lamport' },
          { value: 'vector', label: 'Horloge Vectorielle (Mattern)' },
          { value: 'matrix', label: 'Horloge Matricielle' },
          { value: 'suzuki', label: 'Suzuki-Kasami' },
        ]}
      />
      <NumberInput
        label="Processes"
        value={numberOfProcesses}
        min={1}
        max={50}
        onChange={(v) => setNumberOfProcesses(Number(v) || 1)}
      />

      {algorithm === 'ring' && onRunRingElection && (
        <RingElectionControls
          numberOfProcesses={numberOfProcesses}
          onRunElection={onRunRingElection}
        />
      )}

      {algorithm !== 'ring' && (
        <>
          <Select
            label="Requester"
            value={String(selectedProcess)}
            onChange={(v) => setSelectedProcess(Number(v))}
            data={processes.map((p) => ({ value: String(p), label: `Process ${p}` }))}
          />
          {algorithm === 'suzuki' && (
            <Select
              label="Token Holder initial"
              value={String(tokenHolder)}
              onChange={(v) => setTokenHolder(Number(v))}
              data={processes.map((p) => ({ value: String(p), label: `Process ${p}` }))}
            />
          )}
          <Group gap="xs" align="center">
            <Switch label="Auto Run" checked={autoRun} onChange={(e) => setAutoRun(e.currentTarget.checked)} />
          </Group>
          <Slider label={`Speed: ${speed} ms`} min={50} max={2000} step={50} value={speed} onChange={(v) => setSpeed(v)} />

          {algorithm === 'ricart' && <Button onClick={onRequestCS}>Request CS (Ricart-Agrawala)</Button>}
          {algorithm === 'token' && <Button onClick={onPassToken}>Pass Token (Token Ring)</Button>}
          {algorithm === 'bully' && <Button onClick={onBullyElection}>Start Bully Election</Button>}
          {algorithm === 'suzuki' && <Button onClick={onSuzukiRequest}>Request CS (Suzuki-Kasami)</Button>}
          {algorithm === 'lamport' && <Button onClick={onLamportScenario}>New Random Scenario</Button>}
          {algorithm === 'vector' && <Button onClick={onVectorScenario}>New Random Scenario</Button>}
          {algorithm === 'matrix' && <Button onClick={onMatrixScenario}>New Causal Delivery Scenario</Button>}

          <Group>
            <Button onClick={onStep}>Step</Button>
          </Group>
        </>
      )}
    </Stack>
  )
}
