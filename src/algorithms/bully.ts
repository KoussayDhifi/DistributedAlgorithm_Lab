import { Message } from '../types'

export type BullyState = {
  id: number
  leader?: number
  electionInProgress: boolean
  receivedOkay: boolean
}

export function createBully(id: number) {
  const state: BullyState = { id, electionInProgress: false, receivedOkay: false }
  let electionTimeout: ReturnType<typeof setTimeout> | null = null

  function clearElectionTimeout() {
    if (electionTimeout) {
      clearTimeout(electionTimeout)
      electionTimeout = null
    }
  }

  function startElection(peers: number[], send: (m: Message) => void) {
    if (state.electionInProgress) return // avoid multiple concurrent elections

    state.electionInProgress = true
    state.receivedOkay = false
    clearElectionTimeout()

    const higherPeers = peers.filter((p) => p > id)

    if (higherPeers.length === 0) {
      // No higher-numbered process; this process becomes coordinator
      state.leader = id
      state.electionInProgress = false
      // Announce coordinator to all peers
      peers.forEach((p) => {
        send({ from: id, to: p, type: 'BULLY_COORD', payload: { leader: id } })
      })
      return
    }

    // Send election message to all higher-numbered processes
    higherPeers.forEach((p) => {
      send({ from: id, to: p, type: 'BULLY_ELECTION' })
    })

    // Wait for OK responses
    electionTimeout = setTimeout(() => {
      if (!state.receivedOkay) {
        // No OK received; this process becomes coordinator
        state.leader = id
        state.electionInProgress = false
        peers.forEach((p) => {
          send({ from: id, to: p, type: 'BULLY_COORD', payload: { leader: id } })
        })
      } else {
        // Received OK; wait for coordinator announcement from higher process
        state.electionInProgress = false
      }
    }, 600)
  }

  function handle(msg: Message, send: (m: Message) => void, peers?: number[]) {
    if (msg.type === 'BULLY_ELECTION') {
      // Received election message from lower-numbered process
      send({ from: id, to: msg.from, type: 'BULLY_OK' })

      // If not already in election, start own election
      if (!state.electionInProgress && peers) {
        setTimeout(() => {
          startElection(peers, send)
        }, 100)
      }
    } else if (msg.type === 'BULLY_OK') {
      // Received OK; another process is still alive
      state.receivedOkay = true
    } else if (msg.type === 'BULLY_COORD') {
      // Received coordinator announcement
      state.leader = msg.payload.leader
      state.electionInProgress = false
      clearElectionTimeout()
    }
  }

  return { state, startElection, handle, cleanup: clearElectionTimeout }
}
