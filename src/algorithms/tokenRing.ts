import { Message } from '../types'

export type TokenRingState = {
  id: number
  hasToken: boolean
}

export function createTokenRing(id: number) {
  const state: TokenRingState = { id, hasToken: false }

  function passToken(nextId: number, send: (m: Message) => void) {
    if (!state.hasToken) return
    state.hasToken = false
    send({ from: id, to: nextId, type: 'TOKEN' })
  }

  function handle(msg: Message) {
    if (msg.type === 'TOKEN') {
      state.hasToken = true
    }
  }

  return { state, passToken, handle }
}
