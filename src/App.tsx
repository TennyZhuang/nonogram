import { useEffect, useMemo, useState } from 'react'

import type { DifficultyTier } from '@/core/types'
import { readDebugInputEnabled } from '@/lib/debug-input'
import { hydrateFromStorage, saveOnLifecycle, startAutoSave } from '@/persistence/sync'
import { countUnlockedAchievements, useAchievementStore } from '@/store/achievement-store'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'
import { DEFAULT_THEME, isThemeUnlocked, normalizeThemeId } from '@/theme/themes'
import { AchievementsPage } from '@/ui/pages/AchievementsPage'
import { GamePage } from '@/ui/pages/GamePage'
import { HomePage } from '@/ui/pages/HomePage'
import { OnboardingPage } from '@/ui/pages/OnboardingPage'
import { SettingsPage } from '@/ui/pages/SettingsPage'
import { SoundToggle } from '@/ui/components/SoundToggle'

type AppPage = 'home' | 'game' | 'achievements' | 'settings' | 'onboarding'

interface RecommendedChallenge {
  tier: DifficultyTier
  title: string
  description: string
}

function getRecommendedChallenge(unlockedAchievementIds: ReadonlySet<string>): RecommendedChallenge {
  if (!unlockedAchievementIds.has('first-clear')) {
    return {
      tier: 1,
      title: '先赢一局热身',
      description: '从 D1 起步，30 秒找回数织手感。',
    }
  }

  if (!unlockedAchievementIds.has('first-d5')) {
    return {
      tier: 5,
      title: '冲刺奖励主题',
      description: '首次通关 D5，可解锁更明快的「赤金」主题。',
    }
  }

  if (!unlockedAchievementIds.has('first-d6')) {
    return {
      tier: 6,
      title: '挑战王者难度',
      description: '把 D6 拿下，夜梅主题就归你。',
    }
  }

  return {
    tier: 4,
    title: '保持今天的状态',
    description: '来一局中高难度，把节奏感继续压住。',
  }
}

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
  const elapsedMs = useGameStore((state) => state.elapsedMs)
  const [debugEnabled] = useState(readDebugInputEnabled)
  const startGameByTier = useGameStore((state) => state.startGameByTier)
  const warmupPools = useGameStore((state) => state.warmupPools)
  const achievements = useAchievementStore((state) => state.achievements)
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const tutorialCompleted = useSettingsStore((state) => state.tutorialCompleted)
  const completeTutorial = useSettingsStore((state) => state.completeTutorial)
  const hasHydrated = useSettingsStore((state) => state.hasHydrated)
  const [onboardingReturnPage, setOnboardingReturnPage] = useState<AppPage>('home')

  const normalizedTheme = normalizeThemeId(theme)

  const unlockedAchievementIds = useMemo(
    () => new Set(achievements.filter((item) => item.unlocked).map((item) => item.id)),
    [achievements],
  )
  const canContinue = Boolean(currentPuzzle && game && game.status === 'playing')
  const achievementSummary = useMemo(
    () => ({
      unlocked: countUnlockedAchievements(achievements),
      total: achievements.length,
    }),
    [achievements],
  )
  const currentSession = useMemo(() => {
    if (!currentPuzzle || !game || game.status !== 'playing') {
      return null
    }

    return {
      tier: currentPuzzle.tier,
      size: currentPuzzle.size,
      elapsedMs,
      livesRemaining: game.livesRemaining,
      maxLives: game.maxLives,
      mistakes: game.mistakes,
    }
  }, [currentPuzzle, elapsedMs, game])
  const recommendedChallenge = useMemo(
    () => getRecommendedChallenge(unlockedAchievementIds),
    [unlockedAchievementIds],
  )
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
    if (theme !== normalizedTheme) {
      setTheme(normalizedTheme)
    }
  }, [normalizedTheme, setTheme, theme])

  useEffect(() => {
    if (theme === DEFAULT_THEME) {
      return
    }

    if (!isThemeUnlocked(theme, unlockedAchievementIds)) {
      setTheme(DEFAULT_THEME)
    }
  }, [setTheme, theme, unlockedAchievementIds])

  useEffect(() => {
    document.documentElement.dataset.theme = normalizedTheme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      const primary = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim()
      if (primary) {
        meta.setAttribute('content', primary)
      }
    }
  }, [normalizedTheme])

  const isManualOnboarding = page === 'onboarding'
  const shouldShowOnboarding = isManualOnboarding || (hasHydrated && !tutorialCompleted && page === 'home')

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
      currentSession={currentSession}
      achievementSummary={achievementSummary}
      recommendedChallenge={recommendedChallenge}
      onContinue={() => setPage('game')}
      onSelectDifficulty={handleStartTier}
      onOpenAchievements={() => setPage('achievements')}
      onOpenSettings={() => setPage('settings')}
      onInstall={async () => {
        if (!deferredInstallPrompt) {
          return
        }
        await deferredInstallPrompt.prompt()
        setDeferredInstallPrompt(null)
      }}
    />
  )

  if (shouldShowOnboarding) {
    pageContent = (
      <OnboardingPage
        onSkip={() => {
          completeTutorial()
          if (isManualOnboarding) {
            setPage(onboardingReturnPage)
          }
        }}
        onFinish={() => {
          completeTutorial()
          if (isManualOnboarding) {
            setPage(onboardingReturnPage)
          }
        }}
      />
    )
  } else if (page === 'game') {
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
  } else if (page === 'settings') {
    pageContent = (
      <SettingsPage
        onBack={() => setPage('home')}
        onOpenTutorial={() => {
          setOnboardingReturnPage('settings')
          setPage('onboarding')
        }}
      />
    )
  }

  return (
    <>
      {pageContent}
      <SoundToggle />
      {debugEnabled ? (
        <div className="pointer-events-none fixed bottom-2 left-2 z-50 rounded bg-black/70 px-2 py-1 text-[10px] text-white">
          构建时间：{buildLabel}
        </div>
      ) : null}
    </>
  )
}

export default App
