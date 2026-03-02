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
import { generatePuzzle } from '@/engine/generator'
import { generatePuzzleInWorker } from '@/engine/worker-client'
import { getFixturePuzzleByTier } from '@/test-fixtures/puzzles'
import { useAchievementStore } from '@/store/achievement-store'
import { useSettingsStore } from '@/store/settings-store'

type PuzzlePool = Record<DifficultyTier, PuzzleDefinition[]>

interface GameStoreState {
  currentPuzzle: PuzzleDefinition | null
  game: GameState | null
  mode: InputMode
  elapsedMs: number
  timerRunning: boolean
  puzzlePool: PuzzlePool
  startGame: (puzzle: PuzzleDefinition) => void
  startGameByTier: (tier: DifficultyTier) => void
  warmupPools: () => void
  setMode: (mode: InputMode) => void
  act: (action: Omit<Action, 'type'> & { type?: InputMode }) => void
  batchAct: (cells: CellCoord[]) => void
  restart: () => void
  switchPuzzle: (puzzle?: PuzzleDefinition) => void
  pauseTimer: () => void
  resumeTimer: () => void
  syncElapsed: () => void
  clearGame: () => void
}

let timer = createTimer()
const inFlightPoolGeneration = new Set<DifficultyTier>()

function createEmptyPool(): PuzzlePool {
  return {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  }
}

const createInitialState = () => ({
  currentPuzzle: null,
  game: null,
  mode: 'fill' as InputMode,
  elapsedMs: 0,
  timerRunning: false,
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
    let nextPuzzle: PuzzleDefinition | null = null
    const currentPool = get().puzzlePool[tier]
    if (currentPool.length > 0) {
      nextPuzzle = currentPool[0]
      set((state) => ({
        puzzlePool: {
          ...state.puzzlePool,
          [tier]: state.puzzlePool[tier].slice(1),
        },
      }))
    }

    if (!nextPuzzle) {
      nextPuzzle = generatePuzzle(tier) ?? getFixturePuzzleByTier(tier)
    }

    get().startGame(nextPuzzle)
    get().warmupPools()
  },

  warmupPools() {
    const targetSize = 2
    const maxSize = 3
    const tiers: DifficultyTier[] = [1, 2, 3, 4, 5]

    for (const tier of tiers) {
      const currentSize = get().puzzlePool[tier].length
      if (currentSize >= targetSize || inFlightPoolGeneration.has(tier)) {
        continue
      }

      inFlightPoolGeneration.add(tier)
      void generatePuzzleInWorker(tier)
        .then((workerPuzzle) => {
          const puzzle = workerPuzzle ?? generatePuzzle(tier) ?? getFixturePuzzleByTier(tier)
          set((state) => ({
            puzzlePool: {
              ...state.puzzlePool,
              [tier]: [...state.puzzlePool[tier], puzzle].slice(-maxSize),
            },
          }))
        })
        .finally(() => {
          inFlightPoolGeneration.delete(tier)
          if (get().puzzlePool[tier].length < targetSize) {
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

  batchAct(cells) {
    const state = get()
    if (!state.game || cells.length === 0) {
      return
    }

    const actions: Action[] = cells.map((cell) => ({
      type: state.mode,
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
    timer.pause()
    set((state) => ({
      ...createInitialState(),
      puzzlePool: state.puzzlePool,
    }))
  },
}))

export function resetGameStoreForTests(): void {
  inFlightPoolGeneration.clear()
  timer = createTimer()
  useGameStore.setState(createInitialState())
}
