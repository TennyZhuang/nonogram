import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_THEME, normalizeThemeId, type ThemeId } from '@/theme/themes'

interface SettingsStoreState {
  livesEnabled: boolean
  theme: ThemeId
  setLivesEnabled: (enabled: boolean) => void
  toggleLivesEnabled: () => void
  setTheme: (theme: ThemeId) => void
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      livesEnabled: true,
      theme: DEFAULT_THEME,
      setLivesEnabled: (enabled) => set({ livesEnabled: enabled }),
      toggleLivesEnabled: () =>
        set((state) => ({
          livesEnabled: !state.livesEnabled,
        })),
      setTheme: (theme) => set({ theme: normalizeThemeId(theme) }),
    }),
    {
      name: 'nonogram-settings',
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as {
          livesEnabled?: boolean
          theme?: string
        }
        return {
          livesEnabled: state.livesEnabled ?? true,
          theme: normalizeThemeId(state.theme),
        }
      },
      partialize: (state) => ({
        livesEnabled: state.livesEnabled,
        theme: state.theme,
      }),
    },
  ),
)
