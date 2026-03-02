import type { DifficultyTier, PuzzleClues, PuzzleDefinition } from '@/core/types'

function extractCluesFromSolution(solution: boolean[][]): PuzzleClues {
  const size = solution.length
  const rowClues = solution.map((row) => {
    const runs: number[] = []
    let run = 0
    for (const cell of row) {
      if (cell) {
        run += 1
      } else if (run > 0) {
        runs.push(run)
        run = 0
      }
    }
    if (run > 0) {
      runs.push(run)
    }
    return runs.length > 0 ? runs : [0]
  })

  const colClues = Array.from({ length: size }, (_, col) => {
    const runs: number[] = []
    let run = 0
    for (let row = 0; row < size; row += 1) {
      if (solution[row][col]) {
        run += 1
      } else if (run > 0) {
        runs.push(run)
        run = 0
      }
    }
    if (run > 0) {
      runs.push(run)
    }
    return runs.length > 0 ? runs : [0]
  })

  return {
    rows: rowClues,
    cols: colClues,
  }
}

function createFixturePuzzle(
  id: string,
  tier: DifficultyTier,
  seed: number,
  solution: boolean[][],
): PuzzleDefinition {
  return {
    id,
    seed,
    tier,
    size: solution.length,
    solution,
    clues: extractCluesFromSolution(solution),
  }
}

export const puzzle5x5 = createFixturePuzzle('fixture-5x5', 1, 5_005, [
  [true, true, false, true, false],
  [true, true, true, false, false],
  [true, true, false, true, false],
  [false, false, true, false, false],
  [false, false, false, false, false],
])

export const puzzle10x10 = createFixturePuzzle('fixture-10x10', 2, 10_010, [
  [false, false, true, true, true, true, true, true, false, false],
  [false, true, true, false, false, false, false, true, true, false],
  [true, true, false, false, false, false, false, false, true, true],
  [true, false, false, false, true, true, false, false, false, true],
  [true, false, false, true, true, true, true, false, false, true],
  [true, false, false, true, true, true, true, false, false, true],
  [true, false, false, false, true, true, false, false, false, true],
  [true, true, false, false, false, false, false, false, true, true],
  [false, true, true, false, false, false, false, true, true, false],
  [false, false, true, true, true, true, true, true, false, false],
])

export const puzzle15x15 = createFixturePuzzle('fixture-15x15', 3, 15_015, [
  [false, false, false, true, true, true, true, true, true, true, true, true, false, false, false],
  [false, false, true, true, false, false, false, false, false, false, false, true, true, false, false],
  [false, true, true, false, false, false, false, false, false, false, false, false, true, true, false],
  [true, true, false, false, false, false, true, true, true, false, false, false, false, true, true],
  [true, false, false, false, true, true, true, true, true, true, true, false, false, false, true],
  [true, false, false, true, true, false, false, false, false, false, true, true, false, false, true],
  [true, false, false, true, false, false, true, true, true, false, false, true, false, false, true],
  [true, false, false, true, false, true, true, true, true, true, false, true, false, false, true],
  [true, false, false, true, false, false, true, true, true, false, false, true, false, false, true],
  [true, false, false, true, true, false, false, false, false, false, true, true, false, false, true],
  [true, false, false, false, true, true, true, true, true, true, true, false, false, false, true],
  [true, true, false, false, false, false, true, true, true, false, false, false, false, true, true],
  [false, true, true, false, false, false, false, false, false, false, false, false, true, true, false],
  [false, false, true, true, false, false, false, false, false, false, false, true, true, false, false],
  [false, false, false, true, true, true, true, true, true, true, true, true, false, false, false],
])

export const puzzleFixtures = [puzzle5x5, puzzle10x10, puzzle15x15] as const

export function getFixturePuzzleByTier(tier: DifficultyTier): PuzzleDefinition {
  if (tier === 1) {
    return puzzle5x5
  }
  if (tier === 2) {
    return puzzle10x10
  }
  return {
    ...puzzle15x15,
    id: `fixture-15x15-tier-${tier}`,
    tier,
  }
}
