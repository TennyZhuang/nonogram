import Dexie, { type Table } from 'dexie'

import type {
  Board,
  DifficultyTier,
  GameStatus,
  InputMode,
  PuzzleDefinition,
} from '@/core/types'

export interface ActiveSessionRecord {
  id: 'active'
  puzzle: PuzzleDefinition
  board: Board
  mode: InputMode
  elapsedMs: number
  livesRemaining: number
  maxLives: number
  livesEnabled: boolean
  mistakes: number
  status: GameStatus
  tier: DifficultyTier
  startedAt: number
}

export interface PuzzlePoolRecord {
  id?: number
  tier: DifficultyTier
  puzzle: PuzzleDefinition
}

export interface AchievementRecord {
  id: string
  unlocked: boolean
  unlockedAt: number | null
}

class NonogramDatabase extends Dexie {
  puzzlePool!: Table<PuzzlePoolRecord, number>
  activeSession!: Table<ActiveSessionRecord, string>
  achievements!: Table<AchievementRecord, string>

  constructor() {
    super('nonogram-pwa-db')
    this.version(1).stores({
      puzzlePool: '++id,tier',
      activeSession: 'id',
      achievements: 'id',
    })
  }
}

export const db = new NonogramDatabase()

export async function saveActiveSession(record: ActiveSessionRecord): Promise<void> {
  await db.activeSession.put(record)
}

export async function loadActiveSession(): Promise<ActiveSessionRecord | null> {
  return (await db.activeSession.get('active')) ?? null
}

export async function clearActiveSession(): Promise<void> {
  await db.activeSession.delete('active')
}

export async function savePuzzlePool(
  tier: DifficultyTier,
  puzzles: PuzzleDefinition[],
): Promise<void> {
  await db.transaction('rw', db.puzzlePool, async () => {
    await db.puzzlePool.where('tier').equals(tier).delete()
    if (puzzles.length > 0) {
      await db.puzzlePool.bulkAdd(
        puzzles.map((puzzle) => ({
          tier,
          puzzle,
        })),
      )
    }
  })
}

export async function loadPuzzlePool(tier: DifficultyTier): Promise<PuzzleDefinition[]> {
  const records = await db.puzzlePool.where('tier').equals(tier).toArray()
  return records.map((record) => record.puzzle)
}

export async function saveAchievements(records: AchievementRecord[]): Promise<void> {
  await db.transaction('rw', db.achievements, async () => {
    await db.achievements.clear()
    if (records.length > 0) {
      await db.achievements.bulkPut(records)
    }
  })
}

export async function loadAchievements(): Promise<AchievementRecord[]> {
  return db.achievements.toArray()
}
