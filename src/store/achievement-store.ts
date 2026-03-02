import { create } from 'zustand'

interface AchievementItem {
  id: string
  name: string
  description: string
  unlocked: boolean
}

type AchievementEvent =
  | { type: 'game-cleared'; tier: number; mistakes: number; elapsedMs: number }
  | { type: 'streak-updated'; streak: number }

interface AchievementStoreState {
  achievements: AchievementItem[]
  lastUnlocked: AchievementItem | null
  checkAndUnlock: (event: AchievementEvent) => void
  clearToast: () => void
}

const defaultAchievements: AchievementItem[] = [
  { id: 'first-clear', name: '初次通关', description: '完成任意一局', unlocked: false },
  { id: 'no-mistake', name: '零失误通关', description: '无失误完成一局', unlocked: false },
  { id: 'first-d5', name: '征服 D5', description: '首次通关 D5', unlocked: false },
  { id: 'streak-3', name: '连胜 3 局', description: '连续通关 3 局', unlocked: false },
]

export const useAchievementStore = create<AchievementStoreState>((set, get) => ({
  achievements: defaultAchievements,
  lastUnlocked: null,

  checkAndUnlock(event) {
    const unlockedIds: string[] = []

    if (event.type === 'game-cleared') {
      unlockedIds.push('first-clear')
      if (event.mistakes === 0) {
        unlockedIds.push('no-mistake')
      }
      if (event.tier === 5) {
        unlockedIds.push('first-d5')
      }
    }

    if (event.type === 'streak-updated' && event.streak >= 3) {
      unlockedIds.push('streak-3')
    }

    if (unlockedIds.length === 0) {
      return
    }

    const achievements = get().achievements.map((item) =>
      unlockedIds.includes(item.id) ? { ...item, unlocked: true } : item,
    )
    const firstNewlyUnlocked = achievements.find(
      (item) => unlockedIds.includes(item.id) && item.unlocked,
    )

    set({
      achievements,
      lastUnlocked: firstNewlyUnlocked ?? null,
    })
  },

  clearToast() {
    set({ lastUnlocked: null })
  },
}))
