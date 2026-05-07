import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

let uid = 0
function id(prefix = 'm') { return `${prefix}-${++uid}` }

export type RingVariant = 'leLann' | 'changRoberts'

export type RingProcess = {
  id: number
  processId: number
}

export function generateRingElectionCinema(
  variant: RingVariant,
  ring: RingProcess[],
  initiators: number[]
): AlgorithmCinemaPayload {
  uid = 0
  
  if (variant === 'leLann') {
    return generateLeLannCinema(ring, initiators)
  } else {
    return generateChangRobertsCinema(ring, initiators)
  }
}

function generateLeLannCinema(ring: RingProcess[], initiators: number[]): AlgorithmCinemaPayload {
  const steps: Array<any> = []
  const n = ring.length
  
  type ProcessState = {
    min: number
    list: number[]
    isInitiator: boolean
  }
  const states = new Map<number, ProcessState>()
  ring.forEach(p => {
    states.set(p.id, {
      min: p.processId,
      list: initiators.includes(p.id) ? [p.processId] : [],
      isInitiator: initiators.includes(p.id)
    })
  })
  
  steps.push({
    type: 'narration',
    id: id('n'),
    text: `État initial — ${n} processus`
  } as NarrationStep)
  
  ring.forEach(p => {
    steps.push({
      type: 'node',
      id: id('ns'),
      nodeId: p.id,
      state: {
        color: 'white',
        badges: { internal: '' }
      }
    } as NodeStateStep)
  })
  
  steps.push({
    type: 'narration',
    id: id('n'),
    text: `Initiateurs: ${initiators.map(i => {
      const p = ring.find(r => r.id === i)
      return `P${i}(id=${p?.processId})`
    }).join(', ')}`
  } as NarrationStep)
  
  // Phase d'initialisation des initiateurs
  initiators.forEach(initId => {
    const p = ring.find(r => r.id === initId)
    if (!p) return
    const nextIdx = (ring.findIndex(r => r.id === initId) + 1) % n
    const next = ring[nextIdx]
    
    steps.push({
      type: 'node',
      id: id('ns'),
      nodeId: initId,
      state: {
        color: 'red',
        badges: { internal: `[${p.processId}]` }
      }
    } as NodeStateStep)
    
    // Log d'envoi initial
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `P${initId} envoie [${p.processId}] → P${next.id}`
    } as NarrationStep)
    
    steps.push({
      type: 'message',
      id: id('msg'),
      from: initId,
      to: next.id,
      msgType: String(p.processId),
      meta: { value: p.processId }
    } as MessageStep)
  })
  
  const messagesInTransit: Array<{ value: number; currentPos: number; originId: number; tourCount: number }> = []
  
  initiators.forEach(initId => {
    const p = ring.find(r => r.id === initId)
    if (!p) return
    const nextIdx = (ring.findIndex(r => r.id === initId) + 1) % n
    messagesInTransit.push({
      value: p.processId,
      currentPos: nextIdx,
      originId: initId,
      tourCount: 0
    })
  })
  
  let stepCount = 0
  const maxSteps = n * initiators.length * 3
  
  while (messagesInTransit.length > 0 && stepCount < maxSteps) {
    stepCount++
    const msg = messagesInTransit.shift()
    if (!msg) break
    
    const currentProc = ring[msg.currentPos]
    if (!currentProc) continue
    
    const state = states.get(currentProc.id)
    if (!state) continue
    
    const receivedValue = msg.value
    
    if (currentProc.id === msg.originId && msg.tourCount > 0) {
      // Le message est revenu à l'initiateur
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} reçoit son propre ID → ÉLECTION TERMINÉE, élu = P${currentProc.id}`
      } as NarrationStep)
      
      if (state.min === currentProc.processId) {
        steps.push({
          type: 'node',
          id: id('ns'),
          nodeId: currentProc.id,
          state: {
            color: 'green',
            badges: { internal: `✓${currentProc.processId}`, leader: true }
          }
        } as NodeStateStep)
      } else {
        steps.push({
          type: 'node',
          id: id('ns'),
          nodeId: currentProc.id,
          state: {
            color: 'white',
            badges: { internal: `[${state.list.join(',')}]` }
          }
        } as NodeStateStep)
      }
      continue
    }
    
    // Mise à jour de l'état avant le log
    const oldMin = state.min
    if (state.isInitiator) {
      if (receivedValue < state.min) {
        state.min = receivedValue
      }
      if (!state.list.includes(receivedValue)) {
        state.list.push(receivedValue)
      }
      
      steps.push({
        type: 'node',
        id: id('ns'),
        nodeId: currentProc.id,
        state: {
          color: 'red',
          badges: { internal: `[${state.list.join(',')}]` }
        }
      } as NodeStateStep)
      
      // Log détaillé de réception avec mise à jour
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} reçoit [${receivedValue}], min mis à jour : ${state.min}, liste : [${state.list.join(',')}]`
      } as NarrationStep)
    } else {
      steps.push({
        type: 'node',
        id: id('ns'),
        nodeId: currentProc.id,
        state: {
          color: 'blue',
          badges: { internal: '' }
        }
      } as NodeStateStep)
      
      // Log de relais pour non-initiateur
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} reçoit [${receivedValue}] et relaie`
      } as NarrationStep)
    }
    
    const nextIdx = (msg.currentPos + 1) % n
    const next = ring[nextIdx]
    
    // Log d'envoi
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `P${currentProc.id} envoie [${receivedValue}] → P${next.id}`
    } as NarrationStep)
    
    steps.push({
      type: 'message',
      id: id('msg'),
      from: currentProc.id,
      to: next.id,
      msgType: String(receivedValue),
      meta: { value: receivedValue }
    } as MessageStep)
    
    messagesInTransit.push({
      value: receivedValue,
      currentPos: nextIdx,
      originId: msg.originId,
      tourCount: nextIdx === ring.findIndex(r => r.id === msg.originId) ? msg.tourCount + 1 : msg.tourCount
    })
  }
  
  const minId = Math.min(...ring.map(p => p.processId))
  const leaderProc = ring.find(p => p.processId === minId)
  
  if (leaderProc) {
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `✓ Leader élu: P${leaderProc.id}(id=${leaderProc.processId}) — Diffusion ELECTED`
    } as NarrationStep)
    
    // Le leader devient vert en premier
    steps.push({
      type: 'node',
      id: id('ns'),
      nodeId: leaderProc.id,
      state: {
        color: 'green',
        badges: {
          internal: `👑${leaderProc.processId}`,
          leader: true
        }
      }
    } as NodeStateStep)
    
    // Le leader envoie le message ELECTED à son successeur
    const leaderIdx = ring.findIndex(r => r.id === leaderProc.id)
    let currentIdx = (leaderIdx + 1) % n
    const firstNextProc = ring[currentIdx]
    
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `P${leaderProc.id} envoie ELECTED(${leaderProc.processId}) → P${firstNextProc.id}`
    } as NarrationStep)
    
    steps.push({
      type: 'message',
      id: id('msg'),
      from: leaderProc.id,
      to: firstNextProc.id,
      msgType: `L(${leaderProc.processId})`,
      meta: { value: leaderProc.processId, type: 'ELECTED' }
    } as MessageStep)
    
    // Le message fait le tour complet de l'anneau (n-1 processus à informer)
    for (let i = 0; i < n - 1; i++) {
      const currentProc = ring[currentIdx]
      const nextIdx = (currentIdx + 1) % n
      const nextProc = ring[nextIdx]
      
      // Log de réception ELECTED
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} reçoit ELECTED(${leaderProc.processId}) → devient vert`
      } as NarrationStep)
      
      // Le processus actuel reçoit le message et devient vert
      steps.push({
        type: 'node',
        id: id('ns'),
        nodeId: currentProc.id,
        state: {
          color: 'green',
          badges: {
            internal: `L=${leaderProc.processId}`,
            leader: false
          }
        }
      } as NodeStateStep)
      
      // Log d'envoi ELECTED
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} envoie ELECTED(${leaderProc.processId}) → P${nextProc.id}`
      } as NarrationStep)
      
      // Envoyer au suivant (même si c'est le leader, pour montrer le tour complet)
      steps.push({
        type: 'message',
        id: id('msg'),
        from: currentProc.id,
        to: nextProc.id,
        msgType: `L(${leaderProc.processId})`,
        meta: { value: leaderProc.processId, type: 'ELECTED' }
      } as MessageStep)
      
      currentIdx = nextIdx
    }
    
    // Le message revient au leader - fin du tour
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `Le message ELECTED revient à P${leaderProc.id} → tour complet terminé`
    } as NarrationStep)
    
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `✓ Tous les processus connaissent le leader P${leaderProc.id}(id=${leaderProc.processId})`
    } as NarrationStep)
  }
  
  return {
    metadata: {
      name: 'Ring Election — Le Lann',
      algo: 'Ring Election (Le Lann)'
    },
    steps
  }
}

function generateChangRobertsCinema(ring: RingProcess[], initiators: number[]): AlgorithmCinemaPayload {
  const steps: Array<any> = []
  const n = ring.length
  
  type ProcessState = {
    participant: boolean
    coordinator: number | null
    currentCandidate: number
  }
  const states = new Map<number, ProcessState>()
  ring.forEach(p => {
    states.set(p.id, {
      participant: initiators.includes(p.id),
      coordinator: null,
      currentCandidate: p.processId
    })
  })
  
  steps.push({
    type: 'narration',
    id: id('n'),
    text: `État initial — ${n} processus`
  } as NarrationStep)
  
  ring.forEach(p => {
    steps.push({
      type: 'node',
      id: id('ns'),
      nodeId: p.id,
      state: {
        color: 'white',
        badges: { internal: '' }
      }
    } as NodeStateStep)
  })
  
  steps.push({
    type: 'narration',
    id: id('n'),
    text: `Initiateurs: ${initiators.map(i => {
      const p = ring.find(r => r.id === i)
      return `P${i}(id=${p?.processId})`
    }).join(', ')}`
  } as NarrationStep)
  
  // Phase d'initialisation des initiateurs
  initiators.forEach(initId => {
    const p = ring.find(r => r.id === initId)
    if (!p) return
    const nextIdx = (ring.findIndex(r => r.id === initId) + 1) % n
    const next = ring[nextIdx]
    
    steps.push({
      type: 'node',
      id: id('ns'),
      nodeId: initId,
      state: {
        color: 'red',
        badges: { internal: `[${p.processId}]` }
      }
    } as NodeStateStep)
    
    // Log d'envoi initial
    steps.push({
      type: 'narration',
      id: id('n'),
      text: `P${initId} envoie election(${p.processId}) → P${next.id}`
    } as NarrationStep)
    
    steps.push({
      type: 'message',
      id: id('msg'),
      from: initId,
      to: next.id,
      msgType: `E(${p.processId})`,
      meta: { value: p.processId, type: 'ELECT' }
    } as MessageStep)
  })
  
  const messagesInTransit: Array<{ value: number; currentPos: number; originId: number }> = []
  
  initiators.forEach(initId => {
    const p = ring.find(r => r.id === initId)
    if (!p) return
    const nextIdx = (ring.findIndex(r => r.id === initId) + 1) % n
    messagesInTransit.push({
      value: p.processId,
      currentPos: nextIdx,
      originId: initId
    })
  })
  
  let stepCount = 0
  const maxSteps = n * initiators.length * 4
  
  while (messagesInTransit.length > 0 && stepCount < maxSteps) {
    stepCount++
    const msg = messagesInTransit.shift()
    if (!msg) break
    
    const currentProc = ring[msg.currentPos]
    if (!currentProc) continue
    
    const state = states.get(currentProc.id)
    if (!state) continue
    
    const j = msg.value
    const i = currentProc.processId
    
    // CAS 3 : Le message revient à son origine → ÉLECTION
    if (currentProc.id === msg.originId) {
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} reçoit son propre ID → LEADER ÉLU = P${currentProc.id}(id=${i}) (MIN ID)`
      } as NarrationStep)
      
      steps.push({
        type: 'node',
        id: id('ns'),
        nodeId: currentProc.id,
        state: {
          color: 'green',
          badges: { internal: `👑${i}`, leader: true }
        }
      } as NodeStateStep)
      
      state.coordinator = i
      state.participant = false
      
      // Diffusion du message elu
      const nextIdx = (msg.currentPos + 1) % n
      const next = ring[nextIdx]
      
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} diffuse elu(${i}) → P${next.id}`
      } as NarrationStep)
      
      steps.push({
        type: 'message',
        id: id('msg'),
        from: currentProc.id,
        to: next.id,
        msgType: `L(${i})`,
        meta: { value: i, type: 'ELECTED' }
      } as MessageStep)
      
      // Diffuser à tous les autres processus (tour complet)
      let electedPos = nextIdx
      for (let k = 0; k < n - 1; k++) {
        const proc = ring[electedPos]
        if (!proc) continue
        
        const procState = states.get(proc.id)
        if (procState) {
          procState.coordinator = i
          procState.participant = false
        }
        
        steps.push({
          type: 'narration',
          id: id('n'),
          text: `P${proc.id} reçoit elu(${i}) → coordinateur=${i}`
        } as NarrationStep)
        
        steps.push({
          type: 'node',
          id: id('ns'),
          nodeId: proc.id,
          state: {
            color: 'green',
            badges: { internal: `👑${i}` }
          }
        } as NodeStateStep)
        
        const nextElectedIdx = (electedPos + 1) % n
        const nextProc = ring[nextElectedIdx]
        if (nextProc) {
          steps.push({
            type: 'narration',
            id: id('n'),
            text: `P${proc.id} diffuse elu(${i}) → P${nextProc.id}`
          } as NarrationStep)
          
          steps.push({
            type: 'message',
            id: id('msg'),
            from: proc.id,
            to: nextProc.id,
            msgType: `L(${i})`,
            meta: { value: i, type: 'ELECTED' }
          } as MessageStep)
        }
        electedPos = nextElectedIdx
      }
      
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `✓ Élection terminée — coordinateur = P${currentProc.id}(id=${i}) (MIN ID)`
      } as NarrationStep)
      
      break
    }
    
    // CAS 1 : j < i → relayer le message (j est plus petit, il continue)
    if (j < i) {
      state.participant = true
      state.currentCandidate = j
      
      steps.push({
        type: 'narration',
        id: id('n'),
        text: `P${currentProc.id} reçoit election(${j}), ${j} < ${i} → relaie`
      } as NarrationStep)
      
      steps.push({
        type: 'node',
        id: id('ns'),
        nodeId: currentProc.id,
        state: {
          color: 'blue',
          badges: { internal: `[${j}]` }
        }
      } as NodeStateStep)
      
      const nextIdx = (msg.currentPos + 1) % n
      const next = ring[nextIdx]
      if (next) {
        steps.push({
          type: 'narration',
          id: id('n'),
          text: `P${currentProc.id} envoie election(${j}) → P${next.id}`
        } as NarrationStep)
        
        steps.push({
          type: 'message',
          id: id('msg'),
          from: currentProc.id,
          to: next.id,
          msgType: `E(${j})`,
          meta: { value: j, type: 'ELECT' }
        } as MessageStep)
        
        messagesInTransit.push({
          value: j,
          currentPos: nextIdx,
          originId: msg.originId
        })
      }
    } 
    // CAS 2 : j > i → écraser le message (mon ID est plus petit)
    else if (j > i) {
      if (!state.participant) {
        state.participant = true
        state.currentCandidate = i
        
        steps.push({
          type: 'narration',
          id: id('n'),
          text: `P${currentProc.id} reçoit election(${j}), ${j} > ${i} → supprime ❌`
        } as NarrationStep)
        
        // Afficher le message supprimé
        steps.push({
          type: 'message',
          id: id('msg'),
          from: currentProc.id,
          to: currentProc.id,
          msgType: `E(${j})`,
          meta: { value: j, type: 'ELECT', deleted: true }
        } as MessageStep)
        
        steps.push({
          type: 'narration',
          id: id('n'),
          text: `P${currentProc.id} remplace par election(${i}) (${i} < ${j})`
        } as NarrationStep)
        
        steps.push({
          type: 'node',
          id: id('ns'),
          nodeId: currentProc.id,
          state: {
            color: 'red',
            badges: { internal: `[${i}]` }
          }
        } as NodeStateStep)
        
        const nextIdx = (msg.currentPos + 1) % n
        const next = ring[nextIdx]
        if (next) {
          steps.push({
            type: 'narration',
            id: id('n'),
            text: `P${currentProc.id} envoie election(${i}) → P${next.id}`
          } as NarrationStep)
          
          steps.push({
            type: 'message',
            id: id('msg'),
            from: currentProc.id,
            to: next.id,
            msgType: `E(${i})`,
            meta: { value: i, type: 'ELECT' }
          } as MessageStep)
          
          messagesInTransit.push({
            value: i,
            currentPos: nextIdx,
            originId: currentProc.id
          })
        }
      } else {
        // Déjà participant → ignorer le message
        steps.push({
          type: 'narration',
          id: id('n'),
          text: `P${currentProc.id} reçoit election(${j}), déjà participant → ignore ❌`
        } as NarrationStep)
        
        // Afficher le message ignoré
        steps.push({
          type: 'message',
          id: id('msg'),
          from: currentProc.id,
          to: currentProc.id,
          msgType: `E(${j})`,
          meta: { value: j, type: 'ELECT', deleted: true }
        } as MessageStep)
      }
    }
  }
  
  return {
    metadata: {
      name: 'Ring Election — Chang-Roberts',
      algo: 'Ring Election (Chang-Roberts)'
    },
    steps
  }
}

export default generateRingElectionCinema
