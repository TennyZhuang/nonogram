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

export type HumanRuleId =
  | 'line-completion'
  | 'overlap-consensus'
  | 'single-cell-probe'
  | 'guess'
  | 'backtrack'

export interface HumanCellUpdate {
  row: number
  col: number
  value: 'filled' | 'empty'
}

export interface HumanSolveStep {
  ruleId: HumanRuleId
  depth: number
  axis?: 'row' | 'col'
  index?: number
  changes: HumanCellUpdate[]
  guessedCell?: HumanCellUpdate
  rejectedCell?: HumanCellUpdate
  contradiction?: boolean
  note?: string
  unknownsBefore: number
  unknownsAfter: number
}

export interface HumanSolverSummary {
  strongestRule: HumanRuleId | null
  totalSteps: number
  totalInferences: number
  totalProbes: number
  totalGuesses: number
  totalBacktracks: number
  deterministicSolved: boolean
  stalled: boolean
}

export interface HumanSolverTrace {
  steps: HumanSolveStep[]
  summary: HumanSolverSummary
}

export interface HumanSolverResult {
  solved: boolean
  solution: boolean[][] | null
  board: SolveBoard
  trace: HumanSolverTrace
}

export interface SolvePuzzleHumanOptions {
  allowGuessing?: boolean
  enableProbing?: boolean
  maxGuessDepth?: number
}

interface DeterministicPassResult {
  contradiction: boolean
}

interface SearchOutcome {
  status: 'solved' | 'contradiction' | 'stuck'
  board: SolveBoard
  steps: HumanSolveStep[]
}

interface FrontierCell {
  row: number
  col: number
  options: SolveCell[]
  ambiguity: number
}

const DEFAULT_MAX_GUESS_DEPTH = 64
const RULE_STRENGTH: Record<HumanRuleId, number> = {
  'line-completion': 1,
  'overlap-consensus': 2,
  'single-cell-probe': 3,
  guess: 4,
  backtrack: 4,
}

function toHumanValue(value: SolveCell): 'filled' | 'empty' {
  return value === FILLED ? 'filled' : 'empty'
}

function countUnknownCells(board: SolveBoard): number {
  let total = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === UNKNOWN) {
        total += 1
      }
    }
  }
  return total
}

function createCellUpdate(
  row: number,
  col: number,
  value: SolveCell,
): HumanCellUpdate {
  return {
    row,
    col,
    value: toHumanValue(value),
  }
}

function runCountingRule(line: SolveCell[], clue: number[]): SolveCell[] | null {
  const analysis = analyzeLine(line, clue)
  if (!analysis.satisfiable) {
    return null
  }

  const totalFilled = sumClue(clue)
  const filledCount = line.filter((cell) => cell === FILLED).length
  const emptyCount = line.filter((cell) => cell === EMPTY).length
  const updates: SolveCell[] = Array.from({ length: line.length }, () => UNKNOWN)

  if (filledCount === totalFilled) {
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === UNKNOWN) {
        updates[index] = EMPTY
      }
    }
    return updates
  }

  if (emptyCount === line.length - totalFilled) {
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === UNKNOWN) {
        updates[index] = FILLED
      }
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
    if (line[index] === UNKNOWN && analysis.forced[index] !== UNKNOWN) {
      updates[index] = analysis.forced[index]
    }
  }
  return updates
}

function applyLineUpdates(
  board: SolveBoard,
  axis: 'row' | 'col',
  index: number,
  updates: SolveCell[],
): { contradiction: boolean; changes: HumanCellUpdate[] } {
  const changes: HumanCellUpdate[] = []

  for (let lineIndex = 0; lineIndex < updates.length; lineIndex += 1) {
    const value = updates[lineIndex]
    if (value === UNKNOWN) {
      continue
    }
    const row = axis === 'row' ? index : lineIndex
    const col = axis === 'row' ? lineIndex : index
    const applied = applyCell(board, row, col, value)
    if (applied.contradiction) {
      return { contradiction: true, changes: [] }
    }
    if (applied.changed) {
      changes.push(createCellUpdate(row, col, value))
    }
  }

  return { contradiction: false, changes }
}

function intersectOptions(left: SolveCell[], right: SolveCell[]): SolveCell[] {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

function collectFrontierCells(
  board: SolveBoard,
  clues: PuzzleClues,
): FrontierCell[] | null {
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

  const cells: FrontierCell[] = []
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

      cells.push({
        row,
        col,
        options,
        ambiguity: rowAnalyses[row].freedomCount + colAnalyses[col].freedomCount,
      })
    }
  }

  cells.sort((left, right) =>
    left.options.length - right.options.length ||
    left.ambiguity - right.ambiguity ||
    left.row - right.row ||
    left.col - right.col,
  )

  return cells
}

function simulateDeterministicAssumption(
  board: SolveBoard,
  clues: PuzzleClues,
  row: number,
  col: number,
  value: SolveCell,
): boolean {
  const probeBoard = cloneBoard(board)
  const applied = applyCell(probeBoard, row, col, value)
  if (applied.contradiction) {
    return true
  }

  const result = runDeterministicHumanPasses(
    probeBoard,
    clues,
    [],
    0,
    false,
  )
  return result.contradiction
}

function applySingleCellProbe(
  board: SolveBoard,
  clues: PuzzleClues,
  steps: HumanSolveStep[],
  depth: number,
): { contradiction: boolean; changed: boolean } {
  const frontier = collectFrontierCells(board, clues)
  if (!frontier) {
    return { contradiction: true, changed: false }
  }

  const candidates = frontier.slice(0, 8)
  for (const candidate of candidates) {
    if (candidate.options.length < 2) {
      continue
    }

    const [firstOption, secondOption] = candidate.options
    const firstContradiction = simulateDeterministicAssumption(
      board,
      clues,
      candidate.row,
      candidate.col,
      firstOption,
    )
    const secondContradiction = simulateDeterministicAssumption(
      board,
      clues,
      candidate.row,
      candidate.col,
      secondOption,
    )

    if (firstContradiction && secondContradiction) {
      return { contradiction: true, changed: false }
    }
    if (firstContradiction === secondContradiction) {
      continue
    }

    const inferredValue = firstContradiction ? secondOption : firstOption
    const rejectedValue = firstContradiction ? firstOption : secondOption
    const unknownsBefore = countUnknownCells(board)
    const applied = applyCell(board, candidate.row, candidate.col, inferredValue)
    if (applied.contradiction) {
      return { contradiction: true, changed: false }
    }

    steps.push({
      ruleId: 'single-cell-probe',
      depth,
      changes: [createCellUpdate(candidate.row, candidate.col, inferredValue)],
      rejectedCell: createCellUpdate(candidate.row, candidate.col, rejectedValue),
      guessedCell: createCellUpdate(candidate.row, candidate.col, inferredValue),
      contradiction: true,
      note: 'opposite assumption leads to contradiction',
      unknownsBefore,
      unknownsAfter: countUnknownCells(board),
    })

    return { contradiction: false, changed: true }
  }

  return { contradiction: false, changed: false }
}

function runDeterministicHumanPasses(
  board: SolveBoard,
  clues: PuzzleClues,
  steps: HumanSolveStep[],
  depth: number,
  enableProbing: boolean,
): DeterministicPassResult {
  const size = board.length
  let changed = true

  while (changed) {
    changed = false

    for (const rule of ['line-completion', 'overlap-consensus'] as const) {
      for (const axis of ['row', 'col'] as const) {
        for (let index = 0; index < size; index += 1) {
          const line = readLine(board, axis, index)
          const updates =
            rule === 'line-completion'
              ? runCountingRule(line, axis === 'row' ? clues.rows[index] : clues.cols[index])
              : runOverlapRule(line, axis === 'row' ? clues.rows[index] : clues.cols[index])

          if (updates === null) {
            return { contradiction: true }
          }

          const unknownsBefore = countUnknownCells(board)
          const applied = applyLineUpdates(board, axis, index, updates)
          if (applied.contradiction) {
            return { contradiction: true }
          }
          if (applied.changes.length === 0) {
            continue
          }

          steps.push({
            ruleId: rule,
            depth,
            axis,
            index,
            changes: applied.changes,
            unknownsBefore,
            unknownsAfter: countUnknownCells(board),
          })
          changed = true
        }
      }
    }

    if (!changed && enableProbing) {
      const probe = applySingleCellProbe(board, clues, steps, depth)
      if (probe.contradiction) {
        return { contradiction: true }
      }
      changed = probe.changed
    }
  }

  return { contradiction: false }
}

function solveHumanRecursive(
  board: SolveBoard,
  clues: PuzzleClues,
  options: Required<SolvePuzzleHumanOptions>,
  depth: number,
): SearchOutcome {
  const steps: HumanSolveStep[] = []
  const deterministic = runDeterministicHumanPasses(
    board,
    clues,
    steps,
    depth,
    options.enableProbing,
  )
  if (deterministic.contradiction) {
    return { status: 'contradiction', board, steps }
  }

  if (isSolved(board)) {
    return { status: 'solved', board, steps }
  }

  if (!options.allowGuessing || depth >= options.maxGuessDepth) {
    return { status: 'stuck', board, steps }
  }

  const frontier = collectFrontierCells(board, clues)
  if (!frontier || frontier.length === 0) {
    return { status: 'contradiction', board, steps }
  }

  let sawStuckBranch = false
  const candidate = frontier[0]
  for (const option of candidate.options) {
    const nextBoard = cloneBoard(board)
    const unknownsBefore = countUnknownCells(nextBoard)
    const applied = applyCell(nextBoard, candidate.row, candidate.col, option)
    if (applied.contradiction) {
      continue
    }

    const guessStep: HumanSolveStep = {
      ruleId: 'guess',
      depth,
      changes: [createCellUpdate(candidate.row, candidate.col, option)],
      guessedCell: createCellUpdate(candidate.row, candidate.col, option),
      note: 'tentative assumption',
      unknownsBefore,
      unknownsAfter: countUnknownCells(nextBoard),
    }

    const branch = solveHumanRecursive(nextBoard, clues, options, depth + 1)
    steps.push(guessStep, ...branch.steps)

    if (branch.status === 'solved') {
      return { status: 'solved', board: branch.board, steps }
    }

    if (branch.status === 'stuck') {
      sawStuckBranch = true
    }

    steps.push({
      ruleId: 'backtrack',
      depth,
      changes: [],
      guessedCell: createCellUpdate(candidate.row, candidate.col, option),
      contradiction: branch.status === 'contradiction',
      note:
        branch.status === 'contradiction'
          ? 'assumption contradicted, backtrack'
          : 'assumption stalled, try another branch',
      unknownsBefore: countUnknownCells(board),
      unknownsAfter: countUnknownCells(board),
    })
  }

  return {
    status: sawStuckBranch ? 'stuck' : 'contradiction',
    board,
    steps,
  }
}

function summarizeTrace(steps: HumanSolveStep[], solved: boolean): HumanSolverSummary {
  let strongestRule: HumanRuleId | null = null
  let strongestStrength = 0
  let totalInferences = 0
  let totalProbes = 0
  let totalGuesses = 0
  let totalBacktracks = 0

  for (const step of steps) {
    totalInferences += step.changes.length

    if (step.ruleId === 'single-cell-probe') {
      totalProbes += 1
    }
    if (step.ruleId === 'guess') {
      totalGuesses += 1
    }
    if (step.ruleId === 'backtrack') {
      totalBacktracks += 1
    }

    const strength = RULE_STRENGTH[step.ruleId]
    if (strength > strongestStrength) {
      strongestStrength = strength
      strongestRule = step.ruleId === 'backtrack' ? 'guess' : step.ruleId
    }
  }

  return {
    strongestRule,
    totalSteps: steps.length,
    totalInferences,
    totalProbes,
    totalGuesses,
    totalBacktracks,
    deterministicSolved: solved && totalGuesses === 0,
    stalled: !solved,
  }
}

export function solvePuzzleHuman(
  clues: PuzzleClues,
  options: SolvePuzzleHumanOptions = {},
): HumanSolverResult {
  const resolvedOptions: Required<SolvePuzzleHumanOptions> = {
    allowGuessing: options.allowGuessing ?? true,
    enableProbing: options.enableProbing ?? true,
    maxGuessDepth: options.maxGuessDepth ?? DEFAULT_MAX_GUESS_DEPTH,
  }

  const board = createUnknownBoard(clues.rows.length)
  const outcome = solveHumanRecursive(board, clues, resolvedOptions, 0)
  const solved = outcome.status === 'solved'

  return {
    solved,
    solution: solved ? toBooleanBoard(outcome.board) : null,
    board: outcome.board,
    trace: {
      steps: outcome.steps,
      summary: summarizeTrace(outcome.steps, solved),
    },
  }
}
