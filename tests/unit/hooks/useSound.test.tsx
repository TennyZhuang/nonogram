import { act, renderHook } from '@testing-library/react'

import { useSound } from '@/hooks/useSound'
import { useSettingsStore } from '@/store/settings-store'

describe('useSound', () => {
  const originalAudio = globalThis.Audio

  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({ soundEnabled: false })
  })

  afterEach(() => {
    globalThis.Audio = originalAudio
    vi.restoreAllMocks()
  })

  it('does not create audio when sound is disabled', () => {
    const audioCtor = vi.fn()
    globalThis.Audio = audioCtor as unknown as typeof Audio

    const { result } = renderHook(() => useSound())
    act(() => {
      result.current.play('click')
    })

    expect(audioCtor).not.toHaveBeenCalled()
  })

  it('uses BASE_URL-prefixed sound paths when enabled', () => {
    const play = vi.fn().mockResolvedValue(undefined)
    const audioCtor = vi.fn(function (this: { currentTime: number; play: typeof play }) {
      this.currentTime = 1
      this.play = play
    })
    globalThis.Audio = audioCtor as unknown as typeof Audio

    useSettingsStore.setState({ soundEnabled: true })
    const { result } = renderHook(() => useSound())

    act(() => {
      result.current.play('click')
    })

    expect(audioCtor).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sounds/click.wav`)
    expect(play).toHaveBeenCalledTimes(1)
    expect(audioCtor.mock.instances[0]?.currentTime).toBe(0)
  })
})
