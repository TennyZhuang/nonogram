import type { DifficultyTier } from '@/core/types'
import type { SolverTrace } from '@/engine/solver'

export { assessPuzzleDifficultyV2, scoreDifficultyV2 } from '@/engine/difficulty-v2'

export function scoreDifficulty(
  trace: SolverTrace,
  size: number,
): DifficultyTier {
  if (size <= 10) {
    if (trace.usedPhase3) {
      return 2
    }
    return trace.phase1CellsSolved <= 20 ? 1 : 2
  }

  if (trace.usedPhase3) {
    if (trace.guaranteedLivesToDeterministic <= 2) {
      return 6
    }
    return 5
  }

  if (trace.usedPhase2) {
    return trace.phase2CellsSolved > 40 ? 4 : 3
  }

  return 3
}
