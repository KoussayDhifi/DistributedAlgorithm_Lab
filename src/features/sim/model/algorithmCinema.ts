export type NodeId = number

export type CinemaNodeState = {
  id: NodeId
  label?: string
  color?: string
  badges?: Record<string, any>
  processId?: number
  clock?: number
}

export type MessageStep = {
  type: 'message'
  id: string
  from: NodeId
  to: NodeId
  msgType: string
  meta?: any
  clock?: number
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

export type CriticalSectionStep = {
  type: 'cs'
  id: string
  nodeId: NodeId
  action: 'enter' | 'leave'
}

export type AlgorithmStep = MessageStep | NodeStateStep | NarrationStep | CriticalSectionStep

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