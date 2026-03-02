import { createTimer, formatElapsed } from '@/core/timer'

describe('timer', () => {
  it('returns elapsed time after start', () => {
    let nowMs = 0
    const timer = createTimer(() => nowMs)

    timer.start()
    nowMs = 100

    expect(timer.getElapsed()).toBe(100)
  })

  it('does not count paused time', () => {
    let nowMs = 0
    const timer = createTimer(() => nowMs)

    timer.start()
    nowMs = 150
    timer.pause()

    nowMs = 350
    expect(timer.getElapsed()).toBe(150)

    timer.resume()
    nowMs = 500
    expect(timer.getElapsed()).toBe(300)
  })

  it('restores elapsed time through serialize and deserialize', () => {
    let nowA = 0
    const timerA = createTimer(() => nowA)

    timerA.start()
    nowA = 420
    timerA.pause()
    const snapshot = timerA.serialize()

    let nowB = 1_000
    const timerB = createTimer(() => nowB)
    timerB.deserialize(snapshot)

    expect(timerB.getElapsed()).toBe(420)
    timerB.resume()
    nowB = 1_250
    expect(timerB.getElapsed()).toBe(670)
  })

  it('returns zero before start', () => {
    const timer = createTimer(() => 123)
    expect(timer.getElapsed()).toBe(0)
  })
})

describe('formatElapsed', () => {
  it('formats MM:SS under one hour', () => {
    expect(formatElapsed(0)).toBe('0:00')
    expect(formatElapsed(65_000)).toBe('1:05')
    expect(formatElapsed(3_599_000)).toBe('59:59')
  })

  it('formats H:MM:SS after one hour', () => {
    expect(formatElapsed(3_600_000)).toBe('1:00:00')
    expect(formatElapsed(3_661_000)).toBe('1:01:01')
  })
})
