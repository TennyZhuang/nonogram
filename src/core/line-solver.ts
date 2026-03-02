import type { CellState } from '@/core/types'
import { isEmptyState, isFilledState } from '@/core/types'

export interface LineAutoCompleteInput {
  line: CellState[]
  solution: boolean[]
  clue: number[]
}

export interface LineAutoCompleteChange {
  index: number
  newState: 'filled' | 'marked-empty'
}

export function isLineConsistentWithSolution(
  line: CellState[],
  solution: boolean[],
): boolean {
  if (line.length !== solution.length) {
    return false
  }

  for (let i = 0; i < line.length; i += 1) {
    const cell = line[i]
    if (cell === 'unknown') {
      continue
    }
    if (isFilledState(cell) && !solution[i]) {
      return false
    }
    if (isEmptyState(cell) && solution[i]) {
      return false
    }
  }

  return true
}

export function applyLineAutoCompletion(
  input: LineAutoCompleteInput,
): LineAutoCompleteChange[] {
  const { line, solution, clue } = input
  if (line.length !== solution.length) {
    return []
  }

  if (!isLineConsistentWithSolution(line, solution)) {
    return []
  }

  const totalFilledFromClue = clue.length === 1 && clue[0] === 0 ? 0 : clue.reduce((sum, v) => sum + v, 0)
  let filledCount = 0
  let emptyCount = 0
  const unknownIndexes: number[] = []

  line.forEach((cell, index) => {
    if (isFilledState(cell)) {
      filledCount += 1
      return
    }
    if (isEmptyState(cell)) {
      emptyCount += 1
      return
    }
    unknownIndexes.push(index)
  })

  if (unknownIndexes.length === 0) {
    return []
  }

  if (filledCount === totalFilledFromClue) {
    return unknownIndexes.map((index) => ({ index, newState: 'marked-empty' }))
  }

  if (emptyCount === line.length - totalFilledFromClue) {
    return unknownIndexes.map((index) => ({ index, newState: 'filled' }))
  }

  return []
}
