import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

type PendingMessage = {
  key: string
  from: number
  to: number
  clock: number
  label: string
}

let uid = 0
function id(prefix = 'lc') { return `${prefix}-${++uid}` }

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function generateLamportClockCinema(processes: number[]): AlgorithmCinemaPayload {
  const sortedProcesses = [...processes].sort((a, b) => a - b)
  const size = sortedProcesses.length
  const steps: Array<NarrationStep | MessageStep | NodeStateStep> = []
  const clocks = new Map<number, number>()
  const eventCounters = new Map<number, number>()
  const pending: PendingMessage[] = []

  // 1. Initialisation : Hi = 0 pour tout i
  sortedProcesses.forEach((pid) => {
    clocks.set(pid, 0)
    eventCounters.set(pid, 0)
    steps.push({
      type: 'node',
      id: id('init'),
      nodeId: pid,
      state: {
        color: 'skyblue',
        badges: { H: '0', event: 'init' },
      },
    })
  })

  steps.push({
    type: 'narration',
    id: id('n'),
    text: `Initialisation: l'horloge scalaire de chaque processus commence a 0.`,
  })

  function nextEventLabel(pid: number) {
    const next = (eventCounters.get(pid) || 0) + 1
    eventCounters.set(pid, next)
    return `e${pid}${next}`
  }

  function localEvent(pid: number) {
    // 2. Événement local : Hi = Hi + 1
    const currentClock = clocks.get(pid)!
    const newClock = currentClock + 1
    clocks.set(pid, newClock)
    const label = nextEventLabel(pid)

    steps.push({
      type: 'node',
      id: id('local'),
      nodeId: pid,
      state: {
        color: '#4dabf7',
        badges: { H: String(newClock), event: label, kind: 'local' },
      },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: evenement local sur P${pid}, horloge incrementee H${pid} = ${newClock}`,
    })
  }

  function sendEvent(from: number) {
    const candidates = sortedProcesses.filter((pid) => pid !== from)
    if (candidates.length === 0) {
      localEvent(from)
      return
    }

    const to = pick(candidates)
    
    // 2. Événement d'émission : Hi = Hi + 1
    const currentClock = clocks.get(from)!
    const newClock = currentClock + 1
    clocks.set(from, newClock)
    const label = nextEventLabel(from)

    // 3. Émission d'un message : envoyer (m, Hi)
    const message: PendingMessage = {
      key: id('mkey'),
      from,
      to,
      clock: newClock,
      label,
    }
    pending.push(message)

    steps.push({
      type: 'node',
      id: id('send-state'),
      nodeId: from,
      state: {
        color: '#1971c2',
        badges: { H: String(newClock), event: label, kind: 'send' },
      },
    })
    steps.push({
      type: 'message',
      id: id('msg'),
      from,
      to,
      msgType: 'LAMPORT',
      meta: { H: message.clock, phase: 'send', messageKey: message.key, event: label },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: P${from} envoie un message a P${to} avec estampille H=${message.clock}`,
    })
  }

  function deliverEvent(index: number) {
    const message = pending.splice(index, 1)[0]
    const localClock = clocks.get(message.to)!
    
    // 4. Réception : Hj = max(Hj, Hi) + 1
    const newClock = Math.max(localClock, message.clock) + 1
    clocks.set(message.to, newClock)

    const label = nextEventLabel(message.to)
    steps.push({
      type: 'message',
      id: id('msg'),
      from: message.from,
      to: message.to,
      msgType: 'LAMPORT',
      meta: { H: message.clock, phase: 'deliver', messageKey: message.key, event: message.label },
    })
    steps.push({
      type: 'node',
      id: id('recv-state'),
      nodeId: message.to,
      state: {
        color: '#2f9e44',
        badges: {
          H: String(newClock),
          event: label,
          kind: 'receive',
          received_H: String(message.clock),
        },
      },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: P${message.to} recoit de P${message.from} avec estampille H=${message.clock}. Nouvelle horloge H${message.to} = max(${localClock}, ${message.clock}) + 1 = ${newClock}`,
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
    text: 'Fin du scenario d\'horloge de Lamport.',
  })

  return {
    metadata: { name: 'Horloge Logique de Lamport', algo: 'lamport-clock', createdAt: new Date().toISOString() },
    steps,
    result: {
      clocks: Object.fromEntries(sortedProcesses.map((pid) => [pid, clocks.get(pid)!])),
    },
  }
}

export default generateLamportClockCinema
