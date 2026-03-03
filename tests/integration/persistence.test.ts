import 'fake-indexeddb/auto'

import { db } from '@/persistence/db'
import { hydrateFromStorage, persistNow } from '@/persistence/sync'
import { useAchievementStore } from '@/store/achievement-store'
import { resetGameStoreForTests, useGameStore } from '@/store/game-store'
import { puzzle5x5, puzzle10x10 } from '@/test-fixtures/puzzles'

const baseAchievements = useAchievementStore
  .getState()
  .achievements.map((item) => ({ ...item, unlocked: false }))

describe('persistence integration', () => {
  beforeEach(async () => {
    resetGameStoreForTests()
    useAchievementStore.setState({
      achievements: baseAchievements.map((item) => ({ ...item })),
      lastUnlocked: null,
    })
    await db.delete()
    await db.open()
  })

  afterAll(async () => {
    await db.delete()
  })

  it('saves and restores active session state', async () => {
    const store = useGameStore.getState()
    store.startGame(puzzle5x5)
    store.setMode('mark-empty')
    store.act({ row: 0, col: 2, type: 'mark-empty' })
    store.syncElapsed()

    await persistNow()

    resetGameStoreForTests()
    await hydrateFromStorage()

    const restored = useGameStore.getState()
    expect(restored.currentPuzzle?.id).toBe(puzzle5x5.id)
    expect(restored.mode).toBe('mark-empty')
    expect(restored.game?.board[0][2]).toBe('marked-empty')
    expect(restored.game?.livesRemaining).toBe(3)
  })

  it('handles corrupted session data gracefully', async () => {
    await db.activeSession.put({ id: 'active', bad: 'data' } as never)
    await expect(hydrateFromStorage()).resolves.toBeUndefined()
    expect(useGameStore.getState().game).toBeNull()
  })

  it('persists and restores achievements', async () => {
    useAchievementStore.getState().checkAndUnlock({
      type: 'game-cleared',
      tier: 1,
      mistakes: 0,
      elapsedMs: 1000,
    })

    await persistNow()
    useAchievementStore.setState({
      achievements: baseAchievements.map((item) => ({ ...item, unlocked: false })),
      lastUnlocked: null,
    })

    await hydrateFromStorage()
    const unlocked = useAchievementStore
      .getState()
      .achievements.filter((item) => item.unlocked)
      .map((item) => item.id)

    expect(unlocked).toEqual(expect.arrayContaining(['first-clear', 'no-mistake']))
  })

  it('does not emit toast for achievements that are already unlocked', () => {
    useAchievementStore.getState().checkAndUnlock({
      type: 'game-cleared',
      tier: 1,
      mistakes: 0,
      elapsedMs: 1000,
    })
    expect(useAchievementStore.getState().lastUnlocked?.id).toBe('first-clear')

    useAchievementStore.getState().clearToast()
    expect(useAchievementStore.getState().lastUnlocked).toBeNull()

    useAchievementStore.getState().checkAndUnlock({
      type: 'game-cleared',
      tier: 1,
      mistakes: 1,
      elapsedMs: 1200,
    })
    expect(useAchievementStore.getState().lastUnlocked).toBeNull()
  })

  it('persists and restores puzzle pools', async () => {
    useGameStore.setState((state) => ({
      ...state,
      puzzlePool: {
        ...state.puzzlePool,
        1: [puzzle5x5],
        2: [puzzle10x10, puzzle10x10],
      },
    }))

    await persistNow()
    resetGameStoreForTests()
    await hydrateFromStorage()

    const pool = useGameStore.getState().puzzlePool
    expect(pool[1]).toHaveLength(1)
    expect(pool[2]).toHaveLength(2)
    expect(pool[1][0].id).toBe(puzzle5x5.id)
  })

  it('remains playable even when persistence write fails', async () => {
    const originalPut = db.activeSession.put.bind(db.activeSession)
    db.activeSession.put = vi
      .fn<Parameters<typeof originalPut>, ReturnType<typeof originalPut>>()
      .mockRejectedValue(new DOMException('blocked', 'SecurityError'))

    const store = useGameStore.getState()
    store.startGame(puzzle5x5)
    store.act({ row: 0, col: 0, type: 'fill' })

    await expect(persistNow()).rejects.toThrow()
    expect(useGameStore.getState().game?.status).toBe('playing')

    db.activeSession.put = originalPut
  })
})
