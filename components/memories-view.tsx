'use client'

import { useEffect, useState } from 'react'
import { useStore, Memory } from '@/lib/store'
import { memories as memoryApi } from '@/lib/api'
import { Filter, Trash2, Link2, ArrowUpRight } from 'lucide-react'

export default function MemoriesView() {
  const [mounted, setMounted] = useState(false)
  const { currentWorkspace, memories, setMemories, memoryTypeFilter, setMemoryTypeFilter } = useStore()
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadMemories = async () => {
    if (!currentWorkspace) return
    setIsLoading(true)
    try {
      const response = await memoryApi.list(currentWorkspace.id, {
        type: memoryTypeFilter || undefined,
      })
      setMemories(response.data || [])
    } catch (error) {
      console.error('Failed to load memories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (currentWorkspace) {
      loadMemories()
    }
  }, [currentWorkspace])

  // Return loading fallback if server-side rendering
  if (!mounted) {
    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="border-b border-border p-6">
            <h2 className="text-2xl font-bold text-foreground">Memory Vault</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Timeline and organized view of all captured memories
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Loading memories...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleDeleteMemory = async (id: string) => {
    if (!currentWorkspace) return
    try {
      await memoryApi.delete(currentWorkspace.id, id)
      setMemories(memories.filter((m) => m.id !== id))
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  const filteredMemories = memoryTypeFilter
    ? memories.filter((m) => m.type === memoryTypeFilter)
    : memories

  const memoryTypes = [
    { value: null, label: 'All Memories' },
    { value: 'decision', label: 'Decisions' },
    { value: 'goal', label: 'Goals' },
    { value: 'reasoning', label: 'Reasoning' },
    { value: 'outcome', label: 'Outcomes' },
    { value: 'alternative', label: 'Alternatives' },
    { value: 'environment', label: 'Environment' },
  ]

  const getMemoryColor = (type: string) => {
    const colors: Record<string, string> = {
      decision: 'from-blue-500 to-cyan-500',
      goal: 'from-purple-500 to-pink-500',
      reasoning: 'from-orange-500 to-yellow-500',
      outcome: 'from-green-500 to-emerald-500',
      alternative: 'from-red-500 to-orange-500',
      environment: 'from-amber-500 to-orange-600',
    }
    return colors[type] || 'from-gray-500 to-slate-500'
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-bold text-foreground">Memory Vault</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Timeline and organized view of all captured memories
          </p>
        </div>

        {/* Filters */}
        <div className="border-b border-border p-6 flex items-center gap-3 overflow-x-auto">
          <Filter size={16} className="text-muted-foreground flex-shrink-0" />
          <div className="flex gap-2">
            {memoryTypes.map((type) => (
              <button
                key={type.value || 'all'}
                onClick={() => {
                  setMemoryTypeFilter(type.value as any)
                  loadMemories()
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                  memoryTypeFilter === type.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 p-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading memories...</p>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-muted-foreground">No memories yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start chatting to capture memories
                </p>
              </div>
            </div>
          ) : (
            filteredMemories
              .slice()
              .reverse()
              .map((memory, idx) => (
                <div
                  key={memory.id}
                  className="group glass p-4 rounded-lg cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => setSelectedMemory(memory)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-bold uppercase px-2 py-1 rounded-full bg-gradient-to-r ${getMemoryColor(memory.type)} text-white`}
                        >
                          {memory.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(memory.createdAt).toLocaleDateString()} at{' '}
                          {new Date(memory.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{memory.content}</p>
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {memory.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-secondary/20 rounded-lg transition-colors">
                        <Link2 size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteMemory(memory.id)
                        }}
                        className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedMemory && (
        <div className="w-96 border-l border-border bg-card flex flex-col h-screen sticky top-0 z-20">
          <div className="border-b border-border p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Memory Details</h3>
              <button
                onClick={() => setSelectedMemory(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                Type
              </p>
              <span
                className={`text-xs font-bold uppercase px-2 py-1 rounded-full bg-gradient-to-r ${getMemoryColor(selectedMemory.type)} text-white`}
              >
                {selectedMemory.type}
              </span>
            </div>

            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                Content
              </p>
              <p className="text-sm text-foreground">{selectedMemory.content}</p>
            </div>

            {selectedMemory.context && (
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                  Context
                </p>
                <p className="text-sm text-foreground">{selectedMemory.context}</p>
              </div>
            )}

            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                Created
              </p>
              <p className="text-sm text-foreground">
                {new Date(selectedMemory.createdAt).toLocaleString()}
              </p>
            </div>

            {selectedMemory.tags && selectedMemory.tags.length > 0 && (
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedMemory.linkedMemories && selectedMemory.linkedMemories.length > 0 && (
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                  Linked Memories
                </p>
                <div className="space-y-1">
                  {selectedMemory.linkedMemories.map((linkId) => (
                    <button
                      key={linkId}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ArrowUpRight size={12} />
                      Memory {linkId.slice(0, 8)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
