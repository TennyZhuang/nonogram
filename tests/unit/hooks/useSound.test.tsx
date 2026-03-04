import { act, renderHook } from '@testing-library/react'

const mockStart = vi.fn()
const mockConnect = vi.fn()
const mockGainConnect = vi.fn()

const mockAudioContextInstance = {
  state: 'running',
  createBufferSource: vi.fn(() => ({
    connect: mockConnect,
    start: mockStart,
    buffer: null as AudioBuffer | null,
    playbackRate: { value: 1 },
  })),
  createGain: vi.fn(() => ({
    connect: mockGainConnect,
    gain: { value: 1 },
  })),
  resume: vi.fn().mockResolvedValue(undefined),
  decodeAudioData: vi.fn().mockResolvedValue({ duration: 0.5 }),
  destination: {},
}

vi.stubGlobal(
  'AudioContext',
  function MockAudioContext() {
    return mockAudioContextInstance
  },
)

vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }),
)

describe('useSound', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('does not play when sound is disabled', async () => {
    const { useSettingsStore } = await import('@/store/settings-store')
    const { useSound } = await import('@/hooks/useSound')

    useSettingsStore.setState({ soundEnabled: false })
    const { result } = renderHook(() => useSound())
    act(() => {
      result.current.play('click')
    })

    expect(mockAudioContextInstance.createBufferSource).not.toHaveBeenCalled()
  })

  it('fetches sounds and plays via Web Audio API when enabled', async () => {
    const { useSettingsStore } = await import('@/store/settings-store')
    const { useSound } = await import('@/hooks/useSound')

    useSettingsStore.setState({ soundEnabled: true })
    const { result } = renderHook(() => useSound())

    // Wait for buffers to load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sounds/click.mp3'),
    )

    act(() => {
      result.current.play('click')
    })

    expect(mockAudioContextInstance.createBufferSource).toHaveBeenCalled()
    expect(mockConnect).toHaveBeenCalled()
    expect(mockStart).toHaveBeenCalledWith(0)
  })
})
