import type { DifficultyTier, PuzzleDefinition } from '@/core/types'
import { extractClues } from '@/engine/clue-extractor'
import { BUILTIN_PUZZLES_RAW } from '@/engine/builtin-puzzles.data'

const TIERS: DifficultyTier[] = [1, 2, 3, 4, 5, 6]
const EXPECTED_PUZZLES_PER_TIER = 10

type BuiltinPuzzlePool = Record<DifficultyTier, PuzzleDefinition[]>

const fallbackCursorByTier: Record<DifficultyTier, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
}

function createEmptyPool(): BuiltinPuzzlePool {
  return {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  }
}

function decodeSolutionRows(rows: string[]): boolean[][] {
  if (rows.length === 0) {
    throw new Error('Builtin puzzle rows must not be empty')
  }

  const size = rows.length
  return rows.map((row, rowIndex) => {
    if (row.length !== size) {
      throw new Error(
        `Builtin puzzle row length mismatch at row ${rowIndex}: expected ${size}, got ${row.length}`,
      )
    }

    return row.split('').map((char) => {
      if (char === '1') {
        return true
      }
      if (char === '0') {
        return false
      }
      throw new Error(`Invalid builtin puzzle cell '${char}' in row '${row}'`)
    })
  })
}

function toSolutionSignature(solution: boolean[][]): string {
  return solution
    .map((row) => row.map((cell) => (cell ? '1' : '0')).join(''))
    .join('|')
}

function clonePuzzle(puzzle: PuzzleDefinition): PuzzleDefinition {
  return {
    ...puzzle,
    solution: puzzle.solution.map((row) => [...row]),
    clues: {
      rows: puzzle.clues.rows.map((row) => [...row]),
      cols: puzzle.clues.cols.map((col) => [...col]),
    },
  }
}

function createPuzzleDefinition(
  tier: DifficultyTier,
  item: (typeof BUILTIN_PUZZLES_RAW)[DifficultyTier][number],
): PuzzleDefinition {
  const solution = decodeSolutionRows(item.rows)
  return {
    id: `builtin-${item.id}`,
    seed: item.seed,
    size: solution.length,
    tier,
    solution,
    clues: extractClues(solution),
  }
}

function buildBuiltinPool(): BuiltinPuzzlePool {
  const pool = createEmptyPool()

  for (const tier of TIERS) {
    const rawItems = BUILTIN_PUZZLES_RAW[tier]
    if (rawItems.length !== EXPECTED_PUZZLES_PER_TIER) {
      throw new Error(
        `Builtin puzzle count mismatch for tier ${tier}: expected ${EXPECTED_PUZZLES_PER_TIER}, got ${rawItems.length}`,
      )
    }

    const seenSignatures = new Set<string>()
    pool[tier] = rawItems.map((item) => {
      const puzzle = createPuzzleDefinition(tier, item)
      const signature = toSolutionSignature(puzzle.solution)
      if (seenSignatures.has(signature)) {
        throw new Error(`Duplicate builtin puzzle detected in tier ${tier}: ${puzzle.id}`)
      }
      seenSignatures.add(signature)
      return puzzle
    })
  }

  return pool
}

const builtinPoolByTier = buildBuiltinPool()

export function getBuiltinFallbackPuzzleByTier(tier: DifficultyTier): PuzzleDefinition {
  const pool = builtinPoolByTier[tier]
  const cursor = fallbackCursorByTier[tier]
  const nextPuzzle = pool[cursor % pool.length]
  fallbackCursorByTier[tier] = cursor + 1
  return clonePuzzle(nextPuzzle)
}

export function resetBuiltinFallbackCursorForTests(): void {
  for (const tier of TIERS) {
    fallbackCursorByTier[tier] = 0
  }
}
