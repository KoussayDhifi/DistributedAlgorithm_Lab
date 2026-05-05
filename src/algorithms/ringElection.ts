import { Message } from '../types'

export type RingElectionState = {
  id: number
  leader?: number
}

export function createRingElection(id: number) {
  const state: RingElectionState = { id }

  function startElection(nextId: number, send: (m: Message) => void) {
    send({ from: id, to: nextId, type: 'RING_ELECT', payload: { candidate: id } })
  }

  function handle(msg: Message, send: (m: Message) => void) {
    if (msg.type === 'RING_ELECT') {
      const candidate = msg.payload.candidate
      // forward the highest id
      const newCandidate = Math.max(candidate, state.id)
      if (newCandidate === state.id && msg.from !== state.id) {
        // I'm leader, send coordinator
        send({ from: state.id, to: msg.from, type: 'RING_COORD', payload: { leader: state.id } })
      } else {
        send({ from: state.id, to: msg.to, type: 'RING_ELECT', payload: { candidate: newCandidate } })
      }
    } else if (msg.type === 'RING_COORD') {
      state.leader = msg.payload.leader
    }
  }

  return { state, startElection, handle }
}
