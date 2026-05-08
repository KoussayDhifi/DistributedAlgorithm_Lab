import React from 'react'
import { Badge, Button, Divider, Group, NumberInput, Paper, Select, Slider, Stack, Switch, Text, Title } from '@mantine/core'
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
  scenarioId: string
  setScenarioId: (id: string) => void
}

const scenarios = [
  {
    id: 'scenario1',
    label: 'Scénario 1 — Seul demandeur',
    description: 'P1 demande seul la SC. Tous les peers répondent immédiatement.',
  },
  {
    id: 'scenario2',
    label: 'Scénario 2 — 2 demandeurs concurrents',
    description: 'P1 et P2 demandent en même temps. P1 a priorité (timestamp plus bas).',
  },
  {
    id: 'scenario3',
    label: 'Scénario 3 — 3 demandeurs concurrents',
    description: 'P1, P2 et P3 demandent en même temps. P1 entre en SC en premier.',
  },
]

const algorithmOptions = [
  { value: 'ricart', label: 'Ricart-Agrawala' },
  { value: 'token', label: 'Token Ring' },
  { value: 'bully', label: 'Bully Election' },
  { value: 'ring', label: 'Ring Election' },
  { value: 'suzuki', label: 'Suzuki-Kasami' },
  { value: 'lamport', label: 'Horloge de Lamport' },
  { value: 'vector', label: 'Horloge Vectorielle (Mattern)' },
  { value: 'matrix', label: 'Horloge Matricielle' },
]


export default function ControlPanel({
  onStart, onStop, onRequestCS, onPassToken, onStep, onRunRingElection, onBullyElection, onSuzukiRequest,
  onLamportScenario, onVectorScenario, onMatrixScenario,
  processes, selectedProcess, setSelectedProcess,
  autoRun, setAutoRun, speed, setSpeed,
  algorithm, setAlgorithm,
  numberOfProcesses, setNumberOfProcesses,
  tokenHolder, setTokenHolder,
  scenarioId, setScenarioId,
}: Props) {
  const requesterLabel = algorithm === 'bully' ? 'Initiator' : 'Requester'
  const processOptions = processes.map((p) => ({ value: String(p), label: `Process ${p}` }))

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text className="eyebrow">Experiment</Text>
          <Title order={4}>Setup</Title>
        </div>
        <Badge variant="light" color={autoRun ? 'green' : 'gray'}>
          {autoRun ? 'Auto' : 'Step'}
        </Badge>
      </Group>

      <Paper className="control-section" withBorder>
        <Stack gap="sm">
          <Select
            label="Algorithm"
            value={algorithm}
            onChange={(v) => setAlgorithm(String(v))}
            data={algorithmOptions}
            searchable
          />
          <NumberInput
            label="Processes"
            value={numberOfProcesses}
            min={1}
            max={50}
            clampBehavior="strict"
            onChange={(v) => setNumberOfProcesses(Number(v) || 1)}
          />
        </Stack>
      </Paper>

      {algorithm === 'ring' && onRunRingElection ? (
        <Paper className="control-section" withBorder>
          <RingElectionControls
            numberOfProcesses={numberOfProcesses}
            onRunElection={onRunRingElection}
          />
        </Paper>
      ) : (
        <Paper className="control-section" withBorder>
          <Stack gap="sm">
            <Select
              label={requesterLabel}
              value={String(selectedProcess)}
              onChange={(v) => setSelectedProcess(Number(v))}
              data={processOptions}
            />
            {algorithm === 'ricart' && (
              <Stack gap={6} mb="sm">
                <Text size="sm" fw={500}>Scénario</Text>
                {scenarios.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setScenarioId(s.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `2px solid ${scenarioId === s.id ? '#228be6' : '#dee2e6'}`,
                      background: scenarioId === s.id ? '#e7f5ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <Text size="sm" fw={600} c={scenarioId === s.id ? 'blue' : 'dark'}>
                      {s.label}
                    </Text>
                    <Text size="xs" c="dimmed">{s.description}</Text>
                  </div>
                ))}
              </Stack>
            )}
            {algorithm === 'suzuki' && (
              <Select
                label="Initial token holder"
                value={String(tokenHolder)}
                onChange={(v) => setTokenHolder(Number(v))}
                data={processOptions}
              />
            )}
            <Switch
              label="Auto deliver queued messages"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.currentTarget.checked)}
            />
            <div>
              <Group justify="space-between" mb={4}>
                <Text size="sm" fw={500}>Realtime speed</Text>
                <Text size="xs" c="dimmed">{speed} ms</Text>
              </Group>
              <Slider min={50} max={2000} step={50} value={speed} onChange={(v) => setSpeed(v)} />
            </div>
          </Stack>
        </Paper>
      )}

      <Paper className="control-section" withBorder>
        <Stack gap="sm">
          <Group grow>
            <Button color="green" onClick={onStart}>Run</Button>
            <Button color="red" variant="light" onClick={onStop}>Stop</Button>
          </Group>
          <Divider label="Algorithm action" labelPosition="center" />
          {algorithm === 'ricart' && <Button variant="light" onClick={onRequestCS}>Request critical section</Button>}
          {algorithm === 'token' && <Button variant="light" onClick={onPassToken}>Pass token</Button>}
          {algorithm === 'bully' && <Button variant="light" onClick={onBullyElection}>Start election</Button>}
          {algorithm === 'suzuki' && <Button variant="light" onClick={onSuzukiRequest}>Request critical section</Button>}
          {algorithm === 'lamport' && <Button variant="light" onClick={onLamportScenario}>New Lamport scenario</Button>}
          {algorithm === 'vector' && <Button variant="light" onClick={onVectorScenario}>New vector-clock scenario</Button>}
          {algorithm === 'matrix' && <Button variant="light" onClick={onMatrixScenario}>New causal-delivery scenario</Button>}
          <Button variant="subtle" onClick={onStep}>Deliver one step</Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
