import { useEffect, useState } from 'react'

import { Volume2, VolumeX } from 'lucide-react'

import { useSettingsStore } from '@/store/settings-store'

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

export function SoundToggle() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const toggleSoundEnabled = useSettingsStore((state) => state.toggleSoundEnabled)
  const [showDesktopToggle, setShowDesktopToggle] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const update = () => setShowDesktopToggle(mediaQuery.matches)

    update()
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update)
      return () => mediaQuery.removeEventListener('change', update)
    }

    mediaQuery.addListener(update)
    return () => mediaQuery.removeListener(update)
  }, [])

  if (!showDesktopToggle) {
    return null
  }

  return (
    <button
      type="button"
      onClick={toggleSoundEnabled}
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-all hover:bg-primary hover:scale-110"
      aria-label={soundEnabled ? '关闭音效' : '开启音效'}
      title={soundEnabled ? '关闭音效' : '开启音效'}
    >
      {soundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
    </button>
  )
}
