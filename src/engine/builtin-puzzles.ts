import type { DifficultyTier, PuzzleDefinition } from '@/core/types'
import { extractClues } from '@/engine/clue-extractor'
import { BUILTIN_PUZZLES_RAW } from '@/engine/builtin-puzzles.pool'

const TIERS: DifficultyTier[] = [1, 2, 3, 4, 5, 6]
const EXPECTED_PUZZLES_PER_TIER: Record<DifficultyTier, number> = {
  1: 10,
  2: 10,
  3: 10,
  4: 10,
  5: 10,
  6: 50,
}

type BuiltinPuzzlePool = Record<DifficultyTier, PuzzleDefinition[]>

interface BuiltinFallbackState {
  cursor: number
  lastIndex: number | null
  order: number[]
}

const fallbackStateByTier: Record<DifficultyTier, BuiltinFallbackState> = {
  1: { cursor: 0, lastIndex: null, order: [] },
  2: { cursor: 0, lastIndex: null, order: [] },
  3: { cursor: 0, lastIndex: null, order: [] },
  4: { cursor: 0, lastIndex: null, order: [] },
  5: { cursor: 0, lastIndex: null, order: [] },
  6: { cursor: 0, lastIndex: null, order: [] },
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
    if (rawItems.length !== EXPECTED_PUZZLES_PER_TIER[tier]) {
      throw new Error(
        `Builtin puzzle count mismatch for tier ${tier}: expected ${EXPECTED_PUZZLES_PER_TIER[tier]}, got ${rawItems.length}`,
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

function createShuffledIndexes(length: number): number[] {
  const indexes = Array.from({ length }, (_, index) => index)
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]]
  }
  return indexes
}

function refillFallbackOrder(tier: DifficultyTier): void {
  const pool = builtinPoolByTier[tier]
  const state = fallbackStateByTier[tier]
  const order = createShuffledIndexes(pool.length)

  if (
    state.lastIndex !== null &&
    order.length > 1 &&
    order[0] === state.lastIndex
  ) {
    ;[order[0], order[1]] = [order[1], order[0]]
  }

  state.order = order
  state.cursor = 0
}

export function getBuiltinFallbackPuzzleByTier(tier: DifficultyTier): PuzzleDefinition {
  const pool = builtinPoolByTier[tier]
  const state = fallbackStateByTier[tier]
  if (state.order.length === 0 || state.cursor >= state.order.length) {
    refillFallbackOrder(tier)
  }

  const nextIndex = state.order[state.cursor]
  state.cursor += 1
  state.lastIndex = nextIndex
  const nextPuzzle = pool[nextIndex]
  return clonePuzzle(nextPuzzle)
}

export function resetBuiltinFallbackCursorForTests(): void {
  for (const tier of TIERS) {
    fallbackStateByTier[tier] = {
      cursor: 0,
      lastIndex: null,
      order: [],
    }
  }
}
