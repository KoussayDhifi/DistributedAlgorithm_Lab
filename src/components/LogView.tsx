import React, { useRef, useEffect, useState } from 'react'
import { Badge, Button, Group, ScrollArea, Stack, Text, Title } from '@mantine/core'

function splitLog(entry: string) {
  const parts = entry.split(' ')
  if (parts.length < 2) return { time: '', message: entry }
  return { time: parts[0], message: parts.slice(1).join(' ') }
}

function colorForLog(message: string) {
  const m = message.toLowerCase()
  if (m.includes('failed') || m.includes('error') || m.includes('non delivrable')) return 'red'
  if (m.includes('loaded') || m.includes('started') || m.includes('démarr')) return 'green'
  if (m.includes('deliver')) return 'blue'
  return 'gray'
}

export default function LogView({ logs }: { logs: string[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [scrollPercent, setScrollPercent] = useState(100)

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setScrollPercent(100)
  }, [logs])

  function scrollToTop() {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = 0
    setScrollPercent(0)
  }

  function scrollToBottom() {
    const el = viewportRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setScrollPercent(100)
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight || 1)) * 100)
    setScrollPercent(Number.isNaN(pct) ? 0 : pct)
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text className="eyebrow">Runtime</Text>
          <Title order={5}>Event Log</Title>
        </div>
        <Badge variant="light" color="gray">{logs.length}</Badge>
      </Group>
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={scrollToTop}>Top</Button>
        <Button size="xs" variant="light" onClick={scrollToBottom}>Bottom</Button>
        <Text size="xs" c="dimmed">{scrollPercent}%</Text>
      </Group>
      <ScrollArea h={300} viewportRef={viewportRef} onScroll={onScroll} className="log-scroll">
        <Stack gap={6} p="xs">
          {logs.length === 0 && (
            <Text size="sm" c="dimmed">Run an algorithm to see events here.</Text>
          )}
          {logs.map((entry, i) => {
            const { time, message } = splitLog(entry)
            return (
              <div key={`${entry}-${i}`} className="log-entry">
                <Badge size="xs" variant="light" color={colorForLog(message)}>{time || 'log'}</Badge>
                <Text size="sm" className="log-message">{message}</Text>
              </div>
            )
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  )
}
