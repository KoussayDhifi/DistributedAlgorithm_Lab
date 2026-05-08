import React, { useState, useRef, useEffect } from 'react'
import { ActionIcon, Group, Tooltip, Box } from '@mantine/core'
import { IconZoomIn, IconZoomOut, IconFocus2, IconHandGrab, IconPointer } from '@tabler/icons-react'

interface Props {
  children: React.ReactNode
  width?: number | string
  height?: number | string
  centerOn?: { x: number, y: number } | null
}

export default function InteractiveStage({ children, width = '100%', height = '100%', centerOn }: Props) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [isFollowing, setIsFollowing] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-center when centerOn changes and we are in following mode
  useEffect(() => {
    if (centerOn && isFollowing && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const targetX = rect.width / 2 - centerOn.x * scale
      const targetY = rect.height / 2 - centerOn.y * scale
      setOffset({ x: targetX, y: targetY })
    }
  }, [centerOn, scale, isFollowing])

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(0.1, scale * delta), 5)
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        const dx = (mouseX - offset.x) * (1 - delta)
        const dy = (mouseY - offset.y) * (1 - delta)
        
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      }
      
      setScale(newScale)
    } else {
      setIsFollowing(false)
      setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true)
      setIsFollowing(false)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setIsFollowing(true)
  }

  const zoomIn = () => setScale(prev => Math.min(prev * 1.2, 5))
  const zoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.1))

  return (
    <Box 
      ref={containerRef}
      style={{ 
        width, 
        height, 
        overflow: 'hidden', 
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        background: 'rgba(248, 250, 252, 0.5)',
        borderRadius: 'inherit'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0, 0.2, 1)',
          width: 'fit-content',
          height: 'fit-content'
        }}
      >
        {children}
      </div>

      {/* Floating Controls */}
      <Group 
        gap={8} 
        style={{ 
          position: 'absolute', 
          bottom: 20, 
          right: 20, 
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '6px 10px',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}
      >
        <Tooltip label="Zoom In (Ctrl + Scroll Up)">
          <ActionIcon variant="subtle" color="gray" onClick={zoomIn} size="lg">
            <IconZoomIn size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Zoom Out (Ctrl + Scroll Down)">
          <ActionIcon variant="subtle" color="gray" onClick={zoomOut} size="lg">
            <IconZoomOut size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Center and Follow">
          <ActionIcon variant={isFollowing ? "filled" : "subtle"} color={isFollowing ? "blue" : "gray"} onClick={resetView} size="lg">
            <IconFocus2 size={20} />
          </ActionIcon>
        </Tooltip>
        <div style={{ width: 1, height: 20, background: '#eee', margin: '0 4px' }} />
        <Tooltip label={isFollowing ? "Following active flow" : "Free pan mode"}>
          <ActionIcon variant="light" color={isFollowing ? "blue" : "gray"} size="lg" onClick={() => setIsFollowing(!isFollowing)}>
            <IconHandGrab size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: 25,
        left: 24,
        fontSize: '11px',
        fontWeight: 600,
        color: '#adb5bd',
        letterSpacing: '0.02em',
        fontFamily: 'monospace'
      }}>
        {Math.round(scale * 100)}%
      </div>
    </Box>
  )
}
