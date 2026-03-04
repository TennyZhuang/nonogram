import { create } from 'zustand'

interface NotificationStoreState {
  message: string | null
  showNotification: (message: string) => void
  clearNotification: () => void
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  message: null,

  showNotification(message) {
    set({ message })
  },

  clearNotification() {
    set({ message: null })
  },
}))
