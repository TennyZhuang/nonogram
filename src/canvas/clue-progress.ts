import {
  isEmptyState,
  isFilledState,
  type Board,
  type CellState,
  type PuzzleClues,
} from '@/core/types'

interface RunSegment {
  start: number
  length: number
}

export interface LineClueSegment {
  start: number
  length: number
  resolved: boolean
}

export interface ClueProgress {
  rows: boolean[][]
  cols: boolean[][]
}

function extractRunSegments(line: boolean[]): RunSegment[] {
  const segments: RunSegment[] = []
  let runStart = -1

  for (let index = 0; index <= line.length; index += 1) {
    const isFilled = index < line.length ? line[index] : false
    if (isFilled && runStart < 0) {
      runStart = index
      continue
    }

    if (!isFilled && runStart >= 0) {
      segments.push({
        start: runStart,
        length: index - runStart,
      })
      runStart = -1
    }
  }

  return segments
}

export function resolveLineClues(
  line: CellState[],
  solutionLine: boolean[],
  clue: number[],
): boolean[] {
  if (clue.length === 1 && clue[0] === 0) {
    return [line.every((cell) => isEmptyState(cell))]
  }

  const segments = extractRunSegments(solutionLine)
  const resolved = clue.map(() => false)
  const checkCount = Math.min(clue.length, segments.length)

  for (let index = 0; index < checkCount; index += 1) {
    const expectedLength = clue[index]
    const segment = segments[index]
    if (!segment || expectedLength !== segment.length) {
      continue
    }

    let allFilled = true
    const segmentEnd = segment.start + segment.length
    for (let cellIndex = segment.start; cellIndex < segmentEnd; cellIndex += 1) {
      if (!isFilledState(line[cellIndex])) {
        allFilled = false
        break
      }
    }

    resolved[index] = allFilled
  }

  return resolved
}

export function resolveLineClueSegments(
  line: CellState[],
  solutionLine: boolean[],
  clue: number[],
): LineClueSegment[] {
  if (clue.length === 1 && clue[0] === 0) {
    return []
  }

  const segments = extractRunSegments(solutionLine)
  const resolved = resolveLineClues(line, solutionLine, clue)
  const lineSegments: LineClueSegment[] = []
  const checkCount = Math.min(clue.length, segments.length)

  for (let index = 0; index < checkCount; index += 1) {
    const expectedLength = clue[index]
    const segment = segments[index]
    if (!segment || expectedLength !== segment.length) {
      continue
    }

    lineSegments.push({
      start: segment.start,
      length: segment.length,
      resolved: resolved[index] ?? false,
    })
  }

  return lineSegments
}

export function resolveClueProgress(
  board: Board,
  solution: boolean[][],
  clues: PuzzleClues,
): ClueProgress {
  const rows = clues.rows.map((clue, row) => resolveLineClues(board[row], solution[row], clue))

  const cols = clues.cols.map((clue, col) => {
    const line = board.map((row) => row[col])
    const solutionLine = solution.map((row) => row[col])
    return resolveLineClues(line, solutionLine, clue)
  })

  return { rows, cols }
}
