import React from 'react'
import { act, render, screen } from '@testing-library/react'

import { FireworksOverlay } from '@/ui/components/FireworksOverlay'

const mockContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fill: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
} as unknown as CanvasRenderingContext2D

describe('FireworksOverlay', () => {
  let requestAnimationFrameSpy: ReturnType<typeof vi.spyOn>
  let cancelAnimationFrameSpy: ReturnType<typeof vi.spyOn>
  let getContextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()

    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockContext)

    requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        return window.setTimeout(() => callback(performance.now()), 16)
      })

    cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((handle: number) => {
        window.clearTimeout(handle)
      })
  })

  afterEach(() => {
    vi.useRealTimers()
    getContextSpy.mockRestore()
    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('renders a canvas immediately on mount', () => {
    render(<FireworksOverlay durationMs={120} />)

    expect(screen.getByTestId('fireworks-overlay')).toBeInTheDocument()
    expect(getContextSpy).toHaveBeenCalledWith('2d')
  })

  it('removes the canvas after the celebration finishes', async () => {
    render(<FireworksOverlay durationMs={120} />)

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(screen.queryByTestId('fireworks-overlay')).not.toBeInTheDocument()
  })
})
