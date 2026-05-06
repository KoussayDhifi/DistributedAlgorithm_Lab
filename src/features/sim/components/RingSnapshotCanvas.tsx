import React, { useMemo } from 'react'
import { useSim } from '../state/SimProvider'
import type { AlgorithmStep, NodeStateStep, MessageStep } from '../model/algorithmCinema'

/**
 * Composant d'affichage des snapshots Ring Election côte à côte
 * Chaque snapshot = un petit anneau circulaire avec processus colorés et messages
 */
export default function RingSnapshotCanvas() {
  const { state } = useSim()
  
  console.log('🔍 RingSnapshotCanvas render - state.processes:', state.processes)
  
  const snapshots = useMemo(() => {
    console.log('🔍 buildSnapshots called with processes:', state.processes)
    const result = buildSnapshots(state.processes, state.steps, state.index)
    console.log('🔍 buildSnapshots result - first snapshot:', result[0])
    if (result.length > 1) {
      console.log('🔍 buildSnapshots result - second snapshot:', result[1])
    }
    return result
  }, [state.processes, state.steps, state.index])
  
  const snapshotSize = 240
  const gap = 28
  
  return (
    <div style={{
      width: '100%',
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid #e0e0e0',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '12px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: 15,
        fontWeight: 700,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Snapshots de l'élection ({snapshots.length})</span>
        <span style={{ fontSize: 10, opacity: 0.8 }}>
          Debug: {state.processes.map(p => `${p.id}:${p.processId ?? '?'}`).join(' ')}
        </span>
        {snapshots.length > 10 && (
          <span style={{ fontSize: 12, opacity: 0.9 }}>
            Grille scrollable ↓
          </span>
        )}
      </div>
      
      <div style={{
        overflowX: 'hidden',
        overflowY: 'auto',
        padding: '20px',
        background: '#fafafa',
        maxHeight: '700px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 240px)',
          gap: gap,
          justifyContent: 'center'
        }}>
          {snapshots.map((snap, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: snapshotSize
              }}
            >
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 8,
                color: idx === snapshots.length - 1 ? '#4CAF50' : '#333',
                textAlign: 'center',
                padding: '4px 8px',
                background: idx === snapshots.length - 1 ? '#e8f5e9' : '#fff',
                borderRadius: 4,
                border: `2px solid ${idx === snapshots.length - 1 ? '#4CAF50' : '#ddd'}`,
                whiteSpace: 'nowrap'
              }}>
                {snap.label}
              </div>
              <div style={{
                border: idx === snapshots.length - 1 ? '3px solid #4CAF50' : '2px solid #ccc',
                borderRadius: 8,
                background: '#fff',
                boxShadow: idx === snapshots.length - 1 
                  ? '0 6px 16px rgba(76,175,80,0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.08)',
                padding: 10,
                transition: 'all 0.3s ease'
              }}>
                <RingSnapshot
                  processes={snap.processes}
                  messages={snap.messages}
                  size={snapshotSize}
                />
              </div>
              {snap.isFinal && (
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 8,
                  color: '#fff',
                  background: '#4CAF50',
                  padding: '4px 12px',
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(76,175,80,0.3)',
                  whiteSpace: 'nowrap'
                }}>
                  ✓ Terminée
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

type SnapshotData = {
  label: string
  processes: Array<{
    id: number
    processId: number
    color: string
    badge: string
    isLeader?: boolean
  }>
  messages: Array<{
    from: number
    to: number
    value: string
    deleted?: boolean
  }>
  isFinal: boolean
}

/**
 * Construit les snapshots à partir des steps
 */
function buildSnapshots(
  initialProcesses: any[],
  steps: AlgorithmStep[],
  currentIndex: number
): SnapshotData[] {
  const snapshots: SnapshotData[] = []
  
  if (initialProcesses.length === 0) return snapshots
  
  // Debug: vérifier si processId est présent
  if (initialProcesses.length > 0 && initialProcesses[0].processId == null) {
    console.error('❌ processId manquant dans initialProcesses:', initialProcesses)
  }
  
  const initialSnapshot: SnapshotData = {
    label: 't=0 (Initial)',
    processes: initialProcesses.map(p => ({
      id: p.id,
      processId: p.processId != null ? p.processId : p.id,
      color: 'white',
      badge: '',
      isLeader: false
    })),
    messages: [],
    isFinal: false
  }
  snapshots.push(initialSnapshot)
  
  const processStates = new Map<number, any>()
  initialProcesses.forEach(p => {
    const processId = p.processId != null ? p.processId : p.id
    console.log(`🔍 Init processState for p.id=${p.id}, processId=${processId}`)
    processStates.set(p.id, {
      id: p.id,
      processId: processId,
      color: 'white',
      badge: '',
      isLeader: false
    })
  })
  
  // Messages en transit
  let messagesInTransit: Array<{ from: number; to: number; value: string; deleted?: boolean }> = []
  
  let snapshotCount = 0
  const maxSnapshots = 30 // limite pour éviter trop de snapshots
  
  // Parcourir les steps visibles
  const visibleSteps = steps.slice(0, currentIndex)
  
  for (let i = 0; i < visibleSteps.length && snapshotCount < maxSnapshots; i++) {
    const step = visibleSteps[i]
    
    if (step.type === 'node') {
      const nodeStep = step as NodeStateStep
      const proc = processStates.get(nodeStep.nodeId)
      if (proc) {
        if (nodeStep.state.color) proc.color = nodeStep.state.color
        if (nodeStep.state.badges?.internal) proc.badge = nodeStep.state.badges.internal
        if (nodeStep.state.badges?.leader) proc.isLeader = true
      }
    } else if (step.type === 'message') {
      const msgStep = step as MessageStep
      
      // Ajouter le message en transit
      messagesInTransit.push({
        from: msgStep.from,
        to: msgStep.to,
        value: msgStep.msgType,
        deleted: msgStep.meta?.deleted || false
      })
      
      // Créer un snapshot après chaque message
      snapshotCount++
      const processesSnapshot = Array.from(processStates.values()).map(p => {
        // S'assurer que processId est toujours défini
        const processId = p.processId != null ? p.processId : p.id
        const copy = { 
          ...p,
          processId: processId  // Forcer la présence de processId
        }
        console.log(`🔍 Snapshot t=${snapshotCount}, process ${p.id}:`, { id: p.id, processId: copy.processId, color: p.color })
        return copy
      })
      const snapshot: SnapshotData = {
        label: `t=${snapshotCount}`,
        processes: processesSnapshot,
        messages: messagesInTransit.map(m => ({ ...m })),
        isFinal: false
      }
      snapshots.push(snapshot)
      
      // Nettoyer les messages après affichage (simuler la livraison)
      messagesInTransit = []
    }
  }
  
  // Snapshot final si tous les processus sont verts
  const allGreen = Array.from(processStates.values()).every(p => p.color === 'green')
  if (allGreen && snapshots.length > 0) {
    snapshots[snapshots.length - 1].isFinal = true
    snapshots[snapshots.length - 1].label = 'Final'
  }
  
  return snapshots
}

/**
 * Composant pour afficher un snapshot individuel (anneau circulaire)
 */
function RingSnapshot({
  processes,
  messages,
  size
}: {
  processes: SnapshotData['processes']
  messages: SnapshotData['messages']
  size: number
}) {
  const n = processes.length
  const cx = size / 2
  const cy = size / 2
  const radius = size / 5
  const nodeRadius = 18
  const badgeWidth = 52
  const badgeHeight = 22
  const badgeDistance = nodeRadius + 18
  
  const positions = processes.map((p, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    const badgeX = cx + Math.cos(angle) * (radius + badgeDistance + badgeWidth / 2)
    const badgeY = cy + Math.sin(angle) * (radius + badgeDistance + badgeHeight / 2)
    return {
      ...p,
      x,
      y,
      angle,
      badgeX,
      badgeY
    }
  })
  
  function getFillColor(color: string): string {
    switch (color) {
      case 'white': return '#fff'
      case 'blue': return '#2196F3'
      case 'red': return '#f44336'
      case 'green': return '#4CAF50'
      default: return '#fff'
    }
  }
  
  function getStrokeColor(color: string): string {
    switch (color) {
      case 'white': return '#999'
      case 'blue': return '#1976D2'
      case 'red': return '#d32f2f'
      case 'green': return '#388E3C'
      default: return '#999'
    }
  }
  
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* Arcs entre processus (sens horaire) */}
      <g>
        {positions.map((p, i) => {
          const next = positions[(i + 1) % n]
          return (
            <line
              key={`arc-${i}`}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              stroke="#ccc"
              strokeWidth={1}
              markerEnd="url(#arrow-gray)"
            />
          )
        })}
      </g>
      
      {/* Définition de la flèche */}
      <defs>
        <marker
          id="arrow-gray"
          viewBox="0 -5 10 10"
          refX="8"
          refY="0"
          markerWidth="4"
          markerHeight="4"
          orient="auto"
        >
          <path d="M0,-5L10,0L0,5" fill="#999" />
        </marker>
        <marker
          id="arrow-blue"
          viewBox="0 -5 10 10"
          refX="8"
          refY="0"
          markerWidth="4"
          markerHeight="4"
          orient="auto"
        >
          <path d="M0,-5L10,0L0,5" fill="#2196F3" />
        </marker>
      </defs>
      
      {/* Messages en transit */}
      <g>
        {messages.map((msg, idx) => {
          const fromPos = positions.find(p => p.id === msg.from)
          const toPos = positions.find(p => p.id === msg.to)
          if (!fromPos || !toPos) return null
          
          // Position à mi-chemin
          const mx = (fromPos.x + toPos.x) / 2
          const my = (fromPos.y + toPos.y) / 2
          
          return (
            <g key={`msg-${idx}`}>
              {/* Bulle de message */}
              <circle
                cx={mx}
                cy={my}
                r={12}
                fill={msg.deleted ? '#ffcccc' : '#2196F3'}
                stroke={msg.deleted ? '#f44336' : '#1976D2'}
                strokeWidth={2}
              />
              <text
                x={mx}
                y={my + 4}
                fontSize={9}
                fontWeight={600}
                textAnchor="middle"
                fill="#fff"
              >
                {msg.value}
              </text>
              {msg.deleted && (
                <text
                  x={mx}
                  y={my - 14}
                  fontSize={14}
                  textAnchor="middle"
                  fill="#f44336"
                >
                  ❌
                </text>
              )}
            </g>
          )
        })}
      </g>
      
      {/* Processus (cercles) */}
      <g>
        {positions.map(p => (
          <g key={`proc-${p.id}`}>
            {/* Cercle du processus */}
            <circle
              cx={p.x}
              cy={p.y}
              r={nodeRadius}
              fill={getFillColor(p.color)}
              stroke={getStrokeColor(p.color)}
              strokeWidth={2}
            />
            {/* ID du processus */}
            <text
              x={p.x}
              y={p.y + 5}
              fontSize={12}
              fontWeight={600}
              textAnchor="middle"
              fill={p.color === 'white' ? '#000' : '#fff'}
            >
              {p.processId != null ? p.processId : `?${p.id}`}
            </text>
            {/* Debug: afficher aussi l'ID interne en petit */}
            {p.processId != null && p.processId !== p.id && (
              <text
                x={p.x}
                y={p.y + 16}
                fontSize={7}
                textAnchor="middle"
                fill="#999"
              >
                (p{p.id})
              </text>
            )}
            
            {/* Badge état interne - positionné radialement */}
            <g>
              <rect
                x={p.badgeX - badgeWidth / 2}
                y={p.badgeY - badgeHeight / 2}
                width={badgeWidth}
                height={badgeHeight}
                fill="#fff"
                stroke="#666"
                strokeWidth={2}
                rx={4}
              />
              {p.badge && (
                <text
                  x={p.badgeX}
                  y={p.badgeY + 6}
                  fontSize={10}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="#000"
                >
                  {p.badge.length > 9 ? p.badge.substring(0, 8) + '…' : p.badge}
                </text>
              )}
            </g>
            
            {/* Indicateur leader (couronne) */}
            {p.isLeader && (
              <text
                x={p.x}
                y={p.y - nodeRadius - 5}
                fontSize={14}
                textAnchor="middle"
              >
                👑
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  )
}
