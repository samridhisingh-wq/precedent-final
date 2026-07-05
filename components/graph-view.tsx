'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { graph } from '@/lib/api'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

export default function GraphView() {
  const [mounted, setMounted] = useState(false)
  const { currentWorkspace } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])

  const loadGraphData = async () => {
    if (!currentWorkspace) return
    setIsLoading(true)
    try {
      const response = await graph.getData(currentWorkspace.id)
      setNodes(response.data?.nodes || [])
      setEdges(response.data?.edges || [])
    } catch (error) {
      console.error('Failed to load graph data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (currentWorkspace) {
      loadGraphData()
    }
  }, [currentWorkspace])

  // Return loading fallback if server-side rendering
  if (!mounted) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border p-6">
          <h2 className="text-2xl font-bold text-foreground">Memory Graph</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize relationships between your decisions and outcomes
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading visual graph...</p>
        </div>
      </div>
    )
  }

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      decision: 'rgb(59, 130, 246)',
      goal: 'rgb(168, 85, 247)',
      reasoning: 'rgb(249, 115, 22)',
      outcome: 'rgb(34, 197, 94)',
      alternative: 'rgb(239, 68, 68)',
      rejected_alternative: 'rgb(239, 68, 68)',
      environment: 'rgb(245, 158, 11)',
    }
    return colors[type] || 'rgb(107, 114, 128)'
  }

  // Calculate nodes coordinates dynamically in a circular layout
  const nodePositions: Record<string, { x: number; y: number }> = {}
  nodes.forEach((node, idx) => {
    const angle = (idx / nodes.length) * Math.PI * 2
    const radius = 180
    // Center it on a typical 800x600 canvas center
    const x = 400 + radius * Math.cos(angle)
    const y = 300 + radius * Math.sin(angle)
    nodePositions[node.id] = { x, y }
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-bold text-foreground">Memory Graph</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Visualize relationships between your decisions and outcomes
        </p>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border p-4 flex items-center gap-2 bg-card/50">
        <button className="p-2 hover:bg-secondary/20 rounded-lg transition-colors">
          <ZoomIn size={18} className="text-muted-foreground" />
        </button>
        <button className="p-2 hover:bg-secondary/20 rounded-lg transition-colors">
          <ZoomOut size={18} className="text-muted-foreground" />
        </button>
        <div className="flex-1"></div>
        <button className="p-2 hover:bg-secondary/20 rounded-lg transition-colors">
          <Maximize2 size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden relative bg-gradient-to-br from-background via-background to-card/20">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">Loading graph data...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-foreground">No memories to visualize yet</p>
              <p className="text-muted-foreground text-sm">
                Start chatting to build your memory graph
              </p>
            </div>
          </div>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connection lines from edges */}
            {edges.map((edge, idx) => {
              const sourcePos = nodePositions[edge.source]
              const targetPos = nodePositions[edge.target]
              if (!sourcePos || !targetPos) return null
              return (
                <line
                  key={`edge-${idx}`}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={edge.weight ? edge.weight * 3 : 2}
                />
              )
            })}

            {/* Node circle & label visualization */}
            {nodes.map((node) => {
              const pos = nodePositions[node.id]
              if (!pos) return null
              return (
                <g key={node.id}>
                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="18"
                    fill={getNodeColor(node.type)}
                    opacity="0.85"
                    className="cursor-pointer hover:opacity-100 transition-opacity animate-fade-in"
                  />

                  {/* Node label */}
                  <text
                    x={pos.x}
                    y={pos.y + 32}
                    textAnchor="middle"
                    className="text-[10px] fill-muted-foreground select-none"
                    fontWeight="semibold"
                  >
                    {node.label || node.type}
                  </text>
                </g>
              )
            })}
          </svg>
        )}

        {/* Legend */}
        {nodes.length > 0 && (
          <div className="absolute bottom-6 left-6 glass p-4 rounded-lg">
            <p className="text-xs font-semibold text-foreground mb-3">Memory Types</p>
            <div className="space-y-2">
              {[
                { type: 'decision', label: 'Decisions' },
                { type: 'goal', label: 'Goals' },
                { type: 'reasoning', label: 'Reasoning' },
                { type: 'outcome', label: 'Outcomes' },
                { type: 'alternative', label: 'Alternatives' },
                { type: 'environment', label: 'Environment' },
              ].map(({ type, label }) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getNodeColor(type) }}
                  ></div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {nodes.length > 0 && (
          <div className="absolute top-6 right-6 glass p-4 rounded-lg">
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Nodes</p>
                <p className="text-xl font-bold text-foreground">{nodes.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Unique Types</p>
                <p className="text-xl font-bold text-foreground">
                  {new Set(nodes.map((n) => n.type)).size}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
