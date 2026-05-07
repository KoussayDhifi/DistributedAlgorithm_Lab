export type NodeId = number

export type CinemaNodeState = {
  id: NodeId
  label?: string
  color?: string
  badges?: Record<string, any>
}

export type MessageStep = {
  type: 'message'
  id: string
  from: NodeId
  to: NodeId
  msgType: string
  meta?: any
}

export type NodeStateStep = {
  type: 'node'
  id: string
  nodeId: NodeId
  state: Partial<CinemaNodeState>
}

export type NarrationStep = {
  type: 'narration'
  id: string
  text: string
}

export type AlgorithmStep = MessageStep | NodeStateStep | NarrationStep

export type AlgorithmCinemaPayload = {
  metadata?: {
    name?: string
    algo?: string
    createdAt?: string
  }
  steps: AlgorithmStep[]
  result?: any
}

export default AlgorithmCinemaPayload