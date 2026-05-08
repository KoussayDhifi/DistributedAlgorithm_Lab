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
                      border: `2px solid ${scenarioId === s.id ? 'var(--app-accent)' : '#e2e8f0'}`,
                      background: scenarioId === s.id ? 'rgba(34, 139, 230, 0.05)' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Text size="sm" fw={600} style={{ color: scenarioId === s.id ? 'var(--app-accent)' : 'var(--app-text)' }}>
                      {s.label}
                    </Text>
                    <Text size="xs" style={{ color: 'var(--app-muted)' }}>{s.description}</Text>
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
            <Button variant="gradient" gradient={{ from: 'teal', to: 'green', deg: 105 }} onClick={onStart}>Run</Button>
            <Button variant="light" color="red" onClick={onStop}>Stop</Button>
          </Group>
          <Divider label={<Text size="xs" c="var(--app-muted)">Algorithm action</Text>} labelPosition="center" />
          {algorithm === 'ricart' && <Button variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} onClick={onRequestCS}>Request critical section</Button>}
          {algorithm === 'token' && <Button variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} onClick={onPassToken}>Pass token</Button>}
          {algorithm === 'bully' && <Button variant="gradient" gradient={{ from: 'violet', to: 'fuchsia' }} onClick={onBullyElection}>Start election</Button>}
          {algorithm === 'suzuki' && <Button variant="gradient" gradient={{ from: 'indigo', to: 'cyan' }} onClick={onSuzukiRequest}>Request critical section</Button>}
          {algorithm === 'lamport' && <Button variant="gradient" gradient={{ from: 'grape', to: 'pink' }} onClick={onLamportScenario}>New Lamport scenario</Button>}
          {algorithm === 'vector' && <Button variant="gradient" gradient={{ from: 'cyan', to: 'blue' }} onClick={onVectorScenario}>New vector-clock scenario</Button>}
          {algorithm === 'matrix' && <Button variant="gradient" gradient={{ from: 'teal', to: 'cyan' }} onClick={onMatrixScenario}>New causal-delivery scenario</Button>}
          <Button variant="subtle" color="gray" onClick={onStep}>Deliver one step</Button>
        </Stack>
      </Paper>
    </Stack>
  )
}
