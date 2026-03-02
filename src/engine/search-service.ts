import type { DifficultyTier, PuzzleDefinition } from '@/core/types'
import { generatePuzzle } from '@/engine/generator'

export interface PuzzleSearchRequest {
  tier: DifficultyTier
  seed?: number
}

export interface PuzzleSearchResult {
  puzzle: PuzzleDefinition | null
  elapsedMs: number
}

function getNowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

export function searchPuzzle(request: PuzzleSearchRequest): PuzzleDefinition | null {
  return generatePuzzle(request.tier, request.seed)
}

export function searchPuzzleWithTiming(request: PuzzleSearchRequest): PuzzleSearchResult {
  const startedAt = getNowMs()
  const puzzle = searchPuzzle(request)
  const elapsedMs = getNowMs() - startedAt
  return { puzzle, elapsedMs }
}
