import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

type Matrix = number[][]

type MatrixMessage = {
  key: string
  from: number
  to: number
  matrix: Matrix
  label: string
}

let uid = 0
function id(prefix = 'hm') { return `${prefix}-${++uid}` }

function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row])
}

function formatMatrix(matrix: Matrix) {
  return matrix.map((row) => row.join('')).join('/')
}

function matrixToRows(matrix: Matrix) {
  return matrix.map((row) => row.join(''))
}

function zeroMatrix(size: number): Matrix {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function generateMatrixClockCinema(processes: number[]): AlgorithmCinemaPayload {
  const sortedProcesses = [...processes].sort((a, b) => a - b)
  const size = sortedProcesses.length
  const steps: Array<NarrationStep | MessageStep | NodeStateStep> = []
  const matrices = new Map<number, Matrix>()
  const eventCounters = new Map<number, number>()

  sortedProcesses.forEach((pid) => {
    const matrix = zeroMatrix(size)
    matrices.set(pid, matrix)
    eventCounters.set(pid, 0)
    steps.push({
      type: 'node',
      id: id('init'),
      nodeId: pid,
      state: {
        color: 'skyblue',
        badges: { matrix: formatMatrix(matrix), matrixRows: matrixToRows(matrix), event: 'init' },
      },
    })
  })

  steps.push({
    type: 'narration',
    id: id('n'),
    text: `Initialisation: chaque site possede une matrice ${size} x ${size}.`,
  })

  function indexOf(pid: number) {
    return sortedProcesses.indexOf(pid)
  }

  function nextEventLabel(pid: number) {
    const next = (eventCounters.get(pid) || 0) + 1
    eventCounters.set(pid, next)
    return `e${pid}${next}`
  }

  function nodeStep(pid: number, label: string, kind: string, color: string, extra: Record<string, any> = {}) {
    const matrix = matrices.get(pid)!
    steps.push({
      type: 'node',
      id: id(kind),
      nodeId: pid,
      state: {
        color,
        badges: {
          matrix: formatMatrix(matrix),
          matrixRows: matrixToRows(matrix),
          event: label,
          kind,
          ...extra,
        },
      },
    })
  }

  function localEvent(pid: number) {
    const matrix = matrices.get(pid)!
    const i = indexOf(pid)
    matrix[i][i] += 1
    const label = nextEventLabel(pid)
    nodeStep(pid, label, 'local', '#4dabf7')
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: evenement local sur P${pid}, HM${pid}[${pid},${pid}] est incremente.`,
    })
  }

  function sendEvent(from: number, to: number, forcedLabel?: string): MatrixMessage {
    const matrix = matrices.get(from)!
    const i = indexOf(from)
    const j = indexOf(to)
    matrix[i][i] += 1
    matrix[i][j] += 1
    const label = forcedLabel || nextEventLabel(from)
    const message: MatrixMessage = {
      key: id('mkey'),
      from,
      to,
      matrix: cloneMatrix(matrix),
      label,
    }

    nodeStep(from, label, 'send', '#1971c2', { to })
    steps.push({
      type: 'message',
      id: id('msg'),
      from,
      to,
      msgType: 'HM',
      meta: {
        matrix: formatMatrix(message.matrix),
        matrixRows: matrixToRows(message.matrix),
        phase: 'send',
        messageKey: message.key,
        event: label,
        deliverable: true,
      },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: P${from} envoie un message a P${to} estampille avec HM${from}.`,
    })

    return message
  }

  function canDeliver(message: MatrixMessage) {
    const receiverMatrix = matrices.get(message.to)!
    const sender = indexOf(message.from)
    const receiver = indexOf(message.to)
    const fifoOk = message.matrix[sender][receiver] === receiverMatrix[sender][receiver] + 1
    const causalOk = sortedProcesses.every((pid, k) => k === receiver || message.matrix[k][receiver] <= receiverMatrix[k][receiver])
    return { ok: fifoOk && causalOk, fifoOk, causalOk }
  }

  function rejectDelivery(message: MatrixMessage, reason: string) {
    const label = nextEventLabel(message.to)

    steps.push({
      type: 'message',
      id: id('msg'),
      from: message.from,
      to: message.to,
      msgType: 'HM',
      meta: {
        matrix: formatMatrix(message.matrix),
        matrixRows: matrixToRows(message.matrix),
        phase: 'reject',
        messageKey: message.key,
        event: message.label,
        deliverable: false,
        rejected: true,
      },
    })
    steps.push({
      type: 'node',
      id: id('reject'),
      nodeId: message.to,
      state: {
        color: '#e03131',
        badges: {
          matrix: formatMatrix(matrices.get(message.to)!),
          matrixRows: matrixToRows(matrices.get(message.to)!),
          event: label,
          kind: 'reject',
          rejected: true,
          rejectedMessage: message.label,
        },
      },
    })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: tentative de livraison de ${message.label} a P${message.to} annulee (${reason}). Le message est retarde.`,
    })
  }

  function deliverEvent(message: MatrixMessage) {
    const matrix = matrices.get(message.to)!
    const stamp = message.matrix
    const sender = indexOf(message.from)
    const receiver = indexOf(message.to)
    const label = nextEventLabel(message.to)

    matrix[receiver][receiver] += 1

    for (let k = 0; k < size; k += 1) {
      for (let l = 0; l < size; l += 1) {
        matrix[k][l] = Math.max(matrix[k][l], stamp[k][l])
      }
    }

    steps.push({
      type: 'message',
      id: id('msg'),
      from: message.from,
      to: message.to,
      msgType: 'HM',
      meta: {
        matrix: formatMatrix(message.matrix),
        matrixRows: matrixToRows(message.matrix),
        phase: 'deliver',
        messageKey: message.key,
        event: message.label,
        deliverable: true,
      },
    })
    nodeStep(message.to, label, 'receive', '#2f9e44', { from: message.from, deliveredMessage: message.label })
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `${label}: P${message.to} delivre ${message.label}; FIFO et precedence causale sont maintenant respectees.`,
    })
  }

  if (size < 3) {
    sortedProcesses.forEach((pid) => localEvent(pid))
    const message = sendEvent(sortedProcesses[0], sortedProcesses[Math.min(1, size - 1)])
    deliverEvent(message)
    return {
      metadata: { name: 'Horloge Matricielle', algo: 'matrix-clock', createdAt: new Date().toISOString() },
      steps,
    }
  }

  const p1 = sortedProcesses[0]
  const p2 = sortedProcesses[1]
  const p3 = sortedProcesses[2]

  for (let i = 0; i < Math.floor(Math.random() * 3); i += 1) {
    localEvent(pick(sortedProcesses))
  }

  const dependency = sendEvent(p1, p3, nextEventLabel(p1))
  const dependent = sendEvent(p1, p2, nextEventLabel(p1))
  deliverEvent(dependent)

  const blocked = sendEvent(p2, p3, nextEventLabel(p2))
  const check = canDeliver(blocked)
  if (!check.ok) {
    rejectDelivery(
      blocked,
      !check.fifoOk
        ? `condition FIFO fausse`
        : `condition causale fausse: un message anterieur vers P${p3} manque`,
    )
  }

  for (let i = 0; i < Math.floor(Math.random() * 2); i += 1) {
    localEvent(pick(sortedProcesses))
  }

  deliverEvent(dependency)
  deliverEvent(blocked)

  const extraCount = 1 + Math.floor(Math.random() * Math.max(2, size))
  for (let i = 0; i < extraCount; i += 1) {
    const from = pick(sortedProcesses)
    const to = pick(sortedProcesses.filter((pid) => pid !== from))
    const message = sendEvent(from, to, nextEventLabel(from))
    if (canDeliver(message).ok) deliverEvent(message)
  }

  steps.push({
    type: 'narration',
    id: id('n'),
    text: 'Fin: les messages non causalement delivrables ont ete retardes, puis delivres au premier point valide.',
  })

  return {
    metadata: { name: 'Horloge Matricielle', algo: 'matrix-clock', createdAt: new Date().toISOString() },
    steps,
  }
}

export default generateMatrixClockCinema
