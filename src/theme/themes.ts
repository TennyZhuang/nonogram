export type ThemeId = 'ink' | 'jade' | 'sunset' | 'plum'

export interface ThemeUnlockRequirement {
  achievementId: string
  description: string
}

export interface ThemeOption {
  id: ThemeId
  name: string
  description: string
  swatches: [string, string, string]
  unlock?: ThemeUnlockRequirement
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'ink',
    name: '墨韵',
    description: '米白纸面与朱砂点缀，古雅沉稳。',
    swatches: ['#faf7ef', '#7a2d22', '#2b1a0f'],
  },
  {
    id: 'jade',
    name: '竹青',
    description: '清润青绿配色，轻盈耐看。',
    swatches: ['#f2f7f1', '#2f6f4f', '#1a3a2a'],
    unlock: {
      achievementId: 'first-clear',
      description: '通关任意一局后解锁',
    },
  },
  {
    id: 'sunset',
    name: '赤金',
    description: '暖调夕霞与金砂，明快有层次。',
    swatches: ['#fff4ec', '#b6492d', '#5c2f22'],
    unlock: {
      achievementId: 'first-d5',
      description: '首次通关 D5 后解锁',
    },
  },
  {
    id: 'plum',
    name: '夜梅',
    description: '深夜绛紫基底，低饱和高对比。',
    swatches: ['#1f1b2b', '#c188e5', '#f4edf9'],
    unlock: {
      achievementId: 'first-d6',
      description: '首次通关 D6 后解锁',
    },
  },
]

export const DEFAULT_THEME: ThemeId = 'ink'

const VALID_THEME_IDS = new Set<string>(THEME_OPTIONS.map((item) => item.id))

function createUnlockedAchievementIdSet(
  unlockedAchievementIds: Iterable<string>,
): ReadonlySet<string> {
  return unlockedAchievementIds instanceof Set
    ? unlockedAchievementIds
    : new Set(unlockedAchievementIds)
}

export function getThemeOption(themeId: ThemeId): ThemeOption {
  return THEME_OPTIONS.find((option) => option.id === themeId) ?? THEME_OPTIONS[0]
}

export function getThemeUnlockRequirement(
  themeId: ThemeId,
): ThemeUnlockRequirement | null {
  return getThemeOption(themeId).unlock ?? null
}

export function isThemeUnlocked(
  themeId: ThemeId,
  unlockedAchievementIds: Iterable<string>,
): boolean {
  const unlock = getThemeUnlockRequirement(themeId)
  if (!unlock) {
    return true
  }

  const unlockedSet = createUnlockedAchievementIdSet(unlockedAchievementIds)
  return unlockedSet.has(unlock.achievementId)
}

export function normalizeThemeId(value: string | null | undefined): ThemeId {
  if (value && VALID_THEME_IDS.has(value)) {
    return value as ThemeId
  }
  return DEFAULT_THEME
}
