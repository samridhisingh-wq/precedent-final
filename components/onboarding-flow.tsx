'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { workspaces } from '@/lib/api'

export default function OnboardingFlow() {
  const [isInitializing, setIsInitializing] = useState(true)
  const { setWorkspaces, setCurrentWorkspace } = useStore()

  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        // 1. Fetch all workspaces from backend
        const response = await workspaces.list()
        const backendWorkspaces = response.data || []
        
        // Filter only active ones to determine current selection
        const activeWorkspaces = backendWorkspaces.filter((ws: any) => ws.status !== 'deleted')
        
        if (activeWorkspaces.length > 0) {
          // Sync workspaces lists
          setWorkspaces(backendWorkspaces)
          
          // Determine which workspace is selected (check local storage fallback preference)
          const storedWorkspace = localStorage.getItem('currentWorkspace')
          let selected = activeWorkspaces[0]
          if (storedWorkspace) {
            try {
              const current = JSON.parse(storedWorkspace)
              const matched = activeWorkspaces.find((ws: any) => ws.id === current.id)
              if (matched) selected = matched
            } catch (e) {
              console.error('Failed to parse stored workspace:', e)
            }
          }
          
          setCurrentWorkspace(selected)
          localStorage.setItem('currentWorkspace', JSON.stringify(selected))
          localStorage.setItem('workspaces', JSON.stringify(backendWorkspaces))
          setIsInitializing(false)
          return
        }
      } catch (err) {
        console.error('Failed to load workspaces from backend, falling back to local:', err)
      }

      // 2. If backend list is empty or fails, onboard a default workspace
      try {
        const response = await workspaces.create({
          name: 'My Decisions',
          description: 'Capturing and learning from every decision',
        })

        const workspace = response.data
        setWorkspaces([workspace])
        setCurrentWorkspace(workspace)
        localStorage.setItem('currentWorkspace', JSON.stringify(workspace))
        localStorage.setItem('workspaces', JSON.stringify([workspace]))
      } catch (error) {
        console.error('Failed to create workspace on backend:', error)
        // Memory fallback configuration
        const tempWorkspace = {
          id: 'ws_default',
          name: 'My Decisions',
          description: 'Capturing and learning from every decision',
          createdAt: new Date().toISOString(),
          status: 'active' as const,
          deletedAt: null
        }
        setWorkspaces([tempWorkspace])
        setCurrentWorkspace(tempWorkspace)
        localStorage.setItem('currentWorkspace', JSON.stringify(tempWorkspace))
        localStorage.setItem('workspaces', JSON.stringify([tempWorkspace]))
      } finally {
        setIsInitializing(false)
      }
    }

    initializeWorkspace()
  }, [setWorkspaces, setCurrentWorkspace])

  // Return null - the main page will automatically show the chat interface
  // once a workspace is created
  return null
}
