import React, { useEffect } from 'react'
import { Button, Group, Slider, Text } from '@mantine/core'
import { useSim } from '../state/SimProvider'

export default function TimelineControls() {
  const { state, dispatch } = useSim()

  useEffect(() => {
    let id: any = null
    if (state.playing) {
      id = setInterval(() => {
        dispatch({ type: 'STEP_FORWARD' })
      }, state.speed)
    }
    return () => {
      if (id) clearInterval(id)
    }
  }, [state.playing, state.speed, dispatch])
  
  // Émettre les narrations quand l'index change
  useEffect(() => {
    if (state.index > 0 && state.index <= state.steps.length) {
      const step = state.steps[state.index - 1]
      if (step && step.type === 'narration') {
        window.dispatchEvent(new CustomEvent('sim:narration', { detail: (step as any).text }))
      }
    }
  }, [state.index, state.steps])

  const stepsCount = state.steps.length

  return (
    <div style={{ marginBottom: 8 }}>
      <Group spacing="xs">
        <Button size="xs" onClick={() => dispatch({ type: 'STEP_BACK' })}>◀◀</Button>
        {!state.playing ? (
          <Button size="xs" onClick={() => dispatch({ type: 'PLAY' })}>Play ▶</Button>
        ) : (
          <Button size="xs" onClick={() => dispatch({ type: 'PAUSE' })}>Pause ⏸</Button>
        )}
        <Button size="xs" onClick={() => dispatch({ type: 'STEP_FORWARD' })}>▶</Button>
        <Text size="sm">{state.index}/{stepsCount}</Text>
      </Group>

      <div style={{ marginTop: 8 }}>
        <Slider
          min={0}
          max={Math.max(0, stepsCount)}
          step={1}
          value={state.index}
          onChange={(v) => dispatch({ type: 'SET_INDEX', index: v })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text size="xs">Speed</Text>
          <Slider
            min={50}
            max={2000}
            step={50}
            value={state.speed}
            onChange={(v) => dispatch({ type: 'SET_SPEED', speed: v })}
            style={{ flex: 1 }}
          />
          <Text size="xs">{state.speed}ms</Text>
        </div>
      </div>
    </div>
  )
}
