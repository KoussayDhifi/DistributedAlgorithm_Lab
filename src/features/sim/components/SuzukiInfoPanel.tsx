import React from 'react'
import { useSim } from '../state/SimProvider'
import type { SKSnapshot } from '../algorithms/suzukiKasamiCinema'

// Couleurs par phase
const PHASE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  INIT:            { bg: '#1a1a2e', border: '#4dabf7', icon: '📚' },
  REQUEST_INIT:    { bg: '#1a2a1a', border: '#51cf66', icon: '🔵' },
  REQUEST_SENT:    { bg: '#1a2a1a', border: '#51cf66', icon: '📤' },
  BROADCAST:       { bg: '#2a1a00', border: '#fd7e14', icon: '📡' },
  RECEIVE_REQUEST: { bg: '#1a1a2a', border: '#845ef7', icon: '📥' },
  SEND_TOKEN:      { bg: '#2a2200', border: '#FFD700', icon: '🏅' },
  RECEIVE_TOKEN:   { bg: '#2a2200', border: '#FFD700', icon: '🎯' },
  ENTER_CS:        { bg: '#2a1500', border: '#ff6b35', icon: '🔒' },
  IN_CS:           { bg: '#2a1000', border: '#ff4500', icon: '⚡' },
  EXIT_CS:         { bg: '#00200a', border: '#2ecc71', icon: '🔓' },
  BUILD_QUEUE:     { bg: '#1a0020', border: '#cc5de8', icon: '📋' },
  PASS_TOKEN:      { bg: '#2a2200', border: '#FFD700', icon: '➡️' },
  DONE:            { bg: '#002020', border: '#20c997', icon: '✅' },
}

function RNTable({ RN, processes, highlight }: {
  RN: number[][]
  processes: number[]
  highlight?: { i: number; j: number }
}) {
  const N = processes.length
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        borderCollapse: 'collapse',
        fontSize: 13,
        fontFamily: 'monospace',
        margin: '0 auto',
      }}>
        <thead>
          <tr>
            <th style={thStyle('#1a1a3a')}>RN[i][j]</th>
            {processes.map(p => (
              <th key={p} style={thStyle('#1e2a4a')}>P{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processes.map((pi, i) => (
            <tr key={pi}>
              <td style={thStyle('#1e2a4a')}>P{pi}</td>
              {processes.map((pj, j) => {
                const isHL = highlight?.i === i && highlight?.j === j
                return (
                  <td key={pj} style={{
                    ...tdStyle,
                    background: isHL ? '#FFD700' : RN[i][j] > 0 ? '#1a3a1a' : '#111',
                    color: isHL ? '#000' : RN[i][j] > 0 ? '#51cf66' : '#555',
                    fontWeight: isHL || RN[i][j] > 0 ? 'bold' : 'normal',
                    boxShadow: isHL ? '0 0 8px #FFD700' : 'none',
                    transform: isHL ? 'scale(1.1)' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {RN[i][j]}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LNRow({ LN, processes, highlight }: {
  LN: number[]
  processes: number[]
  highlight?: number
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        borderCollapse: 'collapse',
        fontSize: 13,
        fontFamily: 'monospace',
        margin: '0 auto',
      }}>
        <thead>
          <tr>
            <th style={thStyle('#2a1a00')}>LN[j] (TOKEN)</th>
            {processes.map(p => (
              <th key={p} style={thStyle('#3a2a00')}>P{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={thStyle('#3a2a00')}>LN</td>
            {processes.map((p, j) => {
              const isHL = highlight === j
              return (
                <td key={p} style={{
                  ...tdStyle,
                  background: isHL ? '#FFD700' : LN[j] > 0 ? '#2a1a00' : '#111',
                  color: isHL ? '#000' : LN[j] > 0 ? '#fd7e14' : '#555',
                  fontWeight: isHL || LN[j] > 0 ? 'bold' : 'normal',
                  boxShadow: isHL ? '0 0 8px #FFD700' : 'none',
                  transform: isHL ? 'scale(1.1)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {LN[j]}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function QueueDisplay({ Q }: { Q: number[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ color: '#cc5de8', fontFamily: 'monospace', fontWeight: 'bold' }}>Q =</span>
      <span style={{ color: '#aaa', fontFamily: 'monospace' }}>[</span>
      {Q.length === 0
        ? <span style={{ color: '#555', fontFamily: 'monospace', fontStyle: 'italic' }}>vide</span>
        : Q.map((p, i) => (
            <React.Fragment key={i}>
              <span style={{
                background: '#3a1a4a',
                border: '1px solid #cc5de8',
                borderRadius: 4,
                padding: '2px 8px',
                color: '#cc5de8',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              }}>P{p}</span>
              {i < Q.length - 1 && <span style={{ color: '#aaa' }}>,</span>}
            </React.Fragment>
          ))
      }
      <span style={{ color: '#aaa', fontFamily: 'monospace' }}>]</span>
    </div>
  )
}

function TokenBadge({ holder }: { holder: number }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
      borderRadius: 20,
      padding: '4px 14px',
      boxShadow: '0 0 12px #FFD70088',
      fontWeight: 'bold',
      fontSize: 14,
      color: '#000',
    }}>
      🔑 TOKEN chez P{holder}
    </div>
  )
}

// ─── Styles partagés ──────────────────────────────────────────────────────────
const thStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#aaa',
  padding: '4px 10px',
  border: '1px solid #333',
  textAlign: 'center',
  fontSize: 12,
  fontFamily: 'monospace',
})

const tdStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #333',
  textAlign: 'center',
  minWidth: 36,
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function SuzukiInfoPanel() {
  const { state } = useSim()

  // Seulement pour Suzuki-Kasami
  if (state.algorithm !== 'suzuki') return null

  // Trouver le step courant avec un snapshot SK
  const currentStep = state.steps[state.index - 1]
  if (!currentStep) return null

  const meta = (currentStep as any).meta
  if (!meta?.snapshot) return null

  const snap: SKSnapshot = meta.snapshot
  const phaseStyle = PHASE_COLORS[snap.phase] || { bg: '#111', border: '#444', icon: '•' }

  // Texte narration du step courant
  const narrationText = (currentStep as any).type === 'narration'
    ? (currentStep as any).text
    : null

  return (
    <div style={{
      background: '#0d0d0d',
      border: `2px solid ${phaseStyle.border}`,
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      fontFamily: 'monospace',
      boxShadow: `0 0 20px ${phaseStyle.border}44`,
      transition: 'border-color 0.4s, box-shadow 0.4s',
    }}>
      {/* ── En-tête phase ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{
          background: phaseStyle.bg,
          border: `1px solid ${phaseStyle.border}`,
          borderRadius: 6,
          padding: '4px 12px',
          color: phaseStyle.border,
          fontWeight: 'bold',
          fontSize: 13,
        }}>
          {phaseStyle.icon} {snap.phase.replace(/_/g, ' ')}
        </div>
        <TokenBadge holder={snap.tokenHolder} />
      </div>

      {/* ── Message de narration enrichi ── */}
      {narrationText && (
        <div style={{
          background: '#111',
          border: `1px solid ${phaseStyle.border}44`,
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14,
          color: '#ddd',
          fontSize: 12,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {narrationText}
        </div>
      )}

      {/* ── Tableaux de données ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* RN */}
        <div>
          <div style={{ color: '#4dabf7', fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>
            📊 Tableau RN[i][j] — Numéros de séquence connus
          </div>
          <div style={{ fontSize: 11, color: '#777', marginBottom: 6 }}>
            RN[i][j] = dernier numéro de séquence reçu par le site i du site j
          </div>
          <RNTable
            RN={snap.RN}
            processes={snap.processes}
            highlight={snap.highlight?.rnCell}
          />
        </div>

        {/* LN */}
        <div>
          <div style={{ color: '#fd7e14', fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>
            🏅 Tableau LN[j] — Dernières requêtes exécutées (dans le TOKEN)
          </div>
          <div style={{ fontSize: 11, color: '#777', marginBottom: 6 }}>
            LN[j] = numéro de séquence de la dernière requête exécutée pour le site j
          </div>
          <LNRow
            LN={snap.LN}
            processes={snap.processes}
            highlight={snap.highlight?.lnCell}
          />
        </div>

        {/* Q */}
        <div>
          <div style={{ color: '#cc5de8', fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>
            📋 File Q du TOKEN — Sites en attente
          </div>
          <div style={{ fontSize: 11, color: '#777', marginBottom: 6 }}>
            Sites ayant une requête en attente (RN[i] == LN[i]+1 mais pas encore servis)
          </div>
          <QueueDisplay Q={snap.Q} />
        </div>

        {/* Règle de décision active */}
        {snap.phase === 'RECEIVE_REQUEST' && (
          <div style={{
            background: '#1a1a2a',
            border: '1px solid #845ef7',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            color: '#ccc',
          }}>
            <span style={{ color: '#845ef7', fontWeight: 'bold' }}>⚖️ Règle de décision :</span>
            <br/>
            Si Sj a le token <b>ET</b> RNj[i] == LN[i] + 1 → Sj envoie le token à Si
          </div>
        )}

        {snap.phase === 'BUILD_QUEUE' && (
          <div style={{
            background: '#1a0020',
            border: '1px solid #cc5de8',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            color: '#ccc',
          }}>
            <span style={{ color: '#cc5de8', fontWeight: 'bold' }}>⚖️ Règle d'ajout à Q :</span>
            <br/>
            Pour chaque Sj ∉ Q : si RN[requester][j] == LN[j] + 1 → ajouter Sj à Q
          </div>
        )}

        {/* Complexité */}
        <div style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 11,
          color: '#888',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <span>📈 Complexité max : <b style={{ color: '#aaa' }}>N = {snap.processes.length} messages</b></span>
          <span>({snap.processes.length - 1} REQUEST + 1 TOKEN)</span>
          <span>| Délai min : <b style={{ color: '#aaa' }}>0 msg</b> (token idle)</span>
        </div>
      </div>
    </div>
  )
}