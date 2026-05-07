import type { RicartScenario } from '../../algorithms/ricartAgrawalaCinema'

const scenario: RicartScenario = {
  requester: 1,
  processes: [1, 2, 3],
  alsoRequesting: [2, 3],  // 3 demandeurs concurrents
}

export default scenario
