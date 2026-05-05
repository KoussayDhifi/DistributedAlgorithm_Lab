import React, { useRef, useEffect, useState } from 'react'
import { Text, Title, Button, Group } from '@mantine/core'

export default function LogView({ logs }: { logs: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollPercent, setScrollPercent] = useState(100)

  useEffect(() => {
    // auto-scroll to bottom when new logs appended
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setScrollPercent(100)
  }, [logs])

  function scrollToTop() {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = 0
    setScrollPercent(0)
  }

  function scrollToBottom() {
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setScrollPercent(100)
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100)
    setScrollPercent(isNaN(pct) ? 0 : pct)
  }

  return (
    <div>
      <Title order={5}>Event Log</Title>
      <Group position="apart" style={{ marginBottom: 6 }}>
        <Group spacing="xs">
          <Button size="xs" onClick={scrollToTop}>Top</Button>
          <Button size="xs" onClick={scrollToBottom}>Bottom</Button>
        </Group>
        <div style={{ fontSize: 12, color: '#666' }}>{scrollPercent}%</div>
      </Group>
      <div
        ref={containerRef}
        onScroll={onScroll}
        style={{ height: 300, overflowY: 'auto', padding: 8, border: '1px solid #eee', borderRadius: 6, background: 'white' }}
      >
        {logs.map((l, i) => (
          <Text key={i} size="sm" style={{ whiteSpace: 'pre-wrap', marginBottom: 6 }}>{l}</Text>
        ))}
      </div>
    </div>
  )
}
