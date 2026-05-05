import React from 'react'
import { useSim } from '../state/SimProvider'
import type { MessageStep, AlgorithmStep } from '../model/algorithmCinema'

export default function GraphCanvas() {
  const { state } = useSim()
  const width = 900
  const height = 500
  const leftMargin = 120
  const rightMargin = 20
  const topMargin = 30
  const bottomMargin = 20

  const nodes = state.processes
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
      if (mj.from === m.from && mj.to === m.to && String(mj.msgType) === String(m.msgType)) {
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

  // group all pairs by sender so outgoing arrows originate from the same tail point
  type Group = { from: number; baseSendIndex: number; items: typeof pairs[0][] }
  const groupsMap = new Map<number, typeof pairs[0][]>()
  for (const p of pairs) {
    const arr = groupsMap.get(p.send.from) || []
    arr.push(p)
    groupsMap.set(p.send.from, arr)
  }
  const groups: Group[] = []
  for (const [from, items] of groupsMap.entries()) {
    const baseSendIndex = items.reduce((min, it) => Math.min(min, it.sendIndex), Infinity)
    groups.push({ from, baseSendIndex: baseSendIndex === Infinity ? 0 : baseSendIndex, items })
  }

  // helper to color by type
  function colorFor(m: MessageStep) {
    const t = String(m.msgType || '').toUpperCase()
    if (t.includes('REQUEST')) return 'crimson'
    if (t.includes('REPLY')) return 'seagreen'
    return '#333'
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
              <line x1={leftMargin} y1={y} x2={width - rightMargin} y2={y} stroke="#e6e6e6" strokeWidth={2} />
              {/* CS indicator */}
              {n.color === 'orange' && (
                <rect x={width - rightMargin - 60} y={y - 12} rx={4} width={48} height={24} fill="orange" stroke="#b85" />
              )}
            </g>
          )
        })}
      </g>

      {/* messages for visible steps (paired send -> deliver), grouped by sender so tails share same origin */}
      <g>
        {groups.map((g, gi) => {
          const baseSendIndex = g.baseSendIndex
          const senderIndex = nodes.findIndex((p) => p.id === g.from)
          if (senderIndex === -1) return null
          const x1 = stepX(baseSendIndex)
          const y1 = processY(senderIndex)
          return (
            <g key={`group-${g.from}-${baseSendIndex}`}>
              {g.items.map((pair, i) => {
                const { sendIndex, deliverIndex, send } = pair
                // if the logical send happened after current time, hide
                if (sendIndex >= idx) return null
                const toIndex = nodes.findIndex((p) => p.id === send.to)
                if (toIndex === -1) return null
                const x2 = stepX(deliverIndex)
                const y2 = processY(toIndex)
                const color = colorFor(send)

                // draw straight diagonal lines from single shared origin (x1,y1) to destination (x2,y2)
                const originX = x1
                const originY = y1
                if (deliverIndex <= idx) {
                  const mx = (originX + x2) / 2
                  const my = (originY + y2) / 2
                  return (
                    <g key={`${send.id}-${pair.deliver.id}`}>
                      <line x1={originX} y1={originY} x2={x2} y2={y2} stroke={color} strokeWidth={2} markerEnd={`url(#arrow)`} />
                      <rect x={mx - 28} y={my - 12} rx={6} width={56} height={20} fill="#fff" stroke={color} />
                      <text x={mx} y={my + 5} fontSize={11} textAnchor="middle" fill="#000">{send.msgType}</text>
                    </g>
                  )
                } else {
                  const progress = Math.max(0, Math.min(1, (idx - sendIndex) / Math.max(1, deliverIndex - sendIndex)))
                  const cx2 = originX + (x2 - originX) * progress
                  const cy2 = originY + (y2 - originY) * progress
                  const mx2 = (originX + cx2) / 2
                  const my2 = (originY + cy2) / 2
                  return (
                    <g key={`${send.id}-inflight-${i}`}>
                      <line x1={originX} y1={originY} x2={cx2} y2={cy2} stroke={color} strokeWidth={2} markerEnd={`url(#arrow)`} strokeDasharray="4 3" />
                      <rect x={mx2 - 28} y={my2 - 12} rx={6} width={56} height={20} fill="#fff" stroke={color} />
                      <text x={mx2} y={my2 + 5} fontSize={11} textAnchor="middle" fill="#000">{send.msgType}</text>
                    </g>
                  )
                }
              })}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
