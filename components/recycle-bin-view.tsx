'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { workspaces as workspaceApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Trash2, RotateCcw, ShieldAlert, CheckCircle, Info } from 'lucide-react'

export default function RecycleBinView() {
  const { workspaces, setWorkspaces, setCurrentWorkspace, currentWorkspace } = useStore()
  const [deletedWorkspaces, setDeletedWorkspaces] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastSub, setToastSub] = useState<string | null>(null)
  
  // Permanent Delete Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedWs, setSelectedWs] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load deleted workspaces
  const loadDeleted = async () => {
    setIsLoading(true)
    try {
      const res = await workspaceApi.list()
      const all = res.data || []
      const deleted = all.filter((w: any) => w.status === 'deleted')
      setDeletedWorkspaces(deleted)
      
      // Update global workspaces store too
      setWorkspaces(all)
    } catch (err) {
      console.error('Failed to fetch deleted workspaces:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDeleted()
  }, [])

  const triggerToast = (msg: string, sub?: string) => {
    setToastMessage(msg)
    setToastSub(sub || null)
    setTimeout(() => {
      setToastMessage(null)
      setToastSub(null)
    }, 5000)
  }

  const handleRestore = async (ws: any) => {
    try {
      await workspaceApi.restore(ws.id)
      
      // Sync list
      const res = await workspaceApi.list()
      const all = res.data || []
      setWorkspaces(all)
      setDeletedWorkspaces(all.filter((w: any) => w.status === 'deleted'))
      
      // Set restored workspace as active immediately
      const restored = all.find((w: any) => w.id === ws.id)
      if (restored) {
        setCurrentWorkspace(restored)
        localStorage.setItem('currentWorkspace', JSON.stringify(restored))
      }

      // Success notification
      const stats = ws.stats || { memories: 0, graphConnections: 0 }
      triggerToast(
        "Workspace restored successfully.",
        `${stats.memories} memories and ${stats.graphConnections} graph connections recovered.`
      )
    } catch (err) {
      console.error('Failed to restore workspace:', err)
    }
  }

  const triggerPermanentDelete = (ws: any) => {
    setSelectedWs(ws)
    setShowConfirmModal(true)
  }

  const handlePermanentDelete = async () => {
    if (!selectedWs) return
    setIsDeleting(true)
    try {
      await workspaceApi.permanentDelete(selectedWs.id)
      
      // Sync list
      const res = await workspaceApi.list()
      const all = res.data || []
      setWorkspaces(all)
      setDeletedWorkspaces(all.filter((w: any) => w.status === 'deleted'))
      
      triggerToast("Workspace permanently deleted.")
      setShowConfirmModal(false)
    } catch (err) {
      console.error('Failed to permanently delete workspace:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'recently'
    try {
      const date = new Date(isoString)
      const diff = Date.now() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      if (days === 0) return 'today'
      if (days === 1) return 'yesterday'
      return `${days} days ago`
    } catch {
      return 'recently'
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden text-foreground">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-card border-l-4 border-accent text-card-foreground p-4 rounded shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm">
          <CheckCircle className="text-accent shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-foreground">{toastMessage}</p>
            {toastSub && <p className="text-xs text-muted-foreground mt-0.5">{toastSub}</p>}
          </div>
        </div>
      )}

      {/* Main Recycle Bin View Container */}
      <div className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto space-y-6 overflow-y-auto">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
            <Trash2 className="text-accent" /> Recycle Bin
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Deleted workspaces and their accumulated knowledge can be recovered for up to 30 days.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Loading Recycle Bin database...</p>
          </div>
        ) : deletedWorkspaces.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-16 flex flex-col items-center justify-center text-center space-y-4 bg-secondary/10">
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center text-muted-foreground">
              <Trash2 size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No deleted workspaces.</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Deleted workspaces can be restored for up to 30 days. After that, they are automatically purged.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {deletedWorkspaces.map((ws) => (
              <div 
                key={ws.id} 
                className="bg-card border border-border/80 rounded-xl p-5 md:p-6 shadow-sm hover:border-border hover:shadow transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Details */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground truncate">{ws.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Deleted {formatDate(ws.deletedAt)}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                      <span className="text-red-400 font-semibold">{ws.daysRemaining ?? 30} days remaining</span>
                    </div>
                  </div>

                  {/* Recoverable stats cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-secondary/20 rounded-lg p-2.5 border border-border/30 text-center">
                      <p className="text-xs text-muted-foreground">Memories</p>
                      <p className="text-base font-bold text-foreground">{ws.stats?.memories ?? 0}</p>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-2.5 border border-border/30 text-center">
                      <p className="text-xs text-muted-foreground">Insights</p>
                      <p className="text-base font-bold text-foreground">{ws.stats?.insights ?? 0}</p>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-2.5 border border-border/30 text-center">
                      <p className="text-xs text-muted-foreground">Connections</p>
                      <p className="text-base font-bold text-foreground">{ws.stats?.graphConnections ?? 0}</p>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-2.5 border border-border/30 text-center">
                      <p className="text-xs text-muted-foreground">Suggestions</p>
                      <p className="text-base font-bold text-foreground">{ws.stats?.recommendations ?? 0}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    onClick={() => handleRestore(ws)}
                    className="flex items-center gap-1.5 px-4 py-2 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/95"
                  >
                    <RotateCcw size={14} />
                    Restore
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => triggerPermanentDelete(ws)}
                    className="flex items-center gap-1.5 px-4 py-2 font-semibold text-xs border-red-500/20 text-red-500 hover:bg-red-500/5 hover:border-red-500/30"
                  >
                    <Trash2 size={14} />
                    Delete Forever
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permanent Delete Modal Dialog */}
      {showConfirmModal && selectedWs && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200 text-foreground">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert size={28} className="shrink-0 animate-bounce" />
              <h3 className="text-lg font-extrabold">Permanently Delete Workspace?</h3>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              This action cannot be undone. The workspace <span className="font-semibold text-foreground">"{selectedWs.name}"</span> and all its associated:
            </p>
            
            <div className="bg-red-500/5 border border-red-500/20 p-3.5 rounded-lg text-xs space-y-1.5">
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li><span className="font-semibold text-foreground">{selectedWs.stats?.memories ?? 0} memories</span> from vault</li>
                <li><span className="font-semibold text-foreground">{selectedWs.stats?.insights ?? 0} insights</span> and patterns</li>
                <li><span className="font-semibold text-foreground">{selectedWs.stats?.graphConnections ?? 0} graph connections</span></li>
                <li>Recommendations and decision histories</li>
              </ul>
            </div>
            
            <p className="text-xs text-red-400 font-semibold italic">
              * Knowledge extraction from this workspace will be permanently erased.
            </p>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isDeleting}
                className="text-xs font-semibold px-4 py-2 hover:bg-secondary/40"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePermanentDelete}
                disabled={isDeleting}
                className="text-xs font-semibold px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Forever'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
