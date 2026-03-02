import type { PuzzleClues } from '@/core/types'

type SolveCell = -1 | 0 | 1
type SolveBoard = SolveCell[][]

const UNKNOWN: SolveCell = -1
const EMPTY: SolveCell = 0
const FILLED: SolveCell = 1

export interface SolverTrace {
  phase1CellsSolved: number
  phase2CellsSolved: number
  usedPhase1: boolean
  usedPhase2: boolean
  usedPhase3: boolean
  branchNodes: number
  guaranteedLivesToDeterministic: number
}

export interface SolverResult {
  solved: boolean
  unique: boolean
  solution: boolean[][] | null
  trace: SolverTrace
}

interface SolvePuzzleOptions {
  estimateGuaranteedLives?: boolean
}

interface DeductionResult {
  contradiction: boolean
  board: SolveBoard
}

interface SearchResult {
  count: number
  firstSolution: SolveBoard | null
  nodes: number
}

interface CandidateCell {
  row: number
  col: number
  options: SolveCell[]
}

const patternCache = new Map<string, number[][]>()
const MAX_GUARANTEED_LIVES = 3

function normalizeClue(clue: number[]): number[] {
  if (clue.length === 1 && clue[0] === 0) {
    return []
  }
  return clue
}

function sumClue(clue: number[]): number {
  return normalizeClue(clue).reduce((sum, run) => sum + run, 0)
}

function createUnknownBoard(size: number): SolveBoard {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => UNKNOWN as SolveCell),
  )
}

function cloneBoard(board: SolveBoard): SolveBoard {
  return board.map((row) => [...row] as SolveCell[])
}

function isSolved(board: SolveBoard): boolean {
  return board.every((row) => row.every((cell) => cell !== UNKNOWN))
}

function toBooleanBoard(board: SolveBoard): boolean[][] {
  return board.map((row) => row.map((cell) => cell === FILLED))
}

function readLine(board: SolveBoard, axis: 'row' | 'col', index: number): SolveCell[] {
  if (axis === 'row') {
    return board[index]
  }
  return board.map((row) => row[index]) as SolveCell[]
}

function applyCell(
  board: SolveBoard,
  row: number,
  col: number,
  value: SolveCell,
): { changed: boolean; contradiction: boolean } {
  const current = board[row][col]
  if (current === UNKNOWN) {
    board[row][col] = value
    return { changed: true, contradiction: false }
  }
  if (current !== value) {
    return { changed: false, contradiction: true }
  }
  return { changed: false, contradiction: false }
}

function generatePatterns(length: number, clue: number[]): number[][] {
  const normalized = normalizeClue(clue)
  const cacheKey = `${length}|${normalized.join(',')}`
  const cached = patternCache.get(cacheKey)
  if (cached) {
    return cached
  }

  if (normalized.length === 0) {
    const pattern = [Array.from({ length }, () => EMPTY)]
    patternCache.set(cacheKey, pattern)
    return pattern
  }

  const results: number[][] = []

  const recurse = (runIndex: number, cursor: number, line: number[]): void => {
    if (runIndex === normalized.length) {
      const nextLine = [...line]
      for (let i = cursor; i < length; i += 1) {
        nextLine[i] = EMPTY
      }
      results.push(nextLine)
      return
    }

    const runLength = normalized[runIndex]
    const remainingRuns = normalized.slice(runIndex + 1)
    const minRemainingLength =
      remainingRuns.reduce((sum, value) => sum + value, 0) + remainingRuns.length
    const maxStart = length - runLength - minRemainingLength

    for (let start = cursor; start <= maxStart; start += 1) {
      const nextLine = [...line]
      for (let i = cursor; i < start; i += 1) {
        nextLine[i] = EMPTY
      }
      for (let i = start; i < start + runLength; i += 1) {
        nextLine[i] = FILLED
      }

      let nextCursor = start + runLength
      if (runIndex < normalized.length - 1) {
        nextLine[nextCursor] = EMPTY
        nextCursor += 1
      }
      recurse(runIndex + 1, nextCursor, nextLine)
    }
  }

  recurse(0, 0, [])
  patternCache.set(cacheKey, results)
  return results
}

function getValidPatterns(line: SolveCell[], clue: number[]): number[][] {
  const basePatterns = generatePatterns(line.length, clue)
  return basePatterns.filter((pattern) =>
    pattern.every((value, index) => line[index] === UNKNOWN || line[index] === value),
  )
}

function runCountingRule(line: SolveCell[], clue: number[]): number[] | null {
  const validPatterns = getValidPatterns(line, clue)
  if (validPatterns.length === 0) {
    return null
  }

  const totalFilled = sumClue(clue)
  const filledCount = line.filter((cell) => cell === FILLED).length
  const emptyCount = line.filter((cell) => cell === EMPTY).length
  const unknownIndexes = line
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell === UNKNOWN)
    .map(({ index }) => index)
  const updates: number[] = Array.from({ length: line.length }, () => UNKNOWN)

  if (unknownIndexes.length === 0) {
    return updates
  }

  if (filledCount === totalFilled) {
    for (const index of unknownIndexes) {
      updates[index] = EMPTY
    }
    return updates
  }
  if (emptyCount === line.length - totalFilled) {
    for (const index of unknownIndexes) {
      updates[index] = FILLED
    }
    return updates
  }
  return updates
}

function runOverlapRule(line: SolveCell[], clue: number[]): number[] | null {
  const validPatterns = getValidPatterns(line, clue)
  if (validPatterns.length === 0) {
    return null
  }

  const updates: number[] = Array.from({ length: line.length }, () => UNKNOWN)
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== UNKNOWN) {
      continue
    }
    const values = new Set(validPatterns.map((pattern) => pattern[index]))
    if (values.size === 1) {
      updates[index] = validPatterns[0][index] as SolveCell
    }
  }

  return updates
}

function applyLineRule(
  board: SolveBoard,
  axis: 'row' | 'col',
  index: number,
  clue: number[],
  rule: 'phase1' | 'phase2',
): { contradiction: boolean; changedCells: number } {
  const line = readLine(board, axis, index)
  const updateValues =
    rule === 'phase1' ? runCountingRule(line, clue) : runOverlapRule(line, clue)

  if (updateValues === null) {
    return { contradiction: true, changedCells: 0 }
  }

  let changedCells = 0
  for (let lineIndex = 0; lineIndex < line.length; lineIndex += 1) {
    const value = updateValues[lineIndex] as SolveCell
    if (value === UNKNOWN) {
      continue
    }
    const row = axis === 'row' ? index : lineIndex
    const col = axis === 'row' ? lineIndex : index
    const applied = applyCell(board, row, col, value)
    if (applied.contradiction) {
      return { contradiction: true, changedCells: 0 }
    }
    if (applied.changed) {
      changedCells += 1
    }
  }

  return { contradiction: false, changedCells }
}

function runDeterministicDeduction(
  board: SolveBoard,
  clues: PuzzleClues,
  trace?: SolverTrace,
): DeductionResult {
  const size = board.length
  let changed = true

  while (changed) {
    changed = false

    for (let row = 0; row < size; row += 1) {
      const result = applyLineRule(board, 'row', row, clues.rows[row], 'phase1')
      if (result.contradiction) {
        return { contradiction: true, board }
      }
      if (result.changedCells > 0) {
        changed = true
        if (trace) {
          trace.phase1CellsSolved += result.changedCells
          trace.usedPhase1 = true
        }
      }
    }

    for (let col = 0; col < size; col += 1) {
      const result = applyLineRule(board, 'col', col, clues.cols[col], 'phase1')
      if (result.contradiction) {
        return { contradiction: true, board }
      }
      if (result.changedCells > 0) {
        changed = true
        if (trace) {
          trace.phase1CellsSolved += result.changedCells
          trace.usedPhase1 = true
        }
      }
    }

    for (let row = 0; row < size; row += 1) {
      const result = applyLineRule(board, 'row', row, clues.rows[row], 'phase2')
      if (result.contradiction) {
        return { contradiction: true, board }
      }
      if (result.changedCells > 0) {
        changed = true
        if (trace) {
          trace.phase2CellsSolved += result.changedCells
          trace.usedPhase2 = true
        }
      }
    }

    for (let col = 0; col < size; col += 1) {
      const result = applyLineRule(board, 'col', col, clues.cols[col], 'phase2')
      if (result.contradiction) {
        return { contradiction: true, board }
      }
      if (result.changedCells > 0) {
        changed = true
        if (trace) {
          trace.phase2CellsSolved += result.changedCells
          trace.usedPhase2 = true
        }
      }
    }
  }

  return { contradiction: false, board }
}

function intersectOptions(left: SolveCell[], right: SolveCell[]): SolveCell[] {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

function findMostConstrainedCell(
  board: SolveBoard,
  clues: PuzzleClues,
): CandidateCell | null {
  const size = board.length
  let candidate: CandidateCell | null = null

  for (let row = 0; row < size; row += 1) {
    const rowPatterns = getValidPatterns(readLine(board, 'row', row), clues.rows[row])
    if (rowPatterns.length === 0) {
      return null
    }

    for (let col = 0; col < size; col += 1) {
      if (board[row][col] !== UNKNOWN) {
        continue
      }

      const colPatterns = getValidPatterns(readLine(board, 'col', col), clues.cols[col])
      if (colPatterns.length === 0) {
        return null
      }

      const rowOptions = Array.from(new Set(rowPatterns.map((pattern) => pattern[col])))
      const colOptions = Array.from(new Set(colPatterns.map((pattern) => pattern[row])))
      const options = intersectOptions(
        rowOptions as SolveCell[],
        colOptions as SolveCell[],
      )

      if (options.length === 0) {
        return null
      }

      if (!candidate || options.length < candidate.options.length) {
        candidate = { row, col, options }
        if (options.length === 1) {
          return candidate
        }
      }
    }
  }

  return candidate
}

function estimateGuaranteedLifeCostFromSearch(
  branchNodes: number,
  maxLives = MAX_GUARANTEED_LIVES,
): number {
  if (branchNodes <= 4) {
    return 1
  }
  if (branchNodes <= 20) {
    return 2
  }
  return maxLives + 1
}

function searchSolutions(
  board: SolveBoard,
  clues: PuzzleClues,
  limit = 2,
): SearchResult {
  let nodes = 0

  const dfs = (inputBoard: SolveBoard): SearchResult => {
    nodes += 1
    const boardCopy = cloneBoard(inputBoard)
    const deduction = runDeterministicDeduction(boardCopy, clues)
    if (deduction.contradiction) {
      return { count: 0, firstSolution: null, nodes }
    }

    if (isSolved(deduction.board)) {
      return {
        count: 1,
        firstSolution: cloneBoard(deduction.board),
        nodes,
      }
    }

    const candidate = findMostConstrainedCell(deduction.board, clues)
    if (!candidate) {
      return { count: 0, firstSolution: null, nodes }
    }

    let total = 0
    let firstSolution: SolveBoard | null = null

    for (const option of candidate.options) {
      const nextBoard = cloneBoard(deduction.board)
      nextBoard[candidate.row][candidate.col] = option
      const subResult = dfs(nextBoard)

      if (!firstSolution && subResult.firstSolution) {
        firstSolution = subResult.firstSolution
      }

      total += subResult.count
      if (total >= limit) {
        break
      }
    }

    return {
      count: Math.min(total, limit),
      firstSolution,
      nodes,
    }
  }

  const result = dfs(board)
  return {
    count: result.count,
    firstSolution: result.firstSolution,
    nodes,
  }
}

export function solvePuzzle(
  clues: PuzzleClues,
  options: SolvePuzzleOptions = {},
): SolverResult {
  const trace: SolverTrace = {
    phase1CellsSolved: 0,
    phase2CellsSolved: 0,
    usedPhase1: false,
    usedPhase2: false,
    usedPhase3: false,
    branchNodes: 0,
    guaranteedLivesToDeterministic: 0,
  }

  const size = clues.rows.length
  const board = createUnknownBoard(size)
  const deduction = runDeterministicDeduction(board, clues, trace)
  if (deduction.contradiction) {
    return {
      solved: false,
      unique: false,
      solution: null,
      trace,
    }
  }

  if (isSolved(deduction.board)) {
    return {
      solved: true,
      unique: true,
      solution: toBooleanBoard(deduction.board),
      trace,
    }
  }

  trace.usedPhase3 = true
  const search = searchSolutions(deduction.board, clues, 2)
  trace.branchNodes = search.nodes
  trace.guaranteedLivesToDeterministic = options.estimateGuaranteedLives
    ? estimateGuaranteedLifeCostFromSearch(search.nodes)
    : MAX_GUARANTEED_LIVES + 1

  if (search.count === 0 || !search.firstSolution) {
    return {
      solved: false,
      unique: false,
      solution: null,
      trace,
    }
  }

  return {
    solved: true,
    unique: search.count === 1,
    solution: toBooleanBoard(search.firstSolution),
    trace,
  }
}
