import { useCallback, useRef } from 'react'

import { useSettingsStore } from '@/store/settings-store'

type SoundType = 'click' | 'success' | 'error'

const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`

const soundFiles: Record<SoundType, string> = {
  click: `${baseUrl}sounds/click.mp3`,
  success: `${baseUrl}sounds/success.mp3`,
  error: `${baseUrl}sounds/error.mp3`,
}

export function useSound() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
    click: null,
    success: null,
    error: null,
  })

  const play = useCallback(
    (type: SoundType) => {
      if (!soundEnabled) return

      try {
        if (!audioRefs.current[type]) {
          audioRefs.current[type] = new Audio(soundFiles[type])
        }
        const audio = audioRefs.current[type]
        if (audio) {
          audio.currentTime = 0
          void audio.play().catch(() => {
            // Ignore errors (e.g., user hasn't interacted with page yet)
          })
        }
      } catch {
        // Ignore audio errors
      }
    },
    [soundEnabled],
  )

  return { play }
}
