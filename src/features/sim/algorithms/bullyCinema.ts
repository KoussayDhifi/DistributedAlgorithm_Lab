import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

let uid = 0
function id(prefix = 'm') { return `${prefix}-${++uid}` }

export function generateBullyCinema(initiator: number, processes: number[]): AlgorithmCinemaPayload {
  const steps: Array<any> = []
  
  steps.push({ type: 'narration', id: id('n'), text: `Process ${initiator} initiates Bully Election` } as NarrationStep)

  const sortedProcesses = [...processes].sort((a, b) => a - b)

  let queue = [initiator]
  let alreadyElected = new Set<number>()
  let currentLeader = -1

  while (queue.length > 0) {
    const current = queue.shift()!
    if (alreadyElected.has(current)) continue
    alreadyElected.add(current)

    const higherPeers = sortedProcesses.filter(p => p > current)

    if (higherPeers.length === 0) {
      steps.push({ type: 'narration', id: id('n'), text: `Process ${current} has no higher peers, it becomes coordinator` } as NarrationStep)
      steps.push({ type: 'node', id: id('ns'), nodeId: current, state: { color: 'purple' } } as NodeStateStep)
      currentLeader = current
      
      const others = sortedProcesses.filter(p => p !== current)
      others.forEach(p => {
        const sendId = id('msg')
        steps.push({ type: 'message', id: sendId, from: current, to: p, msgType: 'BULLY_COORD' } as MessageStep)
        const deliverId = id('msg')
        steps.push({ type: 'message', id: deliverId, from: current, to: p, msgType: 'BULLY_COORD' })
      })
      break
    } else {
      steps.push({ type: 'narration', id: id('n'), text: `Process ${current} sends ELECTION to higher peers` } as NarrationStep)
      higherPeers.forEach(p => {
        const sendId = id('msg')
        steps.push({ type: 'message', id: sendId, from: current, to: p, msgType: 'BULLY_ELECTION' } as MessageStep)
        const deliverId = id('msg')
        steps.push({ type: 'message', id: deliverId, from: current, to: p, msgType: 'BULLY_ELECTION' })
      })

      steps.push({ type: 'narration', id: id('n'), text: `Higher peers reply OK to Process ${current}` } as NarrationStep)
      higherPeers.forEach(p => {
        const sendId = id('msg')
        steps.push({ type: 'message', id: sendId, from: p, to: current, msgType: 'BULLY_OK' } as MessageStep)
        const deliverId = id('msg')
        steps.push({ type: 'message', id: deliverId, from: p, to: current, msgType: 'BULLY_OK' })
        
        queue.push(p)
      })
    }
  }

  return { metadata: { name: 'Bully demo', algo: 'Bully' }, steps }
}

export default generateBullyCinema
