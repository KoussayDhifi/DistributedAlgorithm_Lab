import { Message } from '../types'

export type RAState = {
  id: number
  timestamp?: number
  replies: Set<number>
  requesting: boolean
}

export function createRicartAgrawala(id: number) {
  const state: RAState = { id, replies: new Set(), requesting: false }
  const deferred: number[] = []

  function requestCS(time: number, send: (m: Message) => void, peers: number[]) {
    state.requesting = true
    state.timestamp = time
    state.replies.clear()
    peers.forEach((p) => send({ from: id, to: p, type: 'RA_REQUEST', payload: { ts: time } }))
  }

  function handle(msg: Message, send: (m: Message) => void) {
    if (msg.type === 'RA_REQUEST') {
      const theirTs = msg.payload.ts
      const reply = { from: id, to: msg.from, type: 'RA_REPLY' }
      // simple priority: lower timestamp first; tie-break by id
      const iRequesting = state.requesting && (state.timestamp! < theirTs || (state.timestamp === theirTs && id < msg.from))
      if (iRequesting) {
        // defer reply: record requester to reply when we release
        deferred.push(msg.from)
      } else {
        send(reply)
      }
    } else if (msg.type === 'RA_REPLY') {
      state.replies.add(msg.from)
    }
  }

  function release(send: (m: Message) => void) {
    state.requesting = false
    state.timestamp = undefined
    // send replies to all deferred requesters
    while (deferred.length > 0) {
      const to = deferred.shift()!
      send({ from: id, to, type: 'RA_REPLY' })
    }
  }

  function gotAll(peers: number[]) {
    return state.replies.size === peers.length
  }

  return { state, requestCS, handle, gotAll, release }
}
