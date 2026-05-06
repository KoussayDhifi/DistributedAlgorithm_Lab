import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

let uid = 0
function id(prefix = 'm') { return `${prefix}-${++uid}` }

export function generateTokenRingCinema(initiator: number, processes: number[]): AlgorithmCinemaPayload {
  const steps: Array<any> = []
  
  steps.push({ type: 'narration', id: id('n'), text: `Process ${initiator} starts passing the token` } as NarrationStep)

  const sortedProcesses = [...processes].sort((a, b) => a - b)
  const startIndex = sortedProcesses.indexOf(initiator)
  
  // Show it traversing the full ring
  for (let i = 0; i < sortedProcesses.length; i++) {
    const current = sortedProcesses[(startIndex + i) % sortedProcesses.length]
    const next = sortedProcesses[(startIndex + i + 1) % sortedProcesses.length]

    steps.push({ type: 'node', id: id('ns'), nodeId: current, state: { color: 'orange' } } as NodeStateStep)
    steps.push({ type: 'narration', id: id('n'), text: `Process ${current} has the token` } as NarrationStep)
    
    const sendId = id('msg')
    steps.push({ type: 'message', id: sendId, from: current, to: next, msgType: 'TOKEN' } as MessageStep)
    const deliverId = id('msg')
    steps.push({ type: 'message', id: deliverId, from: current, to: next, msgType: 'TOKEN' })

    steps.push({ type: 'node', id: id('ns'), nodeId: current, state: { color: 'skyblue' } } as NodeStateStep)
  }

  const finalNode = sortedProcesses[(startIndex + sortedProcesses.length) % sortedProcesses.length]
  steps.push({ type: 'node', id: id('ns'), nodeId: finalNode, state: { color: 'orange' } } as NodeStateStep)
  steps.push({ type: 'narration', id: id('n'), text: `Token ring rotation complete` } as NarrationStep)
  steps.push({ type: 'node', id: id('ns'), nodeId: finalNode, state: { color: 'skyblue' } } as NodeStateStep)

  return { metadata: { name: 'Token Ring demo', algo: 'Token Ring' }, steps }
}

export default generateTokenRingCinema
