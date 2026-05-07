import type { AlgorithmCinemaPayload, MessageStep, NarrationStep, NodeStateStep } from '../model/algorithmCinema'

let uid = 0
function id(prefix = 'm') { return `${prefix}-${++uid}` }

// Snapshot des structures de données à un instant T
export type SKSnapshot = {
  RN: number[][]   // RN[i][j] = dernier numéro de séquence reçu par i de j
  LN: number[]     // LN[j] = dernier numéro de séquence exécuté par j (dans le token)
  Q: number[]      // File d'attente du token
  tokenHolder: number
  processes: number[]
  phase: string    // Description de la phase en cours
  highlight?: {    // Mise en évidence d'une cellule particulière
    rnCell?: { i: number; j: number }
    lnCell?: number
  }
}

// On enrichit le type meta de chaque step avec un snapshot SK
export type SKMessageMeta = {
  seqNum?: number
  LN?: number[]
  Q?: number[]
  snapshot: SKSnapshot
}

export function generateSuzukiKasamiCinema(
  requester: number,
  processes: number[],
  initialTokenHolder: number
): AlgorithmCinemaPayload {
  const steps: Array<any> = []

  const N = processes.length

  // ─── Structures de données ───────────────────────────────────────────────
  // RN[i][j] : le site i connaît le numéro de séquence j de chaque site
  const RN: number[][] = Array(N).fill(0).map(() => Array(N).fill(0))
  // LN[j] : dernière requête exécutée pour le site j (dans le token)
  const LN: number[] = Array(N).fill(0)
  // Q : file d'attente dans le token
  const Q: number[] = []

  let tokenHolder = initialTokenHolder

  // Map IDs ↔ indices
  const processToIndex = new Map<number, number>()
  const indexToProcess = new Map<number, number>()
  processes.forEach((p, i) => {
    processToIndex.set(p, i)
    indexToProcess.set(i, p)
  })

  const requesterIdx = processToIndex.get(requester)!

  // Helper : crée un snapshot immuable de l'état courant
  function snap(phase: string, highlight?: SKSnapshot['highlight']): SKSnapshot {
    return {
      RN: RN.map(row => [...row]),
      LN: [...LN],
      Q: [...Q],
      tokenHolder,
      processes: [...processes],
      phase,
      highlight,
    }
  }

  // ─── Narration helper ────────────────────────────────────────────────────
  function narrate(text: string, phase: string, highlight?: SKSnapshot['highlight']) {
    steps.push({
      type: 'narration',
      id: id('n'),
      text,
      meta: { snapshot: snap(phase, highlight) },
    } as NarrationStep & { meta: any })
  }

  function nodeStep(nodeId: number, state: any, phase: string) {
    steps.push({
      type: 'node',
      id: id('ns'),
      nodeId,
      state,
      meta: { snapshot: snap(phase) },
    } as NodeStateStep & { meta: any })
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 0 — État initial
  // ═══════════════════════════════════════════════════════════════════════
  narrate(
    `📚 ALGORITHME SUZUKI-KASAMI — Exclusion mutuelle par jeton\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Structures de données :\n` +
    `• RN[i][j] : numéro de séquence max reçu par le site i du site j\n` +
    `• LN[j]    : numéro de la dernière requête exécutée pour le site j (dans le TOKEN)\n` +
    `• Q        : file d'attente des sites en attente du token\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `État initial : tous les RN et LN sont à 0, Q est vide.\n` +
    `Le jeton est chez le processus P${tokenHolder}.`,
    'INIT'
  )

  // Marquer le détenteur initial du token
  nodeStep(tokenHolder, {
    color: '#FFD700',
    label: `P${tokenHolder}`,
    badges: { token: '🔑' },
  }, 'INIT')

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 1 — Le requérant veut entrer en SC
  // ═══════════════════════════════════════════════════════════════════════
  narrate(
    `🔵 PHASE 1 — Demande d'entrée en section critique\n` +
    `Le processus P${requester} veut entrer en SC mais ne possède pas le token.\n` +
    `→ Il incrémente son numéro de séquence : RN${requester}[${requester}] = ${RN[requesterIdx][requesterIdx]} + 1`,
    'REQUEST_INIT'
  )

  RN[requesterIdx][requesterIdx]++
  const sn = RN[requesterIdx][requesterIdx]

  narrate(
    `✅ RN${requester}[${requester}] est maintenant = ${sn}\n` +
    `P${requester} va envoyer REQUEST(${requester}, sn=${sn}) à TOUS les autres processus.\n` +
    `Le message REQUEST contient : l'identifiant du site (${requester}) et son numéro de séquence (${sn}).`,
    'REQUEST_SENT',
    { rnCell: { i: requesterIdx, j: requesterIdx } }
  )

  // Cas spécial : le requérant EST le détenteur du token
  if (requester === tokenHolder) {
    narrate(
      `⚡ P${requester} possède déjà le token — entrée directe en SC !\n` +
      `Aucun message n'est nécessaire (complexité = 0 message).`,
      'ENTER_CS'
    )
    nodeStep(requester, { color: 'orange', badges: { token: '🔑', cs: 'CS' } }, 'IN_CS')
    LN[requesterIdx] = sn
    narrate(`✅ P${requester} exécute sa SC. LN[${requester}] = ${sn}`, 'IN_CS')
    narrate(`🏁 P${requester} quitte la SC et conserve le token (Q vide).`, 'EXIT_CS')
    nodeStep(requester, { color: '#FFD700', badges: { token: '🔑' } }, 'EXIT_CS')
    return { metadata: { name: 'Suzuki-Kasami demo', algo: 'Suzuki-Kasami' }, steps }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 2 — Broadcast des REQUEST
  // ═══════════════════════════════════════════════════════════════════════
  narrate(
    `📤 PHASE 2 — Broadcast de REQUEST(${requester}, ${sn})\n` +
    `P${requester} envoie REQUEST à tous les ${N - 1} autres processus.\n` +
    `Complexité max : N-1 = ${N - 1} messages REQUEST + 1 message TOKEN = ${N} messages total.`,
    'BROADCAST'
  )

  const others = processes.filter(p => p !== requester)

  // Envoi des messages REQUEST
  others.forEach(p => {
    steps.push({
      type: 'message',
      id: id('msg'),
      from: requester,
      to: p,
      msgType: 'SK_REQUEST',
      meta: { seqNum: sn, snapshot: snap('BROADCAST') },
    } as MessageStep & { meta: any })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 3 — Réception des REQUEST par chaque site
  // ═══════════════════════════════════════════════════════════════════════
  narrate(
    `📥 PHASE 3 — Traitement des REQUEST par les autres sites\n` +
    `Règle : quand Sj reçoit REQUEST(i, sn) de Si :\n` +
    `  → RNj[i] = max(RNj[i], sn)\n` +
    `  → Si Sj a le token ET RNj[i] == LN[i] + 1 → il envoie le token`,
    'RECEIVE_REQUEST'
  )

  others.forEach(p => {
    const pIdx = processToIndex.get(p)!
    const oldRN = RN[pIdx][requesterIdx]

    // Livraison du message
    steps.push({
      type: 'message',
      id: id('msg'),
      from: requester,
      to: p,
      msgType: 'SK_REQUEST',
      meta: { seqNum: sn, snapshot: snap('RECEIVE_REQUEST') },
    })

    RN[pIdx][requesterIdx] = Math.max(RN[pIdx][requesterIdx], sn)
    const newRN = RN[pIdx][requesterIdx]

    narrate(
      `📨 P${p} reçoit REQUEST(${requester}, ${sn})\n` +
      `  RN${p}[${requester}] = max(${oldRN}, ${sn}) = ${newRN}\n` +
      `  Vérification pour envoi du token :\n` +
      `  P${p} a le token ? ${p === tokenHolder ? '✅ OUI' : '❌ NON'}\n` +
      (p === tokenHolder
        ? `  RN${p}[${requester}]=${newRN} == LN[${requester}]+1=${LN[requesterIdx] + 1} ? ${newRN === LN[requesterIdx] + 1 ? '✅ OUI → envoi du token !' : '❌ NON → garde le token'}`
        : `  → P${p} ne fait qu'enregistrer la mise à jour de RN.`),
      'RECEIVE_REQUEST',
      { rnCell: { i: pIdx, j: requesterIdx } }
    )

    if (p === tokenHolder && newRN === LN[requesterIdx] + 1) {
      // ─── Envoi du token ───────────────────────────────────────────────
      narrate(
        `🏅 P${p} envoie le TOKEN à P${requester}\n` +
        `  Le token contient : LN=[${LN.join(', ')}], Q=[${Q.join(', ')}]`,
        'SEND_TOKEN'
      )

      steps.push({
        type: 'message',
        id: id('msg'),
        from: p,
        to: requester,
        msgType: 'SK_TOKEN',
        meta: { LN: [...LN], Q: [...Q], snapshot: snap('SEND_TOKEN') },
      } as MessageStep & { meta: any })

      nodeStep(p, { color: 'skyblue', badges: {} }, 'SEND_TOKEN')

      // Livraison du token
      steps.push({
        type: 'message',
        id: id('msg'),
        from: p,
        to: requester,
        msgType: 'SK_TOKEN',
        meta: { LN: [...LN], Q: [...Q], snapshot: snap('RECEIVE_TOKEN') },
      })

      tokenHolder = requester
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 4 — Réception du token et entrée en SC
  // ═══════════════════════════════════════════════════════════════════════
  narrate(
    `🎯 PHASE 4 — P${requester} reçoit le TOKEN et entre en SC\n` +
    `  Le token contient LN=[${LN.join(', ')}] et Q=[${Q.join(', ')}].\n` +
    `  P${requester} peut maintenant exécuter sa section critique.`,
    'ENTER_CS'
  )

  nodeStep(requester, { color: '#FFD700', badges: { token: '🔑' } }, 'ENTER_CS')

  narrate(
    `🔒 P${requester} ENTRE en Section Critique (SC)\n` +
    `  → Accès exclusif garanti par la possession du TOKEN unique.`,
    'IN_CS'
  )

  nodeStep(requester, { color: 'orange', badges: { token: '🔑', cs: 'CS' } }, 'IN_CS')

  LN[requesterIdx] = RN[requesterIdx][requesterIdx]

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 5 — Sortie de SC et mise à jour du token
  // ═══════════════════════════════════════════════════════════════════════
  narrate(
    `🔓 PHASE 5 — P${requester} QUITTE la SC et met à jour le TOKEN\n` +
    `  Étape 1 : LN[${requester}] = RN${requester}[${requester}] = ${LN[requesterIdx]}\n` +
    `  → Indique que la requête ${LN[requesterIdx]} de P${requester} a été exécutée.`,
    'EXIT_CS',
    { lnCell: requesterIdx }
  )

  nodeStep(requester, { color: '#FFD700', badges: { token: '🔑' } }, 'EXIT_CS')

  // Construction de Q : chercher les sites avec requêtes en attente
  narrate(
    `🔍 PHASE 5 — Étape 2 : Mise à jour de la file Q du TOKEN\n` +
    `  Pour chaque site Sj NOT in Q :\n` +
    `  si RN${requester}[j] == LN[j] + 1 → Sj a une requête en attente → ajouter à Q\n` +
    `  Vérification pour chaque site :`,
    'BUILD_QUEUE'
  )

  Q.length = 0
  processes.forEach(p => {
    if (p === requester) return
    const pIdx = processToIndex.get(p)!
    const rnVal = RN[requesterIdx][pIdx]
    const lnVal = LN[pIdx]
    const hasRequest = rnVal === lnVal + 1

    narrate(
      `  P${p} : RN${requester}[${p}]=${rnVal} ${hasRequest ? '==' : '≠'} LN[${p}]+1=${lnVal + 1} → ${hasRequest ? `✅ ajout de P${p} à Q` : '❌ pas de requête en attente'}`,
      'BUILD_QUEUE',
      { rnCell: { i: requesterIdx, j: pIdx }, lnCell: pIdx }
    )

    if (hasRequest && !Q.includes(p)) {
      Q.push(p)
    }
  })

  narrate(
    `📋 File Q après mise à jour : [${Q.length > 0 ? Q.map(p => `P${p}`).join(', ') : 'vide'}]`,
    'BUILD_QUEUE'
  )

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE 6 — Passage du token ou conservation
  // ═══════════════════════════════════════════════════════════════════════
  if (Q.length > 0) {
    const next = Q.shift()!

    narrate(
      `📤 PHASE 6 — Token passé à P${next} (premier dans Q)\n` +
      `  Q était [P${next}${Q.length > 0 ? ', ' + Q.map(p => `P${p}`).join(', ') : ''}]\n` +
      `  → Token envoyé avec LN=[${LN.join(', ')}] et Q=[${Q.join(', ')}]`,
      'PASS_TOKEN'
    )

    steps.push({
      type: 'message',
      id: id('msg'),
      from: requester,
      to: next,
      msgType: 'SK_TOKEN',
      meta: { LN: [...LN], Q: [...Q], snapshot: snap('PASS_TOKEN') },
    } as MessageStep & { meta: any })

    nodeStep(requester, { color: 'skyblue', badges: {} }, 'PASS_TOKEN')

    steps.push({
      type: 'message',
      id: id('msg'),
      from: requester,
      to: next,
      msgType: 'SK_TOKEN',
      meta: { LN: [...LN], Q: [...Q], snapshot: snap('PASS_TOKEN') },
    })

    tokenHolder = next

    nodeStep(next, { color: '#FFD700', badges: { token: '🔑' } }, 'PASS_TOKEN')

    narrate(
      `✅ P${next} détient maintenant le TOKEN.\n` +
      `  État final : tokenHolder=P${next}, LN=[${LN.join(', ')}], Q=[${Q.join(', ')}]`,
      'DONE'
    )
  } else {
    narrate(
      `📦 PHASE 6 — Q est vide, P${requester} conserve le TOKEN\n` +
      `  Aucun site n'a de requête en attente.\n` +
      `  → Complexité : 0 message supplémentaire (token idle chez P${requester}).\n` +
      `  État final : LN=[${LN.join(', ')}], Q=[]`,
      'DONE'
    )
  }

  return { metadata: { name: 'Suzuki-Kasami demo', algo: 'Suzuki-Kasami' }, steps }
}

export default generateSuzukiKasamiCinema