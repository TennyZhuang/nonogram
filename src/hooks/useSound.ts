import { useCallback, useRef } from 'react'

import { useSettingsStore } from '@/store/settings-store'

type SoundType = 'click' | 'success' | 'error'

const baseUrl = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`

const soundFiles: Record<SoundType, string[]> = {
  click: [`${baseUrl}sounds/click.mp3`],
  success: [`${baseUrl}sounds/success.mp3`],
  error: [`${baseUrl}sounds/error.mp3`],
}

const soundVolumes: Record<SoundType, number> = {
  click: 0.7,
  success: 0.6,
  error: 0.55,
}

export function useSound() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const audioRefs = useRef<Record<SoundType, HTMLAudioElement | null>>({
    click: null,
    success: null,
    error: null,
  })
  const sourceIndexRefs = useRef<Record<SoundType, number>>({
    click: 0,
    success: 0,
    error: 0,
  })

  const createAudio = useCallback((type: SoundType) => {
    const sourceIndex = sourceIndexRefs.current[type]
    const source = soundFiles[type][sourceIndex]
    if (!source) {
      return null
    }

    const audio = new Audio(source)
    audio.volume = soundVolumes[type]
    return audio
  }, [])

  const play = useCallback(
    (type: SoundType) => {
      if (!soundEnabled) return

      try {
        if (!audioRefs.current[type]) {
          audioRefs.current[type] = createAudio(type)
        }
        const audio = audioRefs.current[type]
        if (audio) {
          if (type === 'click') {
            audio.playbackRate = 0.97 + Math.random() * 0.06
          } else {
            audio.playbackRate = 1
          }
          audio.currentTime = 0
          void audio.play().catch((error) => {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
              return
            }
            const nextSourceIndex = sourceIndexRefs.current[type] + 1
            const fallbackSource = soundFiles[type][nextSourceIndex]
            if (!fallbackSource) {
              return
            }
            sourceIndexRefs.current[type] = nextSourceIndex
            const fallback = createAudio(type)
            if (!fallback) {
              return
            }
            audioRefs.current[type] = fallback
            fallback.currentTime = 0
            void fallback.play().catch(() => {
              // Ignore audio errors (e.g., user hasn't interacted with page yet)
            })
          })
        }
      } catch {
        // Ignore audio errors
      }
    },
    [createAudio, soundEnabled],
  )

  return { play }
}
