import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

type PendingMessage = {
  key: string
  from: number
  to: number
  vector: number[]
  label: string
}

let uid = 0
function id(prefix = 'vc') { return `${prefix}-${++uid}` }

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function formatVector(vector: number[]) {
  return `[${vector.join(',')}]`
}

function cloneVector(vector: number[]) {
  return [...vector]
}

export function generateVectorClockCinema(processes: number[]): AlgorithmCinemaPayload {
  const sortedProcesses = [...processes].sort((a, b) => a - b)
  const size = sortedProcesses.length
  const steps: Array<NarrationStep | MessageStep | NodeStateStep> = []
  const vectors = new Map<number, number[]>()
  const eventCounters = new Map<number, number>()
  const pending: PendingMessage[] = []

  sortedProcesses.forEach((pid) => {
    const vector = Array(size).fill(0)
    vectors.set(pid, vector)
    eventCounters.set(pid, 0)
    steps.push({
      type: 'node',
      id: id('init'),
      nodeId: pid,
      state: {
        color: 'skyblue',
        badges: { vector: formatVector(vector), event: 'init' },
      },
    })
  })

  steps.push({
    type: 'narration',
    id: id('n'),
    text: `Initialisation: chaque processus commence avec ${formatVector(Array(size).fill(0))}`,
  })

  function nextEventLabel(pid: number) {
    const next = (eventCounters.get(pid) || 0) + 1
    eventCounters.set(pid, next)
    return `e${pid}${next}`
  }

  function localEvent(pid: number) {
    const vector = vectors.get(pid)!
    const index = sortedProcesses.indexOf(pid)
    vector[index] += 1
    const label = nextEventLabel(pid)

    steps.push({
      type: 'node',
      id: id('local'),
      nodeId: pid,
      state: {
        color: '#4dabf7',
        badges: { vector: formatVector(vector), event: label, kind: 'local' },
      },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: evenement local sur P${pid}, V${pid} = ${formatVector(vector)}`,
    })
  }

  function sendEvent(from: number) {
    const candidates = sortedProcesses.filter((pid) => pid !== from)
    if (candidates.length === 0) {
      localEvent(from)
      return
    }

    const to = pick(candidates)
    const vector = vectors.get(from)!
    const index = sortedProcesses.indexOf(from)
    vector[index] += 1
    const label = nextEventLabel(from)
    const message: PendingMessage = {
      key: id('mkey'),
      from,
      to,
      vector: cloneVector(vector),
      label,
    }
    pending.push(message)

    steps.push({
      type: 'node',
      id: id('send-state'),
      nodeId: from,
      state: {
        color: '#1971c2',
        badges: { vector: formatVector(vector), event: label, kind: 'send' },
      },
    })
    steps.push({
      type: 'message',
      id: id('msg'),
      from,
      to,
      msgType: 'VC',
      meta: { vector: formatVector(message.vector), phase: 'send', messageKey: message.key, event: label },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: P${from} envoie un message a P${to} avec ${formatVector(message.vector)}`,
    })
  }

  function deliverEvent(index: number) {
    const message = pending.splice(index, 1)[0]
    const vector = vectors.get(message.to)!
    const receiverIndex = sortedProcesses.indexOf(message.to)
    const before = cloneVector(vector)

    vector[receiverIndex] += 1
    for (let i = 0; i < size; i += 1) {
      if (i !== receiverIndex) vector[i] = Math.max(vector[i], message.vector[i])
    }

    const label = nextEventLabel(message.to)
    steps.push({
      type: 'message',
      id: id('msg'),
      from: message.from,
      to: message.to,
      msgType: 'VC',
      meta: { vector: formatVector(message.vector), phase: 'deliver', messageKey: message.key, event: message.label },
    })
    steps.push({
      type: 'node',
      id: id('recv-state'),
      nodeId: message.to,
      state: {
        color: '#2f9e44',
        badges: {
          vector: formatVector(vector),
          event: label,
          kind: 'receive',
          received: formatVector(message.vector),
        },
      },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: P${message.to} recoit de P${message.from}. ${formatVector(before)} devient ${formatVector(vector)}`,
    })
  }

  const eventBudget = Math.max(8, size * 4 + Math.floor(Math.random() * Math.max(3, size * 3)))

  for (let i = 0; i < eventBudget; i += 1) {
    const canDeliver = pending.length > 0
    const roll = Math.random()

    if (canDeliver && roll < 0.35) {
      deliverEvent(Math.floor(Math.random() * pending.length))
    } else if (size > 1 && roll < 0.78) {
      sendEvent(pick(sortedProcesses))
    } else {
      localEvent(pick(sortedProcesses))
    }
  }

  while (pending.length > 0 && Math.random() < 0.8) {
    deliverEvent(Math.floor(Math.random() * pending.length))
  }

  steps.push({
    type: 'narration',
    id: id('n'),
    text: 'Fin du scenario: les vecteurs comparables indiquent une precedence causale; les vecteurs incomparables indiquent des evenements concurrents.',
  })

  return {
    metadata: { name: 'Horloge Vectorielle de Mattern', algo: 'vector-clock', createdAt: new Date().toISOString() },
    steps,
    result: {
      vectors: Object.fromEntries(sortedProcesses.map((pid) => [pid, formatVector(vectors.get(pid)!)])),
    },
  }
}

export default generateVectorClockCinema
