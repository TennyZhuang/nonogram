import { useEffect, useMemo, useState } from 'react'

import type { DifficultyTier } from '@/core/types'
import { hydrateFromStorage, saveOnLifecycle, startAutoSave } from '@/persistence/sync'
import { useGameStore } from '@/store/game-store'
import { AchievementsPage } from '@/ui/pages/AchievementsPage'
import { GamePage } from '@/ui/pages/GamePage'
import { HomePage } from '@/ui/pages/HomePage'

type AppPage = 'home' | 'game' | 'achievements'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function App() {
  const [page, setPage] = useState<AppPage>('home')
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const currentPuzzle = useGameStore((state) => state.currentPuzzle)
  const game = useGameStore((state) => state.game)
  const startGameByTier = useGameStore((state) => state.startGameByTier)
  const warmupPools = useGameStore((state) => state.warmupPools)

  const canContinue = Boolean(currentPuzzle && game)
  const buildLabel = useMemo(() => {
    const time = __APP_BUILD_TIME__
    const parsed = new Date(time)
    if (Number.isNaN(parsed.getTime())) {
      return time
    }
    return parsed.toLocaleString('zh-CN', { hour12: false })
  }, [])

  useEffect(() => {
    warmupPools()
  }, [warmupPools])

  useEffect(() => {
    void hydrateFromStorage()
    const stopAutoSave = startAutoSave()
    const stopLifecycle = saveOnLifecycle()

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    return () => {
      stopAutoSave()
      stopLifecycle()
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  const handleStartTier = (tier: DifficultyTier) => {
    startGameByTier(tier)
    setPage('game')
  }

  let pageContent = (
    <HomePage
      canContinue={canContinue}
      canInstall={Boolean(deferredInstallPrompt)}
      onContinue={() => setPage('game')}
      onSelectDifficulty={handleStartTier}
      onOpenAchievements={() => setPage('achievements')}
      onInstall={async () => {
        if (!deferredInstallPrompt) {
          return
        }
        await deferredInstallPrompt.prompt()
        setDeferredInstallPrompt(null)
      }}
    />
  )

  if (page === 'game') {
    pageContent = <GamePage onBackHome={() => setPage('home')} />
  } else if (page === 'achievements') {
    pageContent = (
      <AchievementsPage
        onBack={() => setPage('home')}
        onStartTier={(tier) => {
          handleStartTier(tier)
          setPage('game')
        }}
      />
    )
  }

  return (
    <>
      {pageContent}
      <div className="pointer-events-none fixed right-2 top-2 z-50 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
        构建时间：{buildLabel}
      </div>
    </>
  )
}

export default App
