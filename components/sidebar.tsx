'use client'

import { useStore } from '@/lib/store'
import { workspaces as workspaceApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  BarChart3,
  Share2,
  Network,
  ChevronDown,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    currentWorkspace,
    workspaces,
    setWorkspaces,
    setCurrentWorkspace,
    setSidebarOpen,
    memories,
    memoryApprovalMode,
    setMemoryApprovalMode,
  } = useStore()
  
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  
  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Rename Modal States
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [workspaceToRename, setWorkspaceToRename] = useState<any | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)

  const handleCreateWorkspace = async () => {
    const name = prompt('Enter workspace name:')
    if (!name || !name.trim()) return
    
    try {
      const res = await workspaceApi.create({
        name: name.trim(),
        description: 'Capturing decisions'
      })
      const newWs = res.data
      const updated = [...workspaces, newWs]
      setWorkspaces(updated)
      setCurrentWorkspace(newWs)
      localStorage.setItem('currentWorkspace', JSON.stringify(newWs))
      localStorage.setItem('workspaces', JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to create workspace:', error)
    }
  }

  const handleRenameWorkspace = (ws: any) => {
    setWorkspaceToRename(ws)
    setRenameValue(ws.name)
    setShowRenameModal(true)
  }

  const submitRename = async () => {
    if (!renameValue.trim() || !workspaceToRename) return
    setIsRenaming(true)
    try {
      await workspaceApi.rename(workspaceToRename.id, renameValue.trim())
      const updated = workspaces.map((w: any) => 
        w.id === workspaceToRename.id ? { ...w, name: renameValue.trim() } : w
      )
      setWorkspaces(updated)
      if (currentWorkspace?.id === workspaceToRename.id) {
        const updatedCurrent = { ...currentWorkspace, name: renameValue.trim() }
        setCurrentWorkspace(updatedCurrent)
        localStorage.setItem('currentWorkspace', JSON.stringify(updatedCurrent))
      }
      localStorage.setItem('workspaces', JSON.stringify(updated))
      setShowRenameModal(false)
    } catch (err) {
      console.error('Failed to rename workspace:', err)
    } finally {
      setIsRenaming(false)
    }
  }

  const handleDeleteWorkspace = (ws: any) => {
    setWorkspaceToDelete(ws)
    setShowDeleteModal(true)
  }

  const submitDelete = async () => {
    if (!workspaceToDelete) return
    setIsDeleting(true)
    try {
      await workspaceApi.delete(workspaceToDelete.id)
      
      const updated = workspaces.map((w: any) => 
        w.id === workspaceToDelete.id ? { ...w, status: 'deleted' as const, deletedAt: new Date().toISOString() } : w
      )
      setWorkspaces(updated)
      localStorage.setItem('workspaces', JSON.stringify(updated))

      const active = updated.filter((w: any) => w.status !== 'deleted')
      if (active.length > 0) {
        setCurrentWorkspace(active[0])
        localStorage.setItem('currentWorkspace', JSON.stringify(active[0]))
      }
      
      setShowDeleteModal(false)
    } catch (err) {
      console.error('Failed to delete workspace:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-2">
        <div className="flex items-center gap-3">
          {/* Isometric Cube Node Logo */}
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-border/40">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" strokeWidth="5.5" />
              <path d="M50 10 L50 48" strokeWidth="3.5" strokeDasharray="5 5" opacity="0.6" />
              <path d="M15 30 L50 48 L85 30" strokeWidth="3.5" strokeDasharray="5 5" opacity="0.6" />
              <path d="M50 48 L50 90" strokeWidth="3.5" strokeDasharray="5 5" opacity="0.6" />
              <path d="M35 38 L35 78" strokeWidth="9" stroke="currentColor" />
              <path d="M35 38 L65 38 L65 58 L35 58" strokeWidth="9" stroke="currentColor" />
              <circle cx="50" cy="10" r="7.5" fill="currentColor" />
              <circle cx="85" cy="30" r="7.5" fill="currentColor" />
              <circle cx="85" cy="70" r="7.5" fill="currentColor" />
              <circle cx="50" cy="90" r="7.5" fill="currentColor" />
              <circle cx="15" cy="70" r="7.5" fill="currentColor" />
              <circle cx="15" cy="30" r="7.5" fill="currentColor" />
              <circle cx="35" cy="78" r="7.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="flex items-center text-sm font-black tracking-[0.1em]">
              <span className="text-foreground">P</span>
              <span className="text-primary">R</span>
              <span className="text-primary">E</span>
              <span className="text-foreground">C</span>
              <span className="text-primary">E</span>
              <span className="text-foreground">D</span>
              <span className="text-primary">E</span>
              <span className="text-primary">N</span>
              <span className="text-foreground">T</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Memory Layer</p>
          </div>
        </div>
        <p className="text-[10px] text-accent/90 font-medium italic tracking-wide pl-1.5 border-l border-primary/40 leading-relaxed font-serif">
          &ldquo;The patterns you lived. The insights you missed.&rdquo;
        </p>
      </div>

      {/* Scrollable Body flow */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Workspace Selector */}
        {currentWorkspace && (
          <div className="p-3 border-b border-border">
            <div
              className="cursor-pointer flex items-center justify-between p-2 rounded-lg hover:bg-secondary/20 transition-colors"
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-semibold">
                  {currentWorkspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {currentWorkspace.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Personal workspace</p>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform ${workspaceOpen ? 'rotate-180' : ''}`}
              />
            </div>

            {workspaceOpen && workspaces.length > 0 && (
              <div className="mt-2 space-y-1">
                {workspaces.filter(w => w.status !== 'deleted').map((ws) => {
                  const isActive = currentWorkspace.id === ws.id;
                  const activeCount = workspaces.filter(w => w.status !== 'deleted').length;
                  return (
                    <div
                      key={ws.id}
                      className={`relative group w-full flex items-center justify-between rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setCurrentWorkspace(ws)
                          localStorage.setItem('currentWorkspace', JSON.stringify(ws))
                        }}
                        className="flex-1 text-left px-3 py-1.5 text-sm truncate"
                      >
                        {ws.name}
                      </button>
                      
                      <div className="relative flex items-center pr-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === ws.id ? null : ws.id)
                          }}
                          className={`p-1 rounded hover:bg-secondary/40 text-muted-foreground ${
                            openMenuId === ws.id ? 'block' : 'group-hover:block hidden'
                          }`}
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {openMenuId === ws.id && (
                          <div className="absolute right-0 top-6 w-28 bg-popover border border-border rounded-md shadow-lg z-50 text-foreground py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRenameWorkspace(ws)
                                setOpenMenuId(null)
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-secondary/20 flex items-center gap-1.5"
                            >
                              <Edit2 size={12} />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteWorkspace(ws)
                                setOpenMenuId(null)
                              }}
                              disabled={activeCount <= 1}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-500/10 text-red-500 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1.5"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={handleCreateWorkspace}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors"
                >
                  <Plus size={16} />
                  New Workspace
                </button>
              </div>
            )}
          </div>
        )}

        {/* Memory Health */}
        <div className="px-4 py-2 border-b border-border space-y-1.5">
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Memory Health</p>
              <span className="text-xs font-semibold text-accent font-medium">
                {memories.length > 0 ? `+${(memories.length * 1.5).toFixed(1)}%` : "0.0%"}
              </span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {Math.min(100, memories.length * 7)}{' '}
              <span className="text-xs text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="space-y-1">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent via-primary to-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, memories.length * 7)}%` }}
              ></div>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">Recall</span>
              <span className="text-[10px] text-muted-foreground">Depth</span>
              <span className="text-[10px] text-muted-foreground">Gaps</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 border-b border-border space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-1">Navigate</p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'dashboard'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
            }`}
          >
            <BarChart3 size={18} />
            <span className="text-xs font-semibold">Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentView('chat')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'chat'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
            }`}
          >
            <MessageSquare size={18} />
            <span className="text-xs font-semibold">Chat</span>
          </button>

          <button
            onClick={() => setCurrentView('memories')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'memories'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
            }`}
          >
            <Share2 size={18} />
            <span className="text-xs font-semibold">Memories</span>
          </button>

          <button
            onClick={() => setCurrentView('graph')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'graph'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
            }`}
          >
            <Network size={18} />
            <span className="text-xs font-semibold">Memory Graph</span>
          </button>

          <button
            onClick={() => setCurrentView('recycle-bin')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
              currentView === 'recycle-bin'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
            }`}
          >
            <Trash2 size={18} />
            <span className="text-xs font-semibold">Recycle Bin</span>
          </button>
        </nav>

        {/* Memory Settings */}
        <div className="p-3 space-y-2 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Memory Settings</p>
          <div className="flex flex-col gap-1.5 px-1">
            <label className="text-xs font-medium text-foreground">Approval Mode</label>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setMemoryApprovalMode('auto-save')}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-semibold transition-all flex items-center justify-between border ${
                  memoryApprovalMode === 'auto-save'
                    ? 'bg-primary text-primary-foreground border-primary/50 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20 border-transparent'
                }`}
              >
                <span>Auto-Save Mode</span>
                {memoryApprovalMode === 'auto-save' && (
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setMemoryApprovalMode('review-every')}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg font-semibold transition-all flex items-center justify-between border ${
                  memoryApprovalMode === 'review-every'
                    ? 'bg-primary text-primary-foreground border-primary/50 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20 border-transparent'
                }`}
              >
                <span>Review Mode</span>
                {memoryApprovalMode === 'review-every' && (
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                )}
              </button>
            </div>
            <span className="text-[13px] text-muted-foreground/80 italic leading-relaxed mt-2 px-1 block">
              {memoryApprovalMode === 'auto-save' 
                ? "✓ Factual memories auto-save instantly."
                : "✓ Review and approve every memory."}
            </span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && workspaceToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-foreground">
            <div className="flex items-center gap-3 text-red-500">
              <Trash2 size={24} />
              <h3 className="text-lg font-bold text-foreground">Delete Workspace?</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This workspace will be moved to the Recycle Bin. You can restore it within 30 days. After 30 days it will be permanently deleted.
            </p>
            <div className="bg-secondary/20 p-3.5 rounded-lg border border-border/40 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This includes:</p>
              <ul className="text-xs text-foreground/90 space-y-1 pl-4 list-disc">
                <li>Memories ({workspaceToDelete.stats?.memories || 0} items)</li>
                <li>Graph data ({workspaceToDelete.stats?.graphConnections || 0} links)</li>
                <li>Insights ({workspaceToDelete.stats?.insights || 0} insights)</li>
                <li>Recommendations</li>
                <li>Workspace settings</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="text-xs font-semibold px-4 py-2 hover:bg-secondary/40"
              >
                Cancel
              </Button>
              <Button
                onClick={submitDelete}
                disabled={isDeleting}
                className="text-xs font-semibold px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Moving...' : 'Move to Recycle Bin'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Confirmation Modal */}
      {showRenameModal && workspaceToRename && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-foreground">
            <h3 className="text-lg font-bold text-foreground">Rename Workspace</h3>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Workspace Name</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Enter workspace name"
                disabled={isRenaming}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename()
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRenameModal(false)}
                disabled={isRenaming}
                className="text-xs font-semibold px-4 py-2 hover:bg-secondary/40"
              >
                Cancel
              </Button>
              <Button
                onClick={submitRename}
                disabled={isRenaming || !renameValue.trim()}
                className="text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95"
              >
                {isRenaming ? 'Renaming...' : 'Rename'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
