import { create } from 'zustand'

export interface Memory {
  id: string
  type: 'decision' | 'goal' | 'reasoning' | 'outcome' | 'alternative' | 'environment'
  content: string
  context?: string
  createdAt: string
  tags?: string[]
  linkedMemories?: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  extractedMemories?: Memory[]
  timestamp: string
  candidates?: any[]
  approved?: boolean
  makeChangeClicked?: boolean
  autoSavedCandidates?: any[]
}

export interface Workspace {
  id: string
  name: string
  description?: string
  createdAt: string
  status?: 'active' | 'deleted'
  deletedAt?: string | null
  daysRemaining?: number | null
  stats?: {
    memories: number
    insights: number
    graphConnections: number
    recommendations: number
  }
}

interface AppState {
  // Workspaces
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  setWorkspaces: (workspaces: Workspace[]) => void
  setCurrentWorkspace: (workspace: Workspace | null) => void

  // Chat
  messages: Message[]
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void

  // Memories
  memories: Memory[]
  setMemories: (memories: Memory[]) => void
  addMemory: (memory: Memory) => void

  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  currentView: 'chat' | 'memories' | 'graph' | 'dashboard' | 'recycle-bin'
  setCurrentView: (view: 'chat' | 'memories' | 'graph' | 'dashboard' | 'recycle-bin') => void

  // Memory filters
  memoryTypeFilter: string | null
  setMemoryTypeFilter: (filter: string | null) => void

  // Settings
  memoryApprovalMode: 'auto-save' | 'review-every'
  setMemoryApprovalMode: (mode: 'auto-save' | 'review-every') => void
}

export const useStore = create<AppState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),

  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),

  memories: [],
  setMemories: (memories) => set({ memories }),
  addMemory: (memory) => set((state) => ({ memories: [...state.memories, memory] })),

  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  currentView: 'chat',
  setCurrentView: (currentView) => set({ currentView }),

  memoryTypeFilter: null,
  setMemoryTypeFilter: (memoryTypeFilter) => set({ memoryTypeFilter }),

  memoryApprovalMode: 'auto-save',
  setMemoryApprovalMode: (memoryApprovalMode) => set({ memoryApprovalMode }),
}))
