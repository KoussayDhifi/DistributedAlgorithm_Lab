import { Message } from '../types'

export type BullyState = {
  id: number
  leader?: number
}

export function createBully(id: number) {
  const state: BullyState = { id }

  function startElection(peers: number[], send: (m: Message) => void) {
    peers.forEach((p) => {
      if (p > id) send({ from: id, to: p, type: 'BULLY_ELECTION' })
    })
    // if no responses, declare self leader after timeout
    setTimeout(() => {
      if (state.leader == null) state.leader = id
    }, 500)
  }

  function handle(msg: Message, send: (m: Message) => void) {
    if (msg.type === 'BULLY_ELECTION') {
      // reply with OK and start own election
      send({ from: id, to: msg.from, type: 'BULLY_OK' })
      setTimeout(() => startElection([/* peers unknown here; orchestrator will call */], send), 100)
    } else if (msg.type === 'BULLY_OK') {
      // someone higher is alive; wait for coordinator
    } else if (msg.type === 'BULLY_COORD') {
      state.leader = msg.payload.leader
    }
  }

  return { state, startElection, handle }
}
