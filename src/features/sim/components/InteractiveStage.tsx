import React, { useState, useRef, useEffect } from 'react'
import { ActionIcon, Group, Tooltip, Box } from '@mantine/core'
import { IconZoomIn, IconZoomOut, IconFocus2, IconHandGrab, IconPointer } from '@tabler/icons-react'

interface Props {
  children: React.ReactNode
  width?: number | string
  height?: number | string
}

export default function InteractiveStage({ children, width = '100%', height = '100%' }: Props) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(0.1, scale * delta), 5)
      
      // Zoom relative to mouse position
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
      // Regular scroll translates
      setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) { // Left or middle click
      setIsDragging(true)
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
        background: 'transparent'
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
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
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
          background: 'rgba(255, 255, 255, 0.8)',
          padding: '4px 8px',
          borderRadius: '10px',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}
      >
        <Tooltip label="Zoom In (Ctrl + Scroll Up)">
          <ActionIcon variant="subtle" color="gray" onClick={zoomIn}>
            <IconZoomIn size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Zoom Out (Ctrl + Scroll Down)">
          <ActionIcon variant="subtle" color="gray" onClick={zoomOut}>
            <IconZoomOut size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Reset View">
          <ActionIcon variant="subtle" color="gray" onClick={resetView}>
            <IconFocus2 size={18} />
          </ActionIcon>
        </Tooltip>
        <div style={{ width: 1, height: 16, background: '#ddd', margin: '0 4px' }} />
        <Tooltip label="Pan Mode (Drag)">
          <ActionIcon variant="light" color="blue">
            <IconHandGrab size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: 25,
        left: 20,
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#999',
        letterSpacing: '0.05em'
      }}>
        ZOOM: {Math.round(scale * 100)}%
      </div>
    </Box>
  )
}
