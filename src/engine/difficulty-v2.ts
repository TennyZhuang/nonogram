import type { DifficultyTier, PuzzleClues } from '@/core/types'
import {
  solvePuzzleHuman,
  type HumanRuleId,
  type HumanSolverTrace,
} from '@/engine/human-solver'

export interface HumanDifficultyFeatures {
  strongestRule: HumanRuleId | null
  stepCount: number
  inferenceCount: number
  probeCount: number
  guessCount: number
  backtrackCount: number
  averageCellsPerStep: number
  revelationBalance: number
  deterministicSolved: boolean
}

export interface DifficultyAssessment {
  tier: DifficultyTier
  score: number
  features: HumanDifficultyFeatures
  rationale: string[]
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

function normalizeStrongestRule(rule: HumanRuleId | null): HumanRuleId | null {
  if (rule === 'backtrack') {
    return 'guess'
  }
  return rule
}

export function extractHumanDifficultyFeatures(
  trace: HumanSolverTrace,
): HumanDifficultyFeatures {
  const inferenceSteps = trace.steps.filter((step) => step.changes.length > 0)
  const inferenceCount = inferenceSteps.reduce(
    (sum, step) => sum + step.changes.length,
    0,
  )
  const midpoint = Math.floor(inferenceSteps.length / 2)
  const laterInferenceCount = inferenceSteps
    .slice(midpoint)
    .reduce((sum, step) => sum + step.changes.length, 0)

  return {
    strongestRule: normalizeStrongestRule(trace.summary.strongestRule),
    stepCount: trace.summary.totalSteps,
    inferenceCount,
    probeCount: trace.summary.totalProbes,
    guessCount: trace.summary.totalGuesses,
    backtrackCount: trace.summary.totalBacktracks,
    averageCellsPerStep:
      inferenceSteps.length === 0 ? 0 : inferenceCount / inferenceSteps.length,
    revelationBalance:
      inferenceCount === 0 ? 0 : laterInferenceCount / inferenceCount,
    deterministicSolved: trace.summary.deterministicSolved,
  }
}

export function scoreDifficultyV2(
  trace: HumanSolverTrace,
  size: number,
): DifficultyAssessment {
  const features = extractHumanDifficultyFeatures(trace)

  let score = size <= 10 ? 0.8 : 2.8
  switch (features.strongestRule) {
    case 'line-completion':
      score += 0.1
      break
    case 'overlap-consensus':
      score += 0.8
      break
    case 'single-cell-probe':
      score += 1.8
      break
    case 'guess':
      score += 2.8
      break
    default:
      break
  }

  score += Math.min(size <= 10 ? 0.9 : 1.2, features.stepCount / (size <= 10 ? 8 : 14))
  score += Math.min(1.4, features.probeCount * 0.35)
  score += Math.min(2.0, features.guessCount * 0.8)
  score += Math.min(1.5, features.backtrackCount * 0.6)

  if (features.averageCellsPerStep < 1.8) {
    score += 0.6
  } else if (features.averageCellsPerStep < 3) {
    score += 0.3
  }

  if (features.revelationBalance > 0.7 && features.strongestRule !== 'line-completion') {
    score += 0.15
  }

  const rationale: string[] = []
  if (features.strongestRule === 'guess') {
    rationale.push('requires explicit guessing/backtracking')
  } else if (features.strongestRule === 'single-cell-probe') {
    rationale.push('requires contradiction-based probing')
  } else if (features.strongestRule === 'overlap-consensus') {
    rationale.push('requires non-trivial overlap/consensus deductions')
  } else {
    rationale.push('solves with direct line-completion rules')
  }

  if (features.averageCellsPerStep < 2) {
    rationale.push('each step yields relatively little information')
  }
  if (features.revelationBalance > 0.7) {
    rationale.push('most information is revealed in the late game')
  }
  if (features.backtrackCount > 0) {
    rationale.push('wrong branches must be recognized and unwound')
  }
  if (features.probeCount >= 10 && features.averageCellsPerStep < 2.2) {
    rationale.push('repeated low-yield probing creates sustained late-game tension')
  }

  let tier: DifficultyTier
  if (size <= 10) {
    tier =
      features.strongestRule === 'line-completion' &&
      features.guessCount === 0 &&
      features.probeCount === 0 &&
      (size <= 5 || features.averageCellsPerStep >= 5)
        ? 1
        : 2
  } else if (
    features.guessCount > 0 ||
    (
      features.probeCount >= 10 &&
      features.stepCount >= 50 &&
      features.averageCellsPerStep < 2.2
    )
  ) {
    tier = 6
  } else if (features.probeCount > 0) {
    tier = 5
  } else if (
    features.strongestRule === 'overlap-consensus' &&
    (
      features.averageCellsPerStep < 3 ||
      features.revelationBalance > 0.5 ||
      features.stepCount >= 85
    )
  ) {
    tier = 4
  } else {
    tier = 3
  }

  return {
    tier,
    score: clamp(score, size <= 10 ? 0 : 2, 6),
    features,
    rationale,
  }
}

export function assessPuzzleDifficultyV2(
  clues: PuzzleClues,
  size: number,
): DifficultyAssessment {
  const result = solvePuzzleHuman(clues)
  return scoreDifficultyV2(result.trace, size)
}
