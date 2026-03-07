import {
  EMPTY,
  FILLED,
  UNKNOWN,
  normalizeClue,
  type SolveCell,
} from '@/engine/solve-model'

export interface LineAnalysis {
  satisfiable: boolean
  solutionCount: number
  forced: SolveCell[]
  optionsAt: SolveCell[][]
  freedomCount: number
}

interface AnalyzeLineOptions {
  solutionLimit?: number
}

interface LineState {
  position: number
  clueIndex: number
  progress: number
  gapRequired: boolean
}

interface LineTransition {
  value: SolveCell
  next: LineState
}

const analysisCache = new Map<string, LineAnalysis>()

function buildCacheKey(line: SolveCell[], clue: number[]): string {
  return `${line.join(',')}|${normalizeClue(clue).join(',')}`
}

function stateKey(state: LineState): string {
  return `${state.position}|${state.clueIndex}|${state.progress}|${state.gapRequired ? 1 : 0}`
}

function sortOptions(options: Set<SolveCell>): SolveCell[] {
  const ordered: SolveCell[] = []
  if (options.has(EMPTY)) {
    ordered.push(EMPTY)
  }
  if (options.has(FILLED)) {
    ordered.push(FILLED)
  }
  return ordered
}

function addCapped(left: number, right: number, limit: number): number {
  if (left >= limit || right >= limit) {
    return limit
  }
  const sum = left + right
  return sum >= limit ? limit : sum
}

function isCompatible(line: SolveCell[], position: number, value: SolveCell): boolean {
  const current = line[position]
  return current === UNKNOWN || current === value
}

function isTerminalState(state: LineState, runCount: number): boolean {
  return state.progress === 0 && !state.gapRequired && state.clueIndex === runCount
}

function getTransitions(
  line: SolveCell[],
  clue: number[],
  state: LineState,
): LineTransition[] {
  if (state.position >= line.length) {
    return []
  }

  const transitions: LineTransition[] = []

  if (state.progress > 0) {
    if (!isCompatible(line, state.position, FILLED)) {
      return transitions
    }

    const runLength = clue[state.clueIndex]
    const nextProgress = state.progress + 1
    if (nextProgress === runLength) {
      const nextClueIndex = state.clueIndex + 1
      transitions.push({
        value: FILLED,
        next: {
          position: state.position + 1,
          clueIndex: nextClueIndex,
          progress: 0,
          gapRequired: nextClueIndex < clue.length,
        },
      })
      return transitions
    }

    transitions.push({
      value: FILLED,
      next: {
        position: state.position + 1,
        clueIndex: state.clueIndex,
        progress: nextProgress,
        gapRequired: false,
      },
    })
    return transitions
  }

  if (state.gapRequired) {
    if (isCompatible(line, state.position, EMPTY)) {
      transitions.push({
        value: EMPTY,
        next: {
          position: state.position + 1,
          clueIndex: state.clueIndex,
          progress: 0,
          gapRequired: false,
        },
      })
    }
    return transitions
  }

  if (isCompatible(line, state.position, EMPTY)) {
    transitions.push({
      value: EMPTY,
      next: {
        position: state.position + 1,
        clueIndex: state.clueIndex,
        progress: 0,
        gapRequired: false,
      },
    })
  }

  if (state.clueIndex >= clue.length || !isCompatible(line, state.position, FILLED)) {
    return transitions
  }

  const runLength = clue[state.clueIndex]
  if (runLength === 1) {
    const nextClueIndex = state.clueIndex + 1
    transitions.push({
      value: FILLED,
      next: {
        position: state.position + 1,
        clueIndex: nextClueIndex,
        progress: 0,
        gapRequired: nextClueIndex < clue.length,
      },
    })
    return transitions
  }

  transitions.push({
    value: FILLED,
    next: {
      position: state.position + 1,
      clueIndex: state.clueIndex,
      progress: 1,
      gapRequired: false,
    },
  })

  return transitions
}

export function analyzeLine(
  line: SolveCell[],
  clue: number[],
  options: AnalyzeLineOptions = {},
): LineAnalysis {
  const limit = options.solutionLimit ?? Number.MAX_SAFE_INTEGER
  const normalizedClue = normalizeClue(clue)
  const cacheKey = limit === Number.MAX_SAFE_INTEGER
    ? buildCacheKey(line, normalizedClue)
    : null

  if (cacheKey) {
    const cached = analysisCache.get(cacheKey)
    if (cached) {
      return cached
    }
  }

  const initialState: LineState = {
    position: 0,
    clueIndex: 0,
    progress: 0,
    gapRequired: false,
  }

  const countCache = new Map<string, number>()

  const countSolutions = (state: LineState): number => {
    const key = stateKey(state)
    const cached = countCache.get(key)
    if (cached !== undefined) {
      return cached
    }

    if (state.position === line.length) {
      const total = isTerminalState(state, normalizedClue.length) ? 1 : 0
      countCache.set(key, total)
      return total
    }

    let total = 0
    for (const transition of getTransitions(line, normalizedClue, state)) {
      total = addCapped(total, countSolutions(transition.next), limit)
      if (total >= limit) {
        break
      }
    }

    countCache.set(key, total)
    return total
  }

  const solutionCount = countSolutions(initialState)
  if (solutionCount === 0) {
    const impossible: LineAnalysis = {
      satisfiable: false,
      solutionCount: 0,
      forced: Array.from({ length: line.length }, () => UNKNOWN),
      optionsAt: Array.from({ length: line.length }, () => [] as SolveCell[]),
      freedomCount: 0,
    }
    if (cacheKey) {
      analysisCache.set(cacheKey, impossible)
    }
    return impossible
  }

  const optionsByIndex = Array.from({ length: line.length }, () => new Set<SolveCell>())
  const visitedReachable = new Set<string>()

  const visitReachableStates = (state: LineState): void => {
    const key = stateKey(state)
    if (visitedReachable.has(key) || countSolutions(state) === 0) {
      return
    }
    visitedReachable.add(key)

    if (state.position === line.length) {
      return
    }

    for (const transition of getTransitions(line, normalizedClue, state)) {
      if (countSolutions(transition.next) === 0) {
        continue
      }
      optionsByIndex[state.position].add(transition.value)
      visitReachableStates(transition.next)
    }
  }

  visitReachableStates(initialState)

  const optionsAt = optionsByIndex.map((optionsSet) => sortOptions(optionsSet))
  const forced = optionsAt.map((cellOptions) =>
    cellOptions.length === 1 ? cellOptions[0] : UNKNOWN,
  )
  const freedomCount = optionsAt.filter((cellOptions) => cellOptions.length > 1).length

  const analysis: LineAnalysis = {
    satisfiable: true,
    solutionCount,
    forced,
    optionsAt,
    freedomCount,
  }

  if (cacheKey) {
    analysisCache.set(cacheKey, analysis)
  }

  return analysis
}
