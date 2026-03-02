import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const SW_UPDATE_INTERVAL_MS = 2 * 60 * 1000

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) {
      return
    }

    const checkForUpdates = async () => {
      if (registration.installing || !navigator.onLine) {
        return
      }

      try {
        await fetch(swUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache',
          },
        })
        await registration.update()
      } catch {
        // Ignore transient network errors; next periodic check will retry.
      }
    }

    void checkForUpdates()
    window.setInterval(() => {
      void checkForUpdates()
    }, SW_UPDATE_INTERVAL_MS)

    window.addEventListener('focus', () => {
      void checkForUpdates()
    })
    window.addEventListener('online', () => {
      void checkForUpdates()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdates()
      }
    })
  },
})
