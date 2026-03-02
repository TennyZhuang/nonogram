import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark'

interface SettingsStoreState {
  livesEnabled: boolean
  theme: ThemeMode
  setLivesEnabled: (enabled: boolean) => void
  toggleLivesEnabled: () => void
  setTheme: (theme: ThemeMode) => void
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      livesEnabled: true,
      theme: 'light',
      setLivesEnabled: (enabled) => set({ livesEnabled: enabled }),
      toggleLivesEnabled: () =>
        set((state) => ({
          livesEnabled: !state.livesEnabled,
        })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'nonogram-settings',
      partialize: (state) => ({
        livesEnabled: state.livesEnabled,
        theme: state.theme,
      }),
    },
  ),
)
