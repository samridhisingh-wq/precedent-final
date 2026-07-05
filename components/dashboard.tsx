'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { memories as memoryApi } from '@/lib/api'
import { MessageSquare, Trophy, Zap, Brain } from 'lucide-react'

export default function Dashboard() {
  const { currentWorkspace, memories, setMemories, messages } = useStore()

  useEffect(() => {
    if (currentWorkspace) {
      loadMemories()
    }
  }, [currentWorkspace])

  const loadMemories = async () => {
    if (!currentWorkspace) return
    try {
      const response = await memoryApi.list(currentWorkspace.id)
      setMemories(response.data || [])
    } catch (error) {
      console.error('Failed to load memories:', error)
    }
  }

  const stats = [
    {
      label: 'Decisions Logged',
      value: memories.filter((m) => m.type === 'decision').length,
      icon: Brain,
      bgColor: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-400/30',
    },
    {
      label: 'Rejections Stored',
      value: memories.filter((m) => m.type === 'alternative').length,
      icon: Trophy,
      bgColor: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-400/30',
    },
    {
      label: 'Successful Outcomes',
      value: memories.filter((m) => m.type === 'outcome').length,
      icon: Zap,
      bgColor: 'bg-green-500/20',
      iconColor: 'text-green-400',
      borderColor: 'border-green-400/30',
    },
    {
      label: 'Repeat Mistakes Prevented',
      value: Math.max(0, memories.filter((m) => m.type === 'goal').length),
      icon: MessageSquare,
      bgColor: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-400/30',
    },
  ]

  const recentMemories = memories.slice(-5).reverse()
  const memoryBreakdown = {
    decisions: memories.filter((m) => m.type === 'decision').length,
    goals: memories.filter((m) => m.type === 'goal').length,
    outcomes: memories.filter((m) => m.type === 'outcome').length,
    alternatives: memories.filter((m) => m.type === 'alternative').length,
    reasoning: memories.filter((m) => m.type === 'reasoning').length,
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-bold text-foreground">
          {currentWorkspace?.name || 'Dashboard'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Your memory insights and decision patterns
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div key={idx} className={`glass p-6 rounded-xl border ${stat.borderColor}`}>
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-3 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}
                  >
                    <Icon size={24} className={stat.iconColor} />
                  </div>
                  <span className="text-xs text-accent font-semibold">↗ live</span>
                </div>
                <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="text-muted-foreground text-sm mt-2">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Memory Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Memory Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(memoryBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm text-foreground capitalize">
                      {type === 'alternatives' ? 'Rejected Alternatives' : type}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Key Insights
            </h3>
            <div className="space-y-3">
              {memories.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Start chatting to generate insights
                </p>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-foreground">
                      You&apos;ve captured{' '}
                      <span className="font-semibold">{memories.length} memories</span> across{' '}
                      <span className="font-semibold">
                        {new Set(memories.map((m) => m.type)).size} types
                      </span>
                    </p>
                  </div>
                  {memoryBreakdown.decisions > 0 && (
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-sm text-foreground">
                        You&apos;ve documented{' '}
                        <span className="font-semibold">
                          {memoryBreakdown.decisions} key decisions
                        </span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recent Memories */}
        {recentMemories.length > 0 && (
          <div className="glass p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Recent Memories
            </h3>
            <div className="space-y-3">
              {recentMemories.map((memory) => (
                <div
                  key={memory.id}
                  className="p-4 rounded-lg bg-secondary/20 border border-border hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase text-primary">
                          {memory.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {memory.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
