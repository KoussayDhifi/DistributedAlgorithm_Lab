import React, { useEffect, useRef } from 'react'
import { ActionIcon, Badge, Button, Group, Progress, Slider, Stack, Text } from '@mantine/core'
import { useSim } from '../state/SimProvider'

export default function TimelineControls() {
  const { state, dispatch } = useSim()
  const isFirstRender = useRef(true)

  useEffect(() => {
    let id: any = null
    if (state.playing) {
      // Auto-scroll when starting play - target the modal version if it exists
      // BUT: only if this isn't the first render (prevents scroll on modal open)
      if (!isFirstRender.current) {
        const target = document.querySelector('.mantine-Modal-body .visual-stage') ||
          document.querySelector('.visual-stage');

        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      id = setInterval(() => {
        dispatch({ type: 'STEP_FORWARD' })
      }, state.speed)
    }
    isFirstRender.current = false
    return () => {
      if (id) clearInterval(id)
    }
  }, [state.playing, state.speed, dispatch])

  useEffect(() => {
    if (state.index > 0 && state.index <= state.steps.length) {
      const step = state.steps[state.index - 1]
      if (step && step.type === 'narration') {
        window.dispatchEvent(new CustomEvent('sim:narration', { detail: (step as any).text }))
      }
    }
  }, [state.index, state.steps])

  const stepsCount = state.steps.length
  const progress = stepsCount === 0 ? 0 : Math.round((state.index / stepsCount) * 100)
  const currentStep = state.index > 0 ? state.steps[state.index - 1] : undefined
  const currentType = currentStep?.type ?? 'idle'

  return (
    <Stack gap="xs" className="timeline-panel">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <ActionIcon variant="light" size="lg" onClick={() => dispatch({ type: 'STEP_BACK' })} disabled={state.index === 0}>
            <span aria-hidden>‹</span>
          </ActionIcon>
          {!state.playing ? (
            <Button size="sm" onClick={() => dispatch({ type: 'PLAY' })} disabled={stepsCount === 0}>Play</Button>
          ) : (
            <Button size="sm" color="orange" onClick={() => dispatch({ type: 'PAUSE' })}>Pause</Button>
          )}
          <ActionIcon variant="light" size="lg" onClick={() => dispatch({ type: 'STEP_FORWARD' })} disabled={state.index >= stepsCount}>
            <span aria-hidden>›</span>
          </ActionIcon>
        </Group>
        <Group gap="xs">
          <Badge color={currentType === 'message' ? 'blue' : currentType === 'node' ? 'green' : currentType === 'narration' ? 'grape' : 'gray'} variant="light">
            {currentType}
          </Badge>
          <Text size="sm" fw={600}>{state.index}/{stepsCount}</Text>
        </Group>
      </Group>

      <Progress value={progress} size="sm" radius="xl" />

      <div>
        <Slider
          min={0}
          max={Math.max(0, stepsCount)}
          step={1}
          value={state.index}
          onChange={(v) => dispatch({ type: 'SET_INDEX', index: v })}
          disabled={stepsCount === 0}
          label={(v) => `Step ${v}`}
        />
      </div>

      <Group gap="sm" align="center">
        <Text size="xs" c="dimmed" w={44}>Speed</Text>
        <Slider
          min={50}
          max={2000}
          step={50}
          value={state.speed}
          onChange={(v) => dispatch({ type: 'SET_SPEED', speed: v })}
          style={{ flex: 1 }}
        />
        <Text size="xs" c="dimmed" w={58} ta="right">{state.speed}ms</Text>
      </Group>
    </Stack>
  )
}
