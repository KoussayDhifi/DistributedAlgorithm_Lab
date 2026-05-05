import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Process, Message } from '../types'

type Props = { processes: Process[]; messages: Message[] }

export default function Visualizer({ processes, messages }: Props) {
  const width = 800
  const height = 500
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [nodes, setNodes] = useState<Array<any>>([])
  const simRef = useRef<any>(null)

  // initialize nodes when processes change
  useEffect(() => {
    const cx = width / 2
    const cy = height / 2
    const R = Math.min(width, height) / 3
    const initial = processes.map((p, i) => {
      const angle = (i / Math.max(1, processes.length)) * Math.PI * 2
      return { id: String(p.id), fx: null, fy: null, x: cx + Math.cos(angle) * R, y: cy + Math.sin(angle) * R }
    })

    setNodes(initial)

    // create force simulation
    if (simRef.current) {
      simRef.current.stop()
      simRef.current = null
    }

    const sim = d3.forceSimulation(initial)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('collide', d3.forceCollide(40))
      .alphaDecay(0.02)

    sim.on('tick', () => {
      // snapshot positions to trigger render
      setNodes(initial.map((n) => ({ id: n.id, x: n.x, y: n.y })))
    })

    simRef.current = sim

    return () => {
      sim.stop()
      simRef.current = null
    }
  }, [processes])

  // helper: find node position by id
  function pos(id: number) {
    const n = nodes.find((x) => x.id === String(id))
    return n ? [n.x, n.y] : [0, 0]
  }

  // build directed groups to space parallel messages
  const dirMap = new Map<string, number[]>()
  messages.forEach((m, i) => {
    const key = `${m.from}-${m.to}`
    const arr = dirMap.get(key) || []
    arr.push(i)
    dirMap.set(key, arr)
  })

  // build SVG paths for messages
  function buildPath(m: Message, idx: number) {
    const [x1, y1] = pos(m.from)
    const [x2, y2] = pos(m.to)
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / len
    const ny = dx / len

    // directed offset
    const key = `${m.from}-${m.to}`
    const arr = dirMap.get(key) || []
    const posInDir = arr.indexOf(idx)
    const nDir = arr.length
    const spacing = 18
    const offsetIndex = posInDir - (nDir - 1) / 2
    const offset = offsetIndex * spacing

    const cx = mx + nx * offset
    const cy = my + ny * offset

    // Use a quadratic bezier path for a smooth arc
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  }

  const markerId = 'arrowhead'

  return (
    <svg ref={svgRef} width={width} height={height} style={{ background: '#fff' }}>
      <defs>
        <marker id={markerId} viewBox="0 -5 10 10" refX="12" refY="0" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,-5L10,0L0,5" fill="black" />
        </marker>
      </defs>

      {/* links / messages */}
      <g>
        {messages.map((m, idx) => {
          const path = buildPath(m, idx)
          const t = String(m.type || '')
          const color = t.includes('REQUEST') ? 'crimson' : t.includes('REPLY') ? 'seagreen' : t === 'TOKEN' ? 'royalblue' : 'black'
          // label position: compute point on curve at t=0.5 by quadratic bezier formula
          const [x1, y1] = pos(m.from)
          const [x2, y2] = pos(m.to)
          const dx = x2 - x1
          const dy = y2 - y1
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          const nx = -dy / len
          const ny = dx / len
          const key = `${m.from}-${m.to}`
          const arr = dirMap.get(key) || []
          const posInDir = arr.indexOf(idx)
          const nDir = arr.length
          const spacing = 18
          const offsetIndex = posInDir - (nDir - 1) / 2
          const offset = offsetIndex * spacing
          const mx = (x1 + x2) / 2 + nx * offset
          const my = (y1 + y2) / 2 + ny * offset

          return (
            <g key={idx}>
              <path d={path} stroke={color} strokeWidth={2} fill="none" markerEnd={`url(#${markerId})`} opacity={0.95} />
              <rect x={mx - 28} y={my - 12} rx={6} ry={6} width={56} height={20} fill="#fff" stroke={color} opacity={0.95} />
              <text x={mx} y={my + 5} fontSize={12} textAnchor="middle" fill="#000">{t}</text>
            </g>
          )
        })}
      </g>

      {/* nodes */}
      <g>
        {nodes.map((n) => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle r={26} fill={n.state === 'in_cs' ? 'orange' : 'skyblue'} stroke="#333" strokeWidth={1} />
            <text x={0} y={6} textAnchor="middle" fontSize={14} fill="#000">{n.id}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}
