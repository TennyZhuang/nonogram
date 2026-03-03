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

window.addEventListener('pageshow', (event) => {
  if (!event.persisted || !navigator.onLine) {
    return
  }

  // Safari may restore a frozen page from bfcache; reload only when coming back online.
  window.location.reload()
})

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
        // Ignore transient network errors; retry on the next page load.
      }
    }

    // Only check once on page load. Mid-session refreshes are disruptive while solving.
    void checkForUpdates()
  },
})
