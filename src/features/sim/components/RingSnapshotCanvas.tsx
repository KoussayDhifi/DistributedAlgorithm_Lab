import React, { useMemo, useState } from 'react'
import { useSim } from '../state/SimProvider'
import type { AlgorithmStep, NodeStateStep, MessageStep } from '../model/algorithmCinema'

/**
 * Composant d'affichage des snapshots Ring Election côte à côte
 * Chaque snapshot = un petit anneau circulaire avec processus colorés et messages
 */
export default function RingSnapshotCanvas() {
  const { state } = useSim()
  const [zoomedSnapshot, setZoomedSnapshot] = useState<SnapshotData | null>(null)
  
  const snapshots = useMemo(() => {
    const result = buildSnapshots(state.processes, state.steps, state.index)
    return result
  }, [state.processes, state.steps, state.index])
  
  const n = state.processes.length || 5
  const snapshotSize = Math.max(180, 120 + n * 22)
  const gap = 28
  
  // Grille adaptative selon la taille des snapshots
  let cols = 4
  if (snapshotSize > 280) cols = 1
  else if (snapshotSize > 220) cols = 2
  else if (snapshotSize > 180) cols = 3
  
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
        paddingBottom: '60px',
        background: '#fafafa',
        maxHeight: 'calc(100vh - 200px)',
        height: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(${snapshotSize + 40}px, 1fr))`,
          gap: gap,
          justifyContent: 'center',
          paddingBottom: '40px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {snapshots.map((snap, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                maxWidth: snapshotSize + 40,
                margin: '0 auto',
                cursor: 'zoom-in',
                minHeight: 'fit-content',
                overflow: 'visible'
              }}
              onClick={() => setZoomedSnapshot(snap)}
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
      
      {/* Overlay zoom */}
      {zoomedSnapshot && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
          onClick={() => setZoomedSnapshot(null)}
        >
          <div 
            style={{
              width: 'min(90vw, 90vh)',
              height: 'min(90vw, 90vh)',
              background: 'white',
              borderRadius: 12,
              padding: 16,
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedSnapshot(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                zIndex: 10
              }}
            >
              ✕
            </button>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 12,
              textAlign: 'center',
              color: '#333'
            }}>
              {zoomedSnapshot.label}
            </div>
            <RingSnapshot
              processes={zoomedSnapshot.processes}
              messages={zoomedSnapshot.messages}
              size={Math.min(window.innerWidth * 0.88, window.innerHeight * 0.88) - 60}
            />
          </div>
        </div>
      )}
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
  
  // Parcourir les steps visibles
  const visibleSteps = steps.slice(0, currentIndex)
  
  for (let i = 0; i < visibleSteps.length; i++) {
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
  const ringRadius = size * 0.34
  const nodeRadius = Math.max(12, Math.min(22, 200 / n))
  const fontSize = Math.max(8, Math.min(13, 180 / n))
  const messageBubbleRadius = Math.max(14, nodeRadius * 0.75)
  const messageFontSize = Math.max(7, nodeRadius * 0.55)
  
  const positions = processes.map((p, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * ringRadius
    const y = cy + Math.sin(angle) * ringRadius
    
    // Badge positionné à l'extérieur avec offset suffisant
    const badgeOffset = ringRadius + nodeRadius + 28
    const badgeX = cx + Math.cos(angle) * badgeOffset
    const badgeY = cy + Math.sin(angle) * badgeOffset
    
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
  
  // Fonction pour formater le badge (multi-lignes si nécessaire)
  function formatBadge(badge: string): string[] {
    if (!badge) return []
    
    // Si c'est une liste [a,b,c,d,e,f]
    if (badge.startsWith('[') && badge.endsWith(']')) {
      const content = badge.slice(1, -1)
      const items = content.split(',')
      
      if (items.length <= 3) return [badge]
      
      // Diviser en lignes de 3 max
      const lines: string[] = []
      for (let i = 0; i < items.length; i += 3) {
        const chunk = items.slice(i, i + 3).join(',')
        lines.push(`[${chunk}]`)
      }
      return lines.slice(0, 3) // Max 3 lignes
    }
    
    return [badge]
  }
  
  return (
    <svg 
      width={size} 
      height={size} 
      style={{ display: 'block', overflow: 'visible' }}
      viewBox={`${-size * 0.1} ${-size * 0.1} ${size * 1.2} ${size * 1.2}`}
    >
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
              strokeWidth={1.5}
              markerEnd="url(#arrow-gray)"
            />
          )
        })}
      </g>
      
      {/* Définition des flèches */}
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
      </defs>
      
      {/* Messages en transit */}
      <g>
        {messages.map((msg, idx) => {
          const fromPos = positions.find(p => p.id === msg.from)
          const toPos = positions.find(p => p.id === msg.to)
          if (!fromPos || !toPos) return null
          
          // Position à 40% de l'arc (pas au milieu exact)
          const t = 0.4
          const mx = fromPos.x * (1 - t) + toPos.x * t
          const my = fromPos.y * (1 - t) + toPos.y * t
          
          return (
            <g key={`msg-${idx}`}>
              {/* Bulle de message avec contour blanc épais */}
              <circle
                cx={mx}
                cy={my}
                r={messageBubbleRadius}
                fill={msg.deleted ? '#ffcccc' : '#2196F3'}
                stroke="#fff"
                strokeWidth={2}
              />
              <circle
                cx={mx}
                cy={my}
                r={messageBubbleRadius}
                fill="none"
                stroke={msg.deleted ? '#f44336' : '#1976D2'}
                strokeWidth={1.5}
              />
              <text
                x={mx}
                y={my + messageFontSize * 0.35}
                fontSize={messageFontSize}
                fontWeight={700}
                textAnchor="middle"
                fill="#fff"
              >
                {msg.value}
              </text>
              {msg.deleted && (
                <text
                  x={mx}
                  y={my - messageBubbleRadius - 4}
                  fontSize={messageBubbleRadius * 1.2}
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
        {positions.map(p => {
          const badgeLines = formatBadge(p.badge)
          const badgeWidth = Math.max(40, Math.min(120, p.badge.length * 7))
          const badgeHeight = Math.max(22, badgeLines.length * 14 + 8)
          
          return (
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
                y={p.y + fontSize * 0.35}
                fontSize={fontSize}
                fontWeight={600}
                textAnchor="middle"
                fill={p.color === 'white' ? '#000' : '#fff'}
              >
                {p.processId != null ? p.processId : `?${p.id}`}
              </text>
              
              {/* Badge état interne - positionné radialement */}
              {p.badge && (
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
                  {badgeLines.map((line, idx) => (
                    <text
                      key={idx}
                      x={p.badgeX}
                      y={p.badgeY - badgeHeight / 2 + 14 + idx * 14}
                      fontSize={Math.min(10, fontSize)}
                      fontWeight={700}
                      textAnchor="middle"
                      fill="#000"
                    >
                      {line.length > 12 ? line.substring(0, 11) + '…' : line}
                    </text>
                  ))}
                  {/* Tooltip pour badge long */}
                  {p.badge.length > 12 && (
                    <title>{p.badge}</title>
                  )}
                </g>
              )}
              
              {/* Indicateur leader (couronne) */}
              {p.isLeader && (
                <text
                  x={p.x}
                  y={p.y - nodeRadius - 5}
                  fontSize={nodeRadius * 0.8}
                  textAnchor="middle"
                >
                  👑
                </text>
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
