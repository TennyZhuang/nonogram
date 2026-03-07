import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_THEME, normalizeThemeId, type ThemeId } from '@/theme/themes'

interface SettingsStoreState {
  livesEnabled: boolean
  soundEnabled: boolean
  highlightCompletedClues: boolean
  theme: ThemeId
  tutorialCompleted: boolean
  hasHydrated: boolean
  setLivesEnabled: (enabled: boolean) => void
  toggleLivesEnabled: () => void
  setSoundEnabled: (enabled: boolean) => void
  toggleSoundEnabled: () => void
  setHighlightCompletedClues: (enabled: boolean) => void
  toggleHighlightCompletedClues: () => void
  setTheme: (theme: ThemeId) => void
  completeTutorial: () => void
  setHasHydrated: (hasHydrated: boolean) => void
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      livesEnabled: true,
      soundEnabled: false,
      highlightCompletedClues: true,
      theme: DEFAULT_THEME,
      tutorialCompleted: false,
      hasHydrated: false,
      setLivesEnabled: (enabled) => set({ livesEnabled: enabled }),
      toggleLivesEnabled: () =>
        set((state) => ({
          livesEnabled: !state.livesEnabled,
        })),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      toggleSoundEnabled: () =>
        set((state) => ({
          soundEnabled: !state.soundEnabled,
        })),
      setHighlightCompletedClues: (enabled) => set({ highlightCompletedClues: enabled }),
      toggleHighlightCompletedClues: () =>
        set((state) => ({
          highlightCompletedClues: !state.highlightCompletedClues,
        })),
      setTheme: (theme) => set({ theme: normalizeThemeId(theme) }),
      completeTutorial: () => set({ tutorialCompleted: true }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'nonogram-settings',
      version: 5,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as {
          livesEnabled?: boolean
          soundEnabled?: boolean
          highlightCompletedClues?: boolean
          theme?: string
          tutorialCompleted?: boolean
        }
        return {
          livesEnabled: state.livesEnabled ?? true,
          soundEnabled: state.soundEnabled ?? false,
          highlightCompletedClues: state.highlightCompletedClues ?? true,
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
        soundEnabled: state.soundEnabled,
        highlightCompletedClues: state.highlightCompletedClues,
        theme: state.theme,
        tutorialCompleted: state.tutorialCompleted,
      }),
    },
  ),
)
