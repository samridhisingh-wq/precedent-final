// Use backend API (FastAPI backend at http://localhost:8000 or Railway URL)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

// Helper function for API calls using native fetch
async function apiCall(method: string, endpoint: string, data?: any) {
  // Backend endpoints are already under /api, so we just append endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  const url = endpoint.startsWith('http') ? cleanEndpoint : `${API_BASE}/api/${cleanEndpoint}`
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('[v0] API error response:', error)
      throw new Error(`API error ${response.status}`)
    }

    const jsonData = await response.json()
    return { data: jsonData }
  } catch (error: any) {
    console.error('[v0] API call failed:', error.message)
    throw error
  }
}

export const api = {
  post: (endpoint: string, data?: any) => apiCall('POST', endpoint, data),
  get: (endpoint: string) => apiCall('GET', endpoint),
  delete: (endpoint: string) => apiCall('DELETE', endpoint),
}

// ---------------------------------------------------------------------------
// Transform backend Entry → frontend Memory
// ---------------------------------------------------------------------------
export function entryToMemory(entry: any) {
  let type: 'decision' | 'goal' | 'reasoning' | 'outcome' | 'alternative' | 'environment' = 'decision'
  const backendType = entry.entry_type || ''
  if (backendType === 'goal' || backendType === 'plan') {
    type = 'goal'
  } else if (backendType === 'rejected_alternative' || backendType === 'alternative') {
    type = 'alternative'
  } else if (backendType === 'outcome') {
    type = 'outcome'
  } else if (backendType === 'reasoning') {
    type = 'reasoning'
  } else if (backendType === 'environment' || backendType === 'context') {
    type = 'environment'
  }

  const content = entry.content || 
    (entry.description ? `${entry.title}: ${entry.description}` : entry.title) || 
    'Unnamed memory'

  return {
    id: entry.entry_id || entry.id || `entry-${Date.now()}`,
    entryId: entry.entry_id || entry.id || `entry-${Date.now()}`,
    type,
    content,
    context: entry.reasoning || entry.metadata?.reasoning || undefined,
    createdAt: entry.created_at || entry.timestamp || new Date().toISOString(),
    tags: entry.tags || entry.metadata?.tags || [],
    linkedMemories: [],
  }
}

export function vaultToMemories(vaultResponse: any) {
  const entries = vaultResponse?.entries || []
  return entries.map(entryToMemory)
}

// ---------------------------------------------------------------------------
// Workspaces — keep same signature, map to /api/onboard
// ---------------------------------------------------------------------------
export const workspaces = {
  list: () => api.get('/workspaces').then(res => ({ data: res.data })),

  create: (data: any) =>
    api.post('/workspaces', {
      name: data.name,
      description: data.description || 'Capturing decisions',
    }).then(res => ({
      data: res.data,
    })),

  get: (id: string) =>
    api.get('/workspaces').then(res => {
      const list = res.data || []
      const found = list.find((ws: any) => ws.id === id)
      return { data: found || { id, name: 'My Workspace' } }
    }).catch(() => ({ data: { id, name: 'My Workspace' } })),

  update: (id: string, data: any) => Promise.resolve({ data }),

  rename: (id: string, name: string) =>
    api.post(`/workspaces/${id}/rename`, { name }).then(res => res.data),

  delete: (id: string) =>
    api.post(`/workspaces/${id}/delete`).then(res => res.data),

  restore: (id: string) =>
    api.post(`/workspaces/${id}/restore`).then(res => res.data),

  permanentDelete: (id: string) =>
    api.delete(`/workspaces/${id}/permanent`).then(res => res.data),
}

// ---------------------------------------------------------------------------
// Chat — sendMessage → /api/chat, getMessages → localStorage
// ---------------------------------------------------------------------------
export const chat = {
  sendMessage: (workspaceId: string, message: string, history?: any[]) => {
    const backendHistory = history ? history.map(msg => ({
      role: msg.role,
      content: msg.content
    })) : []
    return api.post('/chat', { message, history: backendHistory, workspace_id: workspaceId }).then(res => {
      const extractedMemories: any[] = []
      if (res.data && res.data.extracted_memory) {
        Object.entries(res.data.extracted_memory).forEach(([key, items]: [string, any]) => {
          if (Array.isArray(items)) {
            let type = key
            if (key === 'decisions') type = 'decision'
            else if (key === 'goals') type = 'goal'
            else if (key === 'outcomes') type = 'outcome'
            else if (key === 'reasoning') type = 'reasoning'
            else if (key === 'alternatives') type = 'alternative'
            else if (key === 'environments') type = 'environment'
            
            items.forEach(content => {
              extractedMemories.push({
                id: `mem-${Date.now()}-${Math.random()}`,
                type,
                content,
                createdAt: new Date().toISOString()
              })
            })
          }
        })
      }
      return {
        data: {
          message: res.data.message || res.data.reply || '',
          reply: res.data.message || res.data.reply || '',
          memories: extractedMemories,
          entry_id: res.data.entry_id || `entry-${Date.now()}`,
          preflight: null,
          popup_suggestion: res.data.popup_suggestion || null,
          pattern_insight: res.data.pattern_insight || null,
          candidates: res.data.candidates || null,
        }
      }
    }).catch(error => {
      console.error('[v0] Chat error:', error.message)
      throw error
    })
  },

  getMessages: (workspaceId: string) => {
    try {
      const stored = localStorage.getItem(`chat_${workspaceId}`)
      const messages = stored ? JSON.parse(stored) : []
      return Promise.resolve({ data: messages })
    } catch {
      return Promise.resolve({ data: [] })
    }
  },
}

// ---------------------------------------------------------------------------
// Memories — list → /api/vault, delete → /api/forget/{id}
// ---------------------------------------------------------------------------
export const memories = {
  list: (workspaceId: string, filters?: any) => {
    let url = `/vault?workspace_id=${workspaceId}`
    if (filters?.type) {
      url += `&type=${filters.type}`
    }
    return api.get(url).then(res => ({
      data: vaultToMemories(res.data)
    })).catch(error => {
      console.error('[v0] Vault error:', error.message)
      return { data: [] }
    })
  },

  get: (workspaceId: string, id: string) =>
    Promise.resolve({ data: null }),

  update: (workspaceId: string, id: string, data: any) =>
    Promise.resolve({ data }),

  delete: (workspaceId: string, id: string) =>
    api.delete(`/forget/${id}`).catch(error => {
      console.error('[v0] Delete error:', error.message)
      throw error
    }),

  commit: (workspaceId: string, memory: { entry_type: string; title: string; content: string }) =>
    api.post('/vault/commit', { ...memory, workspace_id: workspaceId }).then(res => res.data),

  link: (workspaceId: string, id1: string, id2: string) =>
    Promise.resolve({ data: null }),
}

// ---------------------------------------------------------------------------
// Graph — /api/graph-stats
// ---------------------------------------------------------------------------
export const graph = {
  getData: (workspaceId: string) =>
    api.get(`/graph-stats?workspace_id=${workspaceId}`).then(res => {
      const nodes = res.data.nodes || []
      const edges = res.data.edges || []
      
      return {
        data: {
          nodes,
          edges,
          clusters: res.data.clusters || 0,
          powered_by: res.data.powered_by,
        }
      }
    }).catch(error => {
      console.error('[v0] Graph error:', error.message)
      return { data: { nodes: [], edges: [], clusters: 0 } }
    }),
}

// ---------------------------------------------------------------------------
// Suggestions — preflight → /api/preflight
// ---------------------------------------------------------------------------
export const suggestions = {
  getPrecedents: (workspaceId: string, context: string) =>
    api.post('/preflight', { decision: context, workspace_id: workspaceId }).catch(error => {
      console.error('[v0] Preflight error:', error.message)
      return { data: { precedents: [] } }
    }),

  preFlightCheck: (workspaceId: string, decision: string) =>
    api.post('/preflight', { decision, workspace_id: workspaceId }).catch(error => {
      console.error('[v0] Preflight error:', error.message)
      return { 
        data: {
          status: 'clear',
          warnings: [],
          suggestions: [],
        }
      }
    }),
}

// ---------------------------------------------------------------------------
// Stats — /api/stats (bonus, used by dashboard)
// ---------------------------------------------------------------------------
export const stats = {
  get: (workspaceId: string) => api.get(`/stats?workspace_id=${workspaceId}`),
}
