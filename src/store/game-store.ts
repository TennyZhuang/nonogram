import { create } from 'zustand'

import {
  applyAction,
  applyBatchAction,
  createGameState,
} from '@/core/game-engine'
import { createTimer } from '@/core/timer'
import type {
  Action,
  DifficultyTier,
  GameState,
  InputMode,
  PuzzleDefinition,
} from '@/core/types'
import type { CellCoord } from '@/canvas/hit-map'
import { getBuiltinFallbackPuzzleByTier } from '@/engine/builtin-puzzles'
import { generatePuzzleInWorker } from '@/engine/worker-client'
import { useAchievementStore } from '@/store/achievement-store'
import { useSettingsStore } from '@/store/settings-store'

type PuzzlePool = Record<DifficultyTier, PuzzleDefinition[]>

interface GameStoreState {
  currentPuzzle: PuzzleDefinition | null
  game: GameState | null
  mode: InputMode
  elapsedMs: number
  timerRunning: boolean
  isGeneratingPuzzle: boolean
  generatingTier: DifficultyTier | null
  puzzlePool: PuzzlePool
  startGame: (puzzle: PuzzleDefinition) => void
  startGameByTier: (tier: DifficultyTier) => void
  warmupPools: () => void
  setMode: (mode: InputMode) => void
  act: (action: Omit<Action, 'type'> & { type?: InputMode }) => void
  batchAct: (cells: CellCoord[], mode?: InputMode) => void
  restart: () => void
  switchPuzzle: (puzzle?: PuzzleDefinition) => void
  pauseTimer: () => void
  resumeTimer: () => void
  syncElapsed: () => void
  clearGame: () => void
}

let timer = createTimer()
const inFlightPoolGeneration = new Set<DifficultyTier>()
let foregroundGenerationRequest = 0
const FOREGROUND_GENERATION_TIMEOUT_MS = 1500
const POOL_TARGET_SIZE = 2
const POOL_MAX_SIZE = 3
const ALL_TIERS: DifficultyTier[] = [1, 2, 3, 4, 5, 6]

function createEmptyPool(): PuzzlePool {
  return {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  }
}

function isSamePuzzle(left: PuzzleDefinition, right: PuzzleDefinition): boolean {
  return left.id === right.id && left.seed === right.seed
}

function appendPuzzleToPool(
  pool: PuzzleDefinition[],
  puzzle: PuzzleDefinition,
  maxSize: number,
): PuzzleDefinition[] {
  const deduped = pool.filter((item) => !isSamePuzzle(item, puzzle))
  return [...deduped, puzzle].slice(-maxSize)
}

const createInitialState = () => ({
  currentPuzzle: null,
  game: null,
  mode: 'fill' as InputMode,
  elapsedMs: 0,
  timerRunning: false,
  isGeneratingPuzzle: false,
  generatingTier: null,
  puzzlePool: createEmptyPool(),
})

function updateAchievements(state: GameState, elapsedMs: number) {
  if (state.status === 'cleared') {
    useAchievementStore.getState().checkAndUnlock({
      type: 'game-cleared',
      tier: state.puzzle.tier,
      mistakes: state.mistakes,
      elapsedMs,
    })
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...createInitialState(),

  startGameByTier(tier) {
    const currentPool = get().puzzlePool[tier]
    if (currentPool.length > 0) {
      foregroundGenerationRequest += 1
      const nextPuzzle = currentPool[0]
      set((state) => ({
        isGeneratingPuzzle: false,
        generatingTier: null,
        puzzlePool: {
          ...state.puzzlePool,
          [tier]: state.puzzlePool[tier].slice(1),
        },
      }))
      get().startGame(nextPuzzle)
      get().warmupPools()
      return
    }

    const requestId = foregroundGenerationRequest + 1
    foregroundGenerationRequest = requestId
    timer.pause()
    set({
      currentPuzzle: null,
      game: null,
      elapsedMs: 0,
      timerRunning: false,
      isGeneratingPuzzle: true,
      generatingTier: tier,
    })

    let settled = false
    const timeoutId = setTimeout(() => {
      if (requestId !== foregroundGenerationRequest || settled) {
        return
      }
      settled = true
      get().startGame(getBuiltinFallbackPuzzleByTier(tier))
      get().warmupPools()
    }, FOREGROUND_GENERATION_TIMEOUT_MS)

    void generatePuzzleInWorker(tier)
      .then((workerPuzzle) => {
        if (requestId !== foregroundGenerationRequest) {
          return
        }
        if (settled) {
          if (workerPuzzle) {
            set((state) => ({
              puzzlePool: {
                ...state.puzzlePool,
                [tier]: appendPuzzleToPool(state.puzzlePool[tier], workerPuzzle, POOL_MAX_SIZE),
              },
            }))
          }
          return
        }

        settled = true
        const nextPuzzle = workerPuzzle ?? getBuiltinFallbackPuzzleByTier(tier)
        get().startGame(nextPuzzle)
        get().warmupPools()
      })
      .catch(() => {
        if (requestId !== foregroundGenerationRequest || settled) {
          return
        }
        settled = true
        get().startGame(getBuiltinFallbackPuzzleByTier(tier))
        get().warmupPools()
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (requestId !== foregroundGenerationRequest || settled) {
          return
        }
        set({
          isGeneratingPuzzle: false,
          generatingTier: null,
        })
      })
  },

  warmupPools() {
    for (const tier of ALL_TIERS) {
      const currentSize = get().puzzlePool[tier].length
      if (currentSize >= POOL_TARGET_SIZE || inFlightPoolGeneration.has(tier)) {
        continue
      }

      inFlightPoolGeneration.add(tier)
      void generatePuzzleInWorker(tier)
        .then((workerPuzzle) => {
          const puzzle = workerPuzzle ?? getBuiltinFallbackPuzzleByTier(tier)
          set((state) => ({
            puzzlePool: {
              ...state.puzzlePool,
              [tier]: appendPuzzleToPool(state.puzzlePool[tier], puzzle, POOL_MAX_SIZE),
            },
          }))
        })
        .finally(() => {
          inFlightPoolGeneration.delete(tier)
          if (get().puzzlePool[tier].length < POOL_TARGET_SIZE) {
            get().warmupPools()
          }
        })
    }
  },

  startGame(puzzle) {
    const livesEnabled = useSettingsStore.getState().livesEnabled
    const game = createGameState(puzzle, { livesEnabled })
    timer = createTimer()
    timer.start()

    set({
      currentPuzzle: puzzle,
      game,
      mode: 'fill',
      elapsedMs: 0,
      timerRunning: true,
      isGeneratingPuzzle: false,
      generatingTier: null,
    })
  },

  setMode(mode) {
    set({ mode })
  },

  act(action) {
    const state = get()
    if (!state.game) {
      return
    }

    const nextAction: Action = {
      type: action.type ?? state.mode,
      row: action.row,
      col: action.col,
    }
    const result = applyAction(state.game, nextAction)
    const elapsedMs = timer.getElapsed()

    if (result.state.status !== 'playing' && state.timerRunning) {
      timer.pause()
    }

    updateAchievements(result.state, elapsedMs)
    set({
      game: result.state,
      elapsedMs,
      timerRunning: result.state.status === 'playing',
    })
  },

  batchAct(cells, mode) {
    const state = get()
    if (!state.game || cells.length === 0) {
      return
    }

    const actionMode = mode ?? state.mode
    const actions: Action[] = cells.map((cell) => ({
      type: actionMode,
      row: cell.row,
      col: cell.col,
    }))
    const result = applyBatchAction(state.game, actions)
    const elapsedMs = timer.getElapsed()

    if (result.state.status !== 'playing' && state.timerRunning) {
      timer.pause()
    }

    updateAchievements(result.state, elapsedMs)
    set({
      game: result.state,
      elapsedMs,
      timerRunning: result.state.status === 'playing',
    })
  },

  restart() {
    const state = get()
    if (!state.currentPuzzle) {
      return
    }
    get().startGame(state.currentPuzzle)
  },

  switchPuzzle(puzzle) {
    if (puzzle) {
      get().startGame(puzzle)
      return
    }

    const tier = get().currentPuzzle?.tier ?? 1
    get().startGameByTier(tier)
  },

  pauseTimer() {
    const state = get()
    if (!state.timerRunning) {
      return
    }
    timer.pause()
    set({
      timerRunning: false,
      elapsedMs: timer.getElapsed(),
    })
  },

  resumeTimer() {
    const state = get()
    if (!state.game || state.game.status !== 'playing' || state.timerRunning) {
      return
    }
    timer.resume()
    set({ timerRunning: true })
  },

  syncElapsed() {
    const state = get()
    if (!state.timerRunning) {
      return
    }
    set({ elapsedMs: timer.getElapsed() })
  },

  clearGame() {
    foregroundGenerationRequest += 1
    timer.pause()
    set((state) => ({
      ...createInitialState(),
      puzzlePool: state.puzzlePool,
    }))
  },
}))

export function resetGameStoreForTests(): void {
  inFlightPoolGeneration.clear()
  foregroundGenerationRequest = 0
  timer = createTimer()
  useGameStore.setState(createInitialState())
}

// Expose for E2E testing
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__gameStore = useGameStore
}
