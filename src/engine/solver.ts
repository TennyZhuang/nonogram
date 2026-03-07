import type { PuzzleClues } from '@/core/types'
import { analyzeLine } from '@/engine/line-analysis'
import {
  EMPTY,
  FILLED,
  UNKNOWN,
  applyCell,
  cloneBoard,
  createUnknownBoard,
  isSolved,
  readLine,
  sumClue,
  toBooleanBoard,
  type SolveBoard,
  type SolveCell,
} from '@/engine/solve-model'

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
  ambiguity: number
}

const MAX_GUARANTEED_LIVES = 3

function runCountingRule(line: SolveCell[], clue: number[]): SolveCell[] | null {
  const analysis = analyzeLine(line, clue)
  if (!analysis.satisfiable) {
    return null
  }

  const totalFilled = sumClue(clue)
  const filledCount = line.filter((cell) => cell === FILLED).length
  const emptyCount = line.filter((cell) => cell === EMPTY).length
  const unknownIndexes = line
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell === UNKNOWN)
    .map(({ index }) => index)
  const updates: SolveCell[] = Array.from({ length: line.length }, () => UNKNOWN)

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
  }

  return updates
}

function runOverlapRule(line: SolveCell[], clue: number[]): SolveCell[] | null {
  const analysis = analyzeLine(line, clue)
  if (!analysis.satisfiable) {
    return null
  }

  const updates: SolveCell[] = Array.from({ length: line.length }, () => UNKNOWN)
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== UNKNOWN) {
      continue
    }
    if (analysis.forced[index] !== UNKNOWN) {
      updates[index] = analysis.forced[index]
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
    const value = updateValues[lineIndex]
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
  const rowAnalyses = clues.rows.map((clue, row) =>
    analyzeLine(readLine(board, 'row', row), clue),
  )
  const colAnalyses = clues.cols.map((clue, col) =>
    analyzeLine(readLine(board, 'col', col), clue),
  )

  if (rowAnalyses.some((analysis) => !analysis.satisfiable)) {
    return null
  }
  if (colAnalyses.some((analysis) => !analysis.satisfiable)) {
    return null
  }

  let candidate: CandidateCell | null = null

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (board[row][col] !== UNKNOWN) {
        continue
      }

      const options = intersectOptions(
        rowAnalyses[row].optionsAt[col],
        colAnalyses[col].optionsAt[row],
      )

      if (options.length === 0) {
        return null
      }

      const ambiguity = rowAnalyses[row].freedomCount + colAnalyses[col].freedomCount
      if (
        !candidate ||
        options.length < candidate.options.length ||
        (options.length === candidate.options.length && ambiguity < candidate.ambiguity)
      ) {
        candidate = { row, col, options, ambiguity }
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
