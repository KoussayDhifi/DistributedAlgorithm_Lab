import React, { useState, useEffect } from 'react'
import { Button, Stack, Select, Group, Checkbox, Alert, TextInput } from '@mantine/core'
import type { RingVariant } from '../features/sim/algorithms/ringElectionCinema'

type Props = {
  numberOfProcesses: number
  onRunElection: (variant: RingVariant, initiators: number[], customIds: number[]) => void
}

export default function RingElectionControls({ numberOfProcesses, onRunElection }: Props) {
  const [variant, setVariant] = useState<RingVariant>('leLann')
  const [initiators, setInitiators] = useState<number[]>([2, 4, 5])
  const [customIdsInput, setCustomIdsInput] = useState<string>('7,3,4,5,2')
  const [idsError, setIdsError] = useState<string>('')
  const [parsedIds, setParsedIds] = useState<number[]>([7, 3, 4, 5, 2])
  
  const processIds = Array.from({ length: numberOfProcesses }, (_, i) => i + 1)
  
  useEffect(() => {
    const validInitiators = initiators.filter(i => i <= numberOfProcesses)
    if (validInitiators.length !== initiators.length) {
      setInitiators(validInitiators.length > 0 ? validInitiators : [1])
    }
  }, [numberOfProcesses])
  
  useEffect(() => {
    const ids = validateAndParseIds()
    if (ids) {
      setParsedIds(ids)
    }
  }, [customIdsInput, numberOfProcesses])
  
  function toggleInitiator(id: number) {
    if (initiators.includes(id)) {
      setInitiators(initiators.filter(i => i !== id))
    } else {
      setInitiators([...initiators, id].sort((a, b) => a - b))
    }
  }
  
  function validateAndParseIds(): number[] | null {
    const trimmed = customIdsInput.trim()
    if (!trimmed) {
      const randomIds = Array.from({ length: numberOfProcesses }, () => Math.floor(Math.random() * 100) + 1)
      const uniqueIds = Array.from(new Set(randomIds))
      while (uniqueIds.length < numberOfProcesses) {
        uniqueIds.push(Math.floor(Math.random() * 100) + 1)
      }
      return uniqueIds.slice(0, numberOfProcesses)
    }
    
    const parts = trimmed.split(',').map(s => s.trim())
    const ids = parts.map(s => parseInt(s, 10))
    
    if (ids.some(isNaN)) {
      setIdsError('❌ IDs invalides (doivent être des nombres)')
      return null
    }
    
    if (ids.length !== numberOfProcesses) {
      setIdsError(`❌ Nombre d'IDs (${ids.length}) ≠ nombre de processus (${numberOfProcesses})`)
      return null
    }
    
    const uniqueIds = new Set(ids)
    if (uniqueIds.size !== ids.length) {
      setIdsError('❌ IDs doivent être uniques')
      return null
    }
    
    setIdsError('')
    return ids
  }
  
  function handleRunElection() {
    const ids = validateAndParseIds()
    if (!ids) return
    
    if (initiators.length === 0) {
      setIdsError('❌ Aucun initiateur sélectionné')
      return
    }
    
    setParsedIds(ids)
    onRunElection(variant, initiators, ids)
  }
  
  function getProcessLabel(processIndex: number): string {
    const id = parsedIds[processIndex - 1]
    return id ? `P${processIndex}(${id})` : `P${processIndex}`
  }
  
  // Description contextuelle selon la variante
  const variantDescription = variant === 'leLann'
    ? "Tous les IDs font un tour complet. L'initiateur avec le plus petit ID est élu. Complexité : O(n²) messages."
    : "Seuls les grands IDs survivent, les petits sont supprimés. Complexité : O(n·log n) en moyenne, O(n²) au pire."
  
  return (
    <Stack gap="sm">
      <Select
        label="Variante"
        value={variant}
        onChange={(v) => setVariant(v as RingVariant)}
        data={[
          { value: 'leLann', label: 'Le Lann (Classique)' },
          { value: 'changRoberts', label: 'Chang-Roberts (Optimisé)' }
        ]}
      />
      
      <Alert color="blue" title="ℹ️ À propos" styles={{ message: { fontSize: 13 } }}>
        {variantDescription}
      </Alert>
      
      <TextInput
        label="IDs des processus (séparés par virgules)"
        placeholder="7,3,4,5,2"
        value={customIdsInput}
        onChange={(e) => setCustomIdsInput(e.currentTarget.value)}
        error={idsError}
        description={`${numberOfProcesses} IDs requis. Vide = aléatoire`}
      />
      
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Initiateurs (au moins 1)
        </div>
        <Group gap="xs">
          {processIds.map(id => (
            <Checkbox
              key={id}
              label={getProcessLabel(id)}
              checked={initiators.includes(id)}
              onChange={() => toggleInitiator(id)}
            />
          ))}
        </Group>
      </div>
      
      <Button
        color="green"
        onClick={handleRunElection}
        disabled={initiators.length === 0}
        fullWidth
      >
        ▶ Run Ring Election
      </Button>
    </Stack>
  )
}
