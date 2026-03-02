import { createGameState } from '@/core/game-engine'
import type { DifficultyTier } from '@/core/types'
import { useAchievementStore } from '@/store/achievement-store'
import { useGameStore } from '@/store/game-store'
import {
  clearActiveSession,
  loadAchievements,
  loadActiveSession,
  loadPuzzlePool,
  saveAchievements,
  saveActiveSession,
  savePuzzlePool,
  type ActiveSessionRecord,
  type AchievementRecord,
} from '@/persistence/db'

type StopHandle = () => void

const TIERS: DifficultyTier[] = [1, 2, 3, 4, 5, 6]

function buildSessionRecord(): ActiveSessionRecord | null {
  const state = useGameStore.getState()
  if (!state.currentPuzzle || !state.game) {
    return null
  }

  return {
    id: 'active',
    puzzle: state.currentPuzzle,
    board: state.game.board,
    mode: state.mode,
    elapsedMs: state.elapsedMs,
    livesRemaining: state.game.livesRemaining,
    maxLives: state.game.maxLives,
    livesEnabled: state.game.livesEnabled,
    mistakes: state.game.mistakes,
    status: state.game.status,
    tier: state.currentPuzzle.tier,
    startedAt: Date.now() - state.elapsedMs,
  }
}

async function persistPools(): Promise<void> {
  const pool = useGameStore.getState().puzzlePool
  await Promise.all(TIERS.map((tier) => savePuzzlePool(tier, pool[tier])))
}

async function persistAchievements(): Promise<void> {
  const achievements = useAchievementStore.getState().achievements
  const records: AchievementRecord[] = achievements.map((item) => ({
    id: item.id,
    unlocked: item.unlocked,
    unlockedAt: item.unlocked ? Date.now() : null,
  }))
  await saveAchievements(records)
}

export async function persistNow(): Promise<void> {
  const session = buildSessionRecord()
  if (session) {
    await saveActiveSession(session)
  } else {
    await clearActiveSession()
  }
  await Promise.all([persistPools(), persistAchievements()])
}

export function startAutoSave(delayMs = 1_000): StopHandle {
  let timeout: ReturnType<typeof setTimeout> | null = null

  const schedule = () => {
    if (timeout) {
      window.clearTimeout(timeout)
    }
    timeout = window.setTimeout(() => {
      void persistNow().catch(() => {
        // TODO(v0.2): Add user-facing error hints for storage failures.
      })
    }, delayMs)
  }

  const unsubscribe = useGameStore.subscribe(() => schedule())
  return () => {
    unsubscribe()
    if (timeout) {
      window.clearTimeout(timeout)
      timeout = null
    }
  }
}

export function saveOnLifecycle(): StopHandle {
  const flush = () => {
    void persistNow().catch(() => {
      // TODO(v0.2): Add retry strategy for lifecycle-triggered save failures.
    })
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      flush()
    }
  }

  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    window.removeEventListener('pagehide', flush)
    window.removeEventListener('beforeunload', flush)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

function restoreSession(record: ActiveSessionRecord): void {
  const game = createGameState(record.puzzle, {
    lives: record.maxLives,
    livesEnabled: record.livesEnabled,
    mode: record.mode,
  })

  game.board = record.board
  game.status = record.status
  game.livesRemaining = record.livesRemaining
  game.mistakes = record.mistakes
  game.mode = record.mode

  useGameStore.setState({
    currentPuzzle: record.puzzle,
    game,
    mode: record.mode,
    elapsedMs: record.elapsedMs,
    timerRunning: false,
  })
}

export async function hydrateFromStorage(): Promise<void> {
  try {
    const [session, storedAchievements, tierPools] = await Promise.all([
      loadActiveSession(),
      loadAchievements(),
      Promise.all(TIERS.map((tier) => loadPuzzlePool(tier))),
    ])

    useGameStore.setState((state) => ({
      ...state,
      puzzlePool: {
        1: tierPools[0],
        2: tierPools[1],
        3: tierPools[2],
        4: tierPools[3],
        5: tierPools[4],
        6: tierPools[5],
      },
    }))

    if (session) {
      restoreSession(session)
    }

    const byId = new Map(storedAchievements.map((item) => [item.id, item]))
    useAchievementStore.setState((state) => ({
      ...state,
      achievements: state.achievements.map((item) => ({
        ...item,
        unlocked: byId.get(item.id)?.unlocked ?? item.unlocked,
      })),
      lastUnlocked: null,
    }))
  } catch {
    // TODO(v0.2): Emit diagnostics hook for persistence hydration failures.
  }
}
