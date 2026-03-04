import { useCallback, useEffect, useRef } from 'react'

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

const soundVolumes: Record<SoundType, number> = {
  click: 0.7,
  success: 0.6,
  error: 0.55,
}

let audioContext: AudioContext | null = null
const audioBuffers: Partial<Record<SoundType, AudioBuffer>> = {}
let buffersLoaded = false

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
    // Prevent iOS from showing Now Playing controls for short UI sounds
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null
      navigator.mediaSession.playbackState = 'none'
    }
  }
  return audioContext
}

async function loadBuffers() {
  if (buffersLoaded) return
  buffersLoaded = true

  const ctx = getAudioContext()
  const types = Object.keys(soundFiles) as SoundType[]

  await Promise.all(
    types.map(async (type) => {
      try {
        const response = await fetch(soundFiles[type])
        const arrayBuffer = await response.arrayBuffer()
        audioBuffers[type] = await ctx.decodeAudioData(arrayBuffer)
      } catch {
        // Ignore load errors
      }
    }),
  )
}

export function useSound() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (soundEnabled && !loadedRef.current) {
      loadedRef.current = true
      void loadBuffers()
    }
  }, [soundEnabled])

  const play = useCallback(
    (type: SoundType) => {
      if (!soundEnabled) return

      try {
        const ctx = getAudioContext()
        if (ctx.state === 'suspended') {
          void ctx.resume()
        }

        const buffer = audioBuffers[type]
        if (!buffer) return

        const source = ctx.createBufferSource()
        source.buffer = buffer

        const gain = ctx.createGain()
        gain.gain.value = soundVolumes[type]

        if (type === 'click') {
          source.playbackRate.value = 0.97 + Math.random() * 0.06
        }

        source.connect(gain)
        gain.connect(ctx.destination)
        source.start(0)

        // Suspend AudioContext after sound ends to dismiss iOS Now Playing controls
        source.onended = () => {
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'none'
          }
        }
      } catch {
        // Ignore audio errors
      }
    },
    [soundEnabled],
  )

  return { play }
}
