import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

let uid = 0
function id(prefix = 'm') { return `${prefix}-${++uid}` }

export function generateRicartAgrawalaCinema(requester: number, processes: number[]): AlgorithmCinemaPayload {
  const steps: Array<any> = []

  // initial narration
  steps.push({ type: 'narration', id: id('n'), text: `Process ${requester} requests access to CS` } as NarrationStep)

  // send RA_REQUEST from requester to all peers
  const peers = processes.filter((p) => p !== requester)
  peers.forEach((p) => {
    const sendId = id('msg')
    steps.push({ type: 'message', id: sendId, from: requester, to: p, msgType: 'RA_REQUEST' } as MessageStep)
    // simulate network: deliver next
    const deliverId = id('msg')
    steps.push({ type: 'message', id: deliverId, from: requester, to: p, msgType: 'RA_REQUEST' })
  })

  // peers reply immediately (for simplicity)
  peers.forEach((p) => {
    const sendId = id('msg')
    steps.push({ type: 'message', id: sendId, from: p, to: requester, msgType: 'RA_REPLY' } as MessageStep)
    const deliverId = id('msg')
    steps.push({ type: 'message', id: deliverId, from: p, to: requester, msgType: 'RA_REPLY' })
  })

  // when all replies arrived, set requester node state to in_cs
  steps.push({ type: 'narration', id: id('n'), text: `Process ${requester} received all replies and enters CS` } as NarrationStep)
  steps.push({ type: 'node', id: id('ns'), nodeId: requester, state: { color: 'orange' } } as NodeStateStep)

  // hold in CS
  steps.push({ type: 'narration', id: id('n'), text: `Process ${requester} leaves CS` } as NarrationStep)
  steps.push({ type: 'node', id: id('ns'), nodeId: requester, state: { color: 'skyblue' } } as NodeStateStep)

  return { metadata: { name: 'Ricart-Agrawala demo', algo: 'Ricart-Agrawala' }, steps }
}

export default generateRicartAgrawalaCinema
