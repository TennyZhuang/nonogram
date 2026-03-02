export interface TimerSnapshot {
  elapsedMs: number
  running: boolean
}

export interface TimerController {
  start: () => void
  pause: () => void
  resume: () => void
  getElapsed: () => number
  serialize: () => TimerSnapshot
  deserialize: (snapshot: TimerSnapshot) => void
}

type NowProvider = () => number

export function createTimer(now: NowProvider = Date.now): TimerController {
  let elapsedMs = 0
  let running = false
  let lastStartedAt = 0

  const commitRunningDelta = (): void => {
    if (!running) {
      return
    }
    elapsedMs += Math.max(0, now() - lastStartedAt)
    lastStartedAt = now()
  }

  return {
    start() {
      elapsedMs = 0
      running = true
      lastStartedAt = now()
    },
    pause() {
      commitRunningDelta()
      running = false
    },
    resume() {
      if (running) {
        return
      }
      running = true
      lastStartedAt = now()
    },
    getElapsed() {
      if (!running) {
        return elapsedMs
      }
      return elapsedMs + Math.max(0, now() - lastStartedAt)
    },
    serialize() {
      return {
        elapsedMs: this.getElapsed(),
        running,
      }
    },
    deserialize(snapshot) {
      elapsedMs = snapshot.elapsedMs
      running = snapshot.running
      lastStartedAt = now()
    },
  }
}

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600)
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
