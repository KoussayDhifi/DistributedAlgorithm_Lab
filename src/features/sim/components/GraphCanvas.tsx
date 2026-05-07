import React from 'react'
import { useSim } from '../state/SimProvider'
import type { MessageStep, AlgorithmStep, CinemaNodeState } from '../model/algorithmCinema'

function colorFor(m: MessageStep) {
  const t = String(m.msgType || '').toUpperCase()
  if (t.includes('REQUEST')) return 'crimson'
  if (t.includes('REPLY')) return 'seagreen'
  if (t.includes('ELECTION')) return 'orange'
  if (t.includes('OK')) return 'green'
  if (t.includes('COORD')) return 'purple'
  if (t.includes('TOKEN')) return 'orange'
  if (t.includes('VC')) return '#1971c2'
  return '#333'
}

function deriveNodes(baseNodes: CinemaNodeState[], steps: AlgorithmStep[], index: number) {
  const nodes = baseNodes.map((node) => ({
    ...node,
    badges: { ...(node.badges || {}) },
  }))

  steps.slice(0, index).forEach((step) => {
    if (step.type !== 'node') return
    const nodeIndex = nodes.findIndex((node) => node.id === step.nodeId)
    if (nodeIndex === -1) return
    nodes[nodeIndex] = {
      ...nodes[nodeIndex],
      ...step.state,
      badges: { ...(nodes[nodeIndex].badges || {}), ...(step.state.badges || {}) },
    }
  })

  return nodes
}

function latestNarration(steps: AlgorithmStep[], index: number) {
  for (let i = Math.min(index - 1, steps.length - 1); i >= 0; i -= 1) {
    const step = steps[i]
    if (step.type === 'narration') return step.text
  }
  return ''
}

function isMatchingMessage(a: MessageStep, b: MessageStep) {
  const aKey = a.meta?.messageKey
  const bKey = b.meta?.messageKey
  if (aKey || bKey) return aKey === bKey
  return a.from === b.from && a.to === b.to && String(a.msgType) === String(b.msgType)
}

function getCurve(p1: { x: number; y: number }, p2: { x: number; y: number }, progress: number, curveOffset: number = 40) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy))

  const startRadius = 25
  const endRadius = 25

  const P0 = { x: p1.x + (dx / len) * startRadius, y: p1.y + (dy / len) * startRadius }
  const P2 = { x: p1.x + (dx / len) * (len - endRadius), y: p1.y + (dy / len) * (len - endRadius) }

  const ldx = P2.x - P0.x
  const ldy = P2.y - P0.y
  const currLen = Math.max(1, Math.sqrt(ldx * ldx + ldy * ldy))
  const nx = -ldy / currLen
  const ny = ldx / currLen

  const P1 = { x: (P0.x + P2.x) / 2 + nx * curveOffset, y: (P0.y + P2.y) / 2 + ny * curveOffset }

  if (progress >= 1) {
    const midX = 0.25 * P0.x + 0.5 * P1.x + 0.25 * P2.x
    const midY = 0.25 * P0.y + 0.5 * P1.y + 0.25 * P2.y
    return { path: `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`, midX, midY, head: P2 }
  }

  const P0_1 = { x: (1 - progress) * P0.x + progress * P1.x, y: (1 - progress) * P0.y + progress * P1.y }
  const P1_2 = { x: (1 - progress) * P1.x + progress * P2.x, y: (1 - progress) * P1.y + progress * P2.y }
  const P0_2 = { x: (1 - progress) * P0_1.x + progress * P1_2.x, y: (1 - progress) * P0_1.y + progress * P1_2.y }

  return { path: `M ${P0.x} ${P0.y} Q ${P0_1.x} ${P0_1.y} ${P0_2.x} ${P0_2.y}`, head: P0_2 }
}

function SequenceCanvas() {
  const { state } = useSim()
  const width = 900
  const height = 500
  const leftMargin = 120
  const rightMargin = 20
  const topMargin = 30
  const bottomMargin = 20

  const nodes = deriveNodes(state.processes, state.steps, state.index)
  const steps = state.steps
  const idx = state.index
  const visibleSteps = steps.slice(0, idx)

  const laneHeight = Math.max(40, (height - topMargin - bottomMargin) / Math.max(1, nodes.length))
  const usableWidth = width - leftMargin - rightMargin
  const maxSteps = Math.max(1, steps.length)

  function stepX(stepIndex: number) {
    return leftMargin + (stepIndex / maxSteps) * usableWidth
  }

  function processY(i: number) {
    return topMargin + i * laneHeight + laneHeight / 2
  }

  // collect message steps with their original index to place along time
  const messages: Array<{ stepIndex: number; m: MessageStep }> = []
  steps.forEach((s, i) => {
    if ((s as any).type === 'message') messages.push({ stepIndex: i, m: s as MessageStep })
  })

  // pair send/deliver steps: look for later message with same from/to/type
  const pairs: Array<{ sendIndex: number; deliverIndex: number; send: MessageStep; deliver: MessageStep }> = []
  const used = new Set<number>()
  for (let i = 0; i < messages.length; i++) {
    if (used.has(i)) continue
    const { stepIndex: sIdx, m } = messages[i]
    let found = -1
    for (let j = i + 1; j < messages.length; j++) {
      if (used.has(j)) continue
      const mj = messages[j].m
      if (isMatchingMessage(m, mj)) {
        found = j
        break
      }
    }
    if (found !== -1) {
      pairs.push({ sendIndex: sIdx, deliverIndex: messages[found].stepIndex, send: m, deliver: messages[found].m })
      used.add(i)
      used.add(found)
    } else {
      // no matching deliver found; treat as instantaneous at same step
      pairs.push({ sendIndex: sIdx, deliverIndex: sIdx + 1, send: m, deliver: m })
      used.add(i)
    }
  }

  const visibleNodeSteps: Array<{ stepIndex: number; step: Extract<AlgorithmStep, { type: 'node' }> }> = []
  visibleSteps.forEach((step, stepIndex) => {
    if (step.type === 'node' && step.state.badges?.event && step.state.badges.event !== 'init') {
      visibleNodeSteps.push({ stepIndex, step })
    }
  })

  const narration = latestNarration(steps, idx)

  function messageStartIndex(sendIndex: number, send: MessageStep) {
    if (!send.meta?.messageKey) return sendIndex

    for (let i = sendIndex - 1; i >= 0; i -= 1) {
      const step = steps[i]
      if (
        step.type === 'node' &&
        step.nodeId === send.from &&
        step.state.badges?.kind === 'send' &&
        step.state.badges?.event === send.meta.event
      ) {
        return i
      }
    }

    return sendIndex
  }

  function messageEndIndex(deliverIndex: number, send: MessageStep) {
    if (!send.meta?.messageKey) return deliverIndex

    for (let i = deliverIndex + 1; i < steps.length; i += 1) {
      const step = steps[i]
      if (step.type === 'narration') break
      if (
        step.type === 'node' &&
        step.nodeId === send.to &&
        step.state.badges?.kind === 'receive'
      ) {
        return i
      }
    }

    return deliverIndex
  }

  return (
    <svg width={width} height={height} style={{ background: '#fff' }}>
      <defs>
        <marker id="arrow" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,-5L10,0L0,5" fill="#000" />
        </marker>
      </defs>

      {/* time axis */}
      <g>
        <line x1={leftMargin} y1={topMargin - 10} x2={width - rightMargin} y2={topMargin - 10} stroke="#ddd" />
        {Array.from({ length: Math.min(20, maxSteps) }).map((_, i) => {
          const sx = leftMargin + (i / Math.min(20, maxSteps)) * usableWidth
          return <line key={i} x1={sx} y1={topMargin - 14} x2={sx} y2={topMargin - 6} stroke="#ccc" />
        })}
        <text x={leftMargin} y={topMargin - 18} fontSize={12} fontWeight={600}>Time / Steps</text>
      </g>

      {/* lanes and process labels */}
      <g>
        {nodes.map((n, i) => {
          const y = processY(i)
          return (
            <g key={n.id}>
              <text x={10} y={y + 5} fontSize={13} fontWeight={600}>{n.label ?? `P${n.id}`}</text>
              {n.badges?.vector && (
                <text x={62} y={y + 5} fontSize={11} fill="#555">{String(n.badges.vector)}</text>
              )}
              <line x1={leftMargin} y1={y} x2={width - rightMargin} y2={y} stroke="#e6e6e6" strokeWidth={2} />
              {/* CS indicator */}
              {n.color === 'orange' && (
                <rect x={width - rightMargin - 60} y={y - 12} rx={4} width={48} height={24} fill="orange" stroke="#b85" />
              )}
            </g>
          )
        })}
      </g>

      {/* messages for visible steps (paired send -> deliver) */}
      <g>
        {pairs.map((pair, i) => {
          const { sendIndex, deliverIndex, send } = pair
          if (sendIndex >= idx) return null
          const senderIndex = nodes.findIndex((p) => p.id === send.from)
          const toIndex = nodes.findIndex((p) => p.id === send.to)
          if (senderIndex === -1 || toIndex === -1) return null

          const startIndex = messageStartIndex(sendIndex, send)
          const endIndex = messageEndIndex(deliverIndex, send)
          const originX = stepX(startIndex)
          const originY = processY(senderIndex)
          const x2 = stepX(endIndex)
          const y2 = processY(toIndex)
          const color = colorFor(send)
          const labelWidth = Math.max(56, String(send.msgType).length * 8)

          if (deliverIndex <= idx) {
            const mx = (originX + x2) / 2
            const my = (originY + y2) / 2
            return (
              <g key={`${send.id}-${pair.deliver.id}`}>
                <line x1={originX} y1={originY} x2={x2} y2={y2} stroke={color} strokeWidth={2} markerEnd={`url(#arrow)`} />
                <rect x={mx - labelWidth / 2} y={my - 12} rx={6} width={labelWidth} height={20} fill="#fff" stroke={color} />
                <text x={mx} y={my + 5} fontSize={11} textAnchor="middle" fill="#000">{send.msgType}</text>
                {send.meta?.vector && (
                  <text x={mx} y={my + 21} fontSize={10} textAnchor="middle" fill={color}>{String(send.meta.vector)}</text>
                )}
              </g>
            )
          }

          const progress = Math.max(0, Math.min(1, (idx - sendIndex) / Math.max(1, deliverIndex - sendIndex)))
          const cx2 = originX + (x2 - originX) * progress
          const cy2 = originY + (y2 - originY) * progress
          const mx2 = (originX + cx2) / 2
          const my2 = (originY + cy2) / 2
          return (
            <g key={`${send.id}-inflight-${i}`}>
              <line x1={originX} y1={originY} x2={cx2} y2={cy2} stroke={color} strokeWidth={2} markerEnd={`url(#arrow)`} strokeDasharray="4 3" />
              <rect x={mx2 - labelWidth / 2} y={my2 - 12} rx={6} width={labelWidth} height={20} fill="#fff" stroke={color} />
              <text x={mx2} y={my2 + 5} fontSize={11} textAnchor="middle" fill="#000">{send.msgType}</text>
              {send.meta?.vector && (
                <text x={mx2} y={my2 + 21} fontSize={10} textAnchor="middle" fill={color}>{String(send.meta.vector)}</text>
              )}
            </g>
          )
        })}
      </g>

      <g>
        {visibleNodeSteps.map(({ stepIndex, step }) => {
          const nodeIndex = nodes.findIndex((node) => node.id === step.nodeId)
          if (nodeIndex === -1) return null
          const x = stepX(stepIndex)
          const y = processY(nodeIndex)
          const kind = String(step.state.badges?.kind || '')
          const color = kind === 'receive' ? '#2f9e44' : kind === 'send' ? '#1971c2' : '#868e96'
          const vector = String(step.state.badges?.vector || '')
          const event = String(step.state.badges?.event || '')
          return (
            <g key={step.id}>
              <circle cx={x} cy={y} r={5} fill={color} stroke="#fff" strokeWidth={2} />
              <text x={x} y={y - 10} fontSize={10} textAnchor="middle" fill="#222" fontWeight={700}>{event}</text>
              <text x={x} y={y + 20} fontSize={10} textAnchor="middle" fill={color}>{vector}</text>
            </g>
          )
        })}
      </g>

      {narration && (
        <g>
          <rect x={leftMargin} y={height - 32} rx={6} width={width - leftMargin - rightMargin} height={24} fill="#f8f9fa" stroke="#dee2e6" />
          <text x={leftMargin + 10} y={height - 15} fontSize={12} fill="#343a40">{narration}</text>
        </g>
      )}
    </svg>
  )
}

function NetworkCanvas() {
  const { state } = useSim()
  const width = 900
  const height = 500
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2 - 60

  const nodes = deriveNodes(state.processes, state.steps, state.index)
  const steps = state.steps
  const idx = state.index

  // precalculate node positions
  const positions = new Map<number, { x: number; y: number }>()
  nodes.forEach((n, i) => {
    const angle = (i * 2 * Math.PI) / Math.max(1, nodes.length) - Math.PI / 2
    positions.set(n.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    })
  })

  const messages: Array<{ stepIndex: number; m: MessageStep }> = []
  steps.forEach((s, i) => {
    if ((s as any).type === 'message') messages.push({ stepIndex: i, m: s as MessageStep })
  })

  const pairs: Array<{ sendIndex: number; deliverIndex: number; send: MessageStep; deliver: MessageStep }> = []
  const used = new Set<number>()
  for (let i = 0; i < messages.length; i++) {
    if (used.has(i)) continue
    const { stepIndex: sIdx, m } = messages[i]
    let found = -1
    for (let j = i + 1; j < messages.length; j++) {
      if (used.has(j)) continue
      const mj = messages[j].m
      if (isMatchingMessage(m, mj)) {
        found = j
        break
      }
    }
    if (found !== -1) {
      pairs.push({ sendIndex: sIdx, deliverIndex: messages[found].stepIndex, send: m, deliver: messages[found].m })
      used.add(i)
      used.add(found)
    } else {
      pairs.push({ sendIndex: sIdx, deliverIndex: sIdx + 1, send: m, deliver: m })
      used.add(i)
    }
  }

  return (
    <svg width={width} height={height} style={{ background: '#fff' }}>
      <defs>
        <marker id="net-arrow-orange" viewBox="0 -5 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,-5L10,0L0,5" fill="orange" /></marker>
        <marker id="net-arrow-green" viewBox="0 -5 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,-5L10,0L0,5" fill="green" /></marker>
        <marker id="net-arrow-purple" viewBox="0 -5 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,-5L10,0L0,5" fill="purple" /></marker>
        <marker id="net-arrow-default" viewBox="0 -5 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,-5L10,0L0,5" fill="#333" /></marker>
      </defs>

      {/* Messages */}
      <g>
        {pairs.map((pair, i) => {
          const { sendIndex, deliverIndex, send } = pair
          if (sendIndex >= idx) return null // future

          const p1 = positions.get(send.from)
          const p2 = positions.get(send.to)
          if (!p1 || !p2) return null

          const color = colorFor(send)
          let markerId = 'net-arrow-default'
          if (color === 'orange') markerId = 'net-arrow-orange'
          if (color === 'green') markerId = 'net-arrow-green'
          if (color === 'purple') markerId = 'net-arrow-purple'

          let offsetMag = 40
          if (send.msgType === 'BULLY_COORD') offsetMag = 80

          if (deliverIndex <= idx) {
            const curve = getCurve(p1, p2, 1, offsetMag)
            return (
              <g key={`del-${i}`}>
                <path
                  d={curve.path}
                  stroke={color}
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.4}
                  markerEnd={`url(#${markerId})`}
                />
                <text x={curve.midX} y={(curve.midY ?? 0) + 3} fontSize={10} textAnchor="middle" fill={color} opacity={0.8} fontWeight="bold">
                  {send.msgType}
                </text>
              </g>
            )
          } else {
            // in-flight message
            const progress = Math.max(0, Math.min(1, (idx - sendIndex) / Math.max(1, deliverIndex - sendIndex)))
            const curve = getCurve(p1, p2, progress, offsetMag)
            const cx2 = curve.head.x
            const cy2 = curve.head.y
            
            return (
              <g key={`inflight-${i}`}>
                <path
                  d={curve.path}
                  stroke={color}
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="4 4"
                  markerEnd={`url(#${markerId})`}
                />
                <circle cx={cx2} cy={cy2} r={4} fill={color} />
                <rect x={cx2 + 5} y={cy2 - 10} rx={4} width={Math.max(50, String(send.msgType).length * 8)} height={18} fill="#fff" opacity={0.8} />
                <text x={cx2 + Math.max(50, String(send.msgType).length * 8) / 2 + 5} y={cy2 + 3} fontSize={10} textAnchor="middle" fill="#000" fontWeight="bold">
                  {send.msgType}
                </text>
              </g>
            )
          }
        })}
      </g>

      {/* Nodes */}
      <g>
        {nodes.map(n => {
          const pos = positions.get(n.id)
          if (!pos) return null
          
          // use the color assigned by the algorithm (e.g. purple for leader, orange for token holder)
          // Default to white fill with blue stroke
          const isHighlight = n.color && n.color !== 'skyblue' && n.color !== '#fff'
          const fill = isHighlight ? n.color : '#fff'
          const stroke = isHighlight ? '#333' : '#4dabf7'
          const textColor = isHighlight ? '#fff' : '#000'

          return (
            <g key={n.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <circle
                r={20}
                fill={fill}
                stroke={stroke}
                strokeWidth={3}
              />
              <text
                y={5}
                fontSize={14}
                fontWeight={700}
                textAnchor="middle"
                fill={textColor}
              >
                {n.label ?? `P${n.id}`}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

export default function GraphCanvas() {
  const { state } = useSim()

  if (state.algorithm === 'bully' || state.algorithm === 'token') {
    return <NetworkCanvas />
  }

  return <SequenceCanvas />
}
