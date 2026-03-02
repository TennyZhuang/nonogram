import type { PuzzleClues } from '@/core/types'

export function extractLineClue(line: boolean[]): number[] {
  const runs: number[] = []
  let run = 0
  for (const cell of line) {
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
}

export function extractClues(grid: boolean[][]): PuzzleClues {
  const size = grid.length
  const rows = grid.map((row) => extractLineClue(row))
  const cols = Array.from({ length: size }, (_, colIndex) =>
    extractLineClue(Array.from({ length: size }, (_, rowIndex) => grid[rowIndex][colIndex])),
  )
  return { rows, cols }
}
