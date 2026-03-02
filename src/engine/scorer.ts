import type { DifficultyTier } from '@/core/types'
import type { SolverTrace } from '@/engine/solver'

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
    return 5
  }

  if (trace.usedPhase2) {
    return trace.phase2CellsSolved > 40 ? 4 : 3
  }

  return 3
}
