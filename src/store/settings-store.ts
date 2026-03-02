import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_THEME, normalizeThemeId, type ThemeId } from '@/theme/themes'

interface SettingsStoreState {
  livesEnabled: boolean
  theme: ThemeId
  tutorialCompleted: boolean
  hasHydrated: boolean
  setLivesEnabled: (enabled: boolean) => void
  toggleLivesEnabled: () => void
  setTheme: (theme: ThemeId) => void
  completeTutorial: () => void
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      livesEnabled: true,
      theme: DEFAULT_THEME,
      tutorialCompleted: false,
      hasHydrated: false,
      setLivesEnabled: (enabled) => set({ livesEnabled: enabled }),
      toggleLivesEnabled: () =>
        set((state) => ({
          livesEnabled: !state.livesEnabled,
        })),
      setTheme: (theme) => set({ theme: normalizeThemeId(theme) }),
      completeTutorial: () => set({ tutorialCompleted: true }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'nonogram-settings',
      version: 3,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as {
          livesEnabled?: boolean
          theme?: string
          tutorialCompleted?: boolean
        }
        return {
          livesEnabled: state.livesEnabled ?? true,
          theme: normalizeThemeId(state.theme),
          tutorialCompleted: state.tutorialCompleted ?? false,
          hasHydrated: false,
        }
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        livesEnabled: state.livesEnabled,
        theme: state.theme,
        tutorialCompleted: state.tutorialCompleted,
      }),
    },
  ),
)
