'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import ChatInterface from '@/components/chat-interface'
import Dashboard from '@/components/dashboard'
import MemoriesView from '@/components/memories-view'
import GraphView from '@/components/graph-view'
import RecycleBinView from '@/components/recycle-bin-view'
import Sidebar from '@/components/sidebar'
import OnboardingFlow from '@/components/onboarding-flow'
import { memories as memoryApi } from '@/lib/api'

export default function Page() {
  const { currentWorkspace, currentView, setMemories } = useStore()
  const [isReady, setIsReady] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [splashFade, setSplashFade] = useState(false)
  const [logoShow, setLogoShow] = useState(false)
  const [logoGlow, setLogoGlow] = useState(false)

  useEffect(() => {
    // 1. Slow outline fade-in at 100ms
    const showTimer = setTimeout(() => {
      setLogoShow(true)
    }, 100)

    // 2. Neon glow and tagline reveal at 800ms
    const glowTimer = setTimeout(() => {
      setLogoGlow(true)
    }, 800)

    // 3. Start fading out splash screen at 3200ms (3.2s)
    const fadeTimer = setTimeout(() => {
      setSplashFade(true)
    }, 3200)

    // 4. Remove splash screen from DOM at 4000ms (4.0s)
    const removeTimer = setTimeout(() => {
      setShowSplash(false)
    }, 4000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(glowTimer)
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  useEffect(() => {
    // Wait for workspace to be loaded or created
    if (currentWorkspace) {
      setIsReady(true)
      loadMemories(currentWorkspace.id)
    }
  }, [currentWorkspace])

  const loadMemories = async (wsId: string) => {
    try {
      const response = await memoryApi.list(wsId)
      setMemories(response.data || [])
    } catch (e) {
      console.error('Failed to pre-load memories:', e)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Dashboard Wrapper with Scale-Up and Fade-In Reveal */}
      <div 
        className={`relative flex h-screen w-screen min-h-0 transition-all duration-[700ms] ease-out transform ${
          splashFade ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0'
        }`}
      >
        {!isReady ? (
          <OnboardingFlow />
        ) : (
          <div className="absolute inset-0 flex h-full w-full min-h-0">
            <Sidebar />
            <main className="flex-1 overflow-hidden flex flex-col h-full min-h-0 bg-background">
              {currentView === 'chat' && <ChatInterface />}
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'memories' && <MemoriesView />}
              {currentView === 'graph' && <GraphView />}
              {currentView === 'recycle-bin' && <RecycleBinView />}
            </main>
          </div>
        )}
      </div>

      {/* Splash Screen Fixed Overlay */}
      {showSplash && (
        <div 
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1117] transition-opacity duration-[700ms] ease-in-out ${
            splashFade ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Logo container with pulsing radial glow */}
          <div className="relative w-56 h-56 flex items-center justify-center mb-8">
            <div className={`absolute w-40 h-40 rounded-full bg-gradient-to-tr from-primary/20 to-accent/20 blur-3xl transition-all duration-[1200ms] transform ${
              logoGlow ? 'scale-150 opacity-100 animate-pulse' : 'scale-75 opacity-0'
            }`} />
            
            <svg
              className={`w-32 h-32 transition-all duration-[1200ms] ease-out transform ${
                logoGlow 
                  ? 'text-primary scale-110 drop-shadow-[0_0_35px_rgba(59,130,246,0.65)] opacity-100' 
                  : logoShow
                    ? 'text-muted-foreground/45 scale-100 opacity-60'
                    : 'text-muted-foreground/10 scale-90 opacity-0'
              }`}
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" strokeWidth={logoGlow ? "5.5" : "3.5"} />
              <path d="M50 10 L50 48" strokeWidth="3" strokeDasharray="5 5" opacity="0.5" />
              <path d="M15 30 L50 48 L85 30" strokeWidth="3" strokeDasharray="5 5" opacity="0.5" />
              <path d="M50 48 L50 90" strokeWidth="3" strokeDasharray="5 5" opacity="0.5" />
              <path d="M35 38 L35 78" strokeWidth={logoGlow ? "9" : "5.5"} stroke="currentColor" />
              <path d="M35 38 L65 38 L65 58 L35 58" strokeWidth={logoGlow ? "9" : "5.5"} stroke="currentColor" />
              <circle cx="50" cy="10" r="7.5" fill="currentColor" />
              <circle cx="85" cy="30" r="7.5" fill="currentColor" />
              <circle cx="85" cy="70" r="7.5" fill="currentColor" />
              <circle cx="50" cy="90" r="7.5" fill="currentColor" />
              <circle cx="15" cy="70" r="7.5" fill="currentColor" />
              <circle cx="15" cy="30" r="7.5" fill="currentColor" />
              <circle cx="35" cy="78" r="7.5" fill="currentColor" />
            </svg>
          </div>

          {/* Clean tracked-out typography */}
          <div className="text-center space-y-4">
            <h1 className={`flex items-center justify-center font-sans text-3xl font-black tracking-[0.45em] transition-all duration-[1200ms] ease-out transform ${
              logoGlow ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              <span className="text-foreground">P</span>
              <span className="text-primary">R</span>
              <span className="text-primary">E</span>
              <span className="text-foreground">C</span>
              <span className="text-primary">E</span>
              <span className="text-foreground">D</span>
              <span className="text-primary">E</span>
              <span className="text-primary">N</span>
              <span className="text-foreground">T</span>
            </h1>
            <p className={`text-lg text-accent tracking-wider font-extrabold drop-shadow-[0_0_12px_rgba(6,182,212,0.7)] transition-all duration-[1200ms] delay-[450ms] ease-out transform ${
              logoGlow ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              Your past knows something you don&apos;t
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
