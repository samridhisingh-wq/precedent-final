'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore, Message } from '@/lib/store'
import { chat } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'

export default function ChatInterface() {
  const { currentWorkspace, messages, addMessage, setMessages, addMemory, memoryApprovalMode } = useStore()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [popupSuggestion, setPopupSuggestion] = useState<any>(null)
  const [showSubPopup, setShowSubPopup] = useState(false)
  const [showInsightPopup, setShowInsightPopup] = useState(false)
  const [insightData, setInsightData] = useState<any>(null)
  const [showInsightConfirmPopup, setShowInsightConfirmPopup] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Load messages for current workspace
    if (currentWorkspace) {
      loadMessages()
    }
  }, [currentWorkspace])

  const loadMessages = async () => {
    if (!currentWorkspace) return
    try {
      const response = await chat.getMessages(currentWorkspace.id)
      const msgs = response.data || []
      if (msgs.length === 0) {
        const welcomeMessage: Message = {
          id: 'welcome-message',
          role: 'assistant',
          content: 'Hi! Would you like to tell me about yourself?',
          timestamp: new Date().toISOString(),
        }
        setMessages([welcomeMessage])
        localStorage.setItem(`chat_${currentWorkspace.id}`, JSON.stringify([welcomeMessage]))
      } else {
        setMessages(msgs)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !currentWorkspace) return

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    localStorage.setItem(`chat_${currentWorkspace.id}`, JSON.stringify(updatedMessages))
    setInput('')
    setIsLoading(true)

    try {
      const response = await chat.sendMessage(currentWorkspace.id, input, messages)
      
      const rawCandidates = response.data.candidates || []
      let reviewCandidates = [...rawCandidates]
      let autoSavedCandidates: any[] = []
      
      if (memoryApprovalMode === 'auto-save') {
        const factualTypes = ['decision', 'goal', 'outcome', 'environment']
        autoSavedCandidates = rawCandidates.filter((c: any) => factualTypes.includes(c.entry_type))
        reviewCandidates = rawCandidates.filter((c: any) => !factualTypes.includes(c.entry_type))
        
        // Auto-commit factual candidates
        if (autoSavedCandidates.length > 0) {
          const { memories: memoriesApi } = await import('@/lib/api')
          for (const candidate of autoSavedCandidates) {
            memoriesApi.commit(currentWorkspace.id, {
              entry_type: candidate.entry_type,
              title: candidate.title || `Factual ${candidate.entry_type}`,
              content: candidate.content
            }).catch(err => console.error('[v0] Failed to auto-commit candidate:', err))
            
            // Push to local store state reactively
            addMemory({
              id: `mem-${Date.now()}-${Math.random()}`,
              type: candidate.entry_type,
              content: candidate.content,
              createdAt: new Date().toISOString()
            })
          }
        }
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: response.data.message,
        extractedMemories: response.data.memories || [],
        candidates: reviewCandidates,
        autoSavedCandidates: autoSavedCandidates,
        approved: false,
        timestamp: new Date().toISOString(),
      }
      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)
      localStorage.setItem(`chat_${currentWorkspace.id}`, JSON.stringify(finalMessages))

      // Show suggestion popup if returned
      if (response.data.popup_suggestion) {
        setPopupSuggestion(response.data.popup_suggestion)
        setShowPopup(true)
      }

      // Show pattern/contradiction insight popup if returned
      if (response.data.pattern_insight) {
        setInsightData(response.data.pattern_insight)
        setShowInsightPopup(true)
      }

      // Update global memories store immediately for UI reactivity
      if (response.data.memories && response.data.memories.length > 0) {
        response.data.memories.forEach((mem: any) => {
          addMemory(mem)
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      }
      const errorMessages = [...updatedMessages, errorMessage]
      setMessages(errorMessages)
      localStorage.setItem(`chat_${currentWorkspace.id}`, JSON.stringify(errorMessages))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterInsight = async () => {
    if (!currentWorkspace || !insightData) return
    try {
      const memoryToCommit = insightData.memory_to_commit
      
      // Import memories module on demand
      const { memories: memoriesApi } = await import('@/lib/api')
      await memoriesApi.commit(currentWorkspace.id, memoryToCommit)
      
      // Update global reactive store
      addMemory({
        id: `mem-${Date.now()}`,
        entry_type: memoryToCommit.entry_type,
        title: memoryToCommit.title,
        content: memoryToCommit.content,
        timestamp: new Date().toISOString()
      })
      
      setShowInsightPopup(false)
      setShowInsightConfirmPopup(true)
    } catch (e) {
      console.error('Failed to commit insight memory:', e)
    }
  }

  const handleApproveCandidates = async (messageId: string, candidatesList: any[]) => {
    if (!currentWorkspace || !candidatesList || candidatesList.length === 0) return
    try {
      const { memories: memoriesApi } = await import('@/lib/api')
      for (const candidate of candidatesList) {
        await memoriesApi.commit(currentWorkspace.id, {
          entry_type: candidate.entry_type,
          title: candidate.title || `Candidate ${candidate.entry_type}`,
          content: candidate.content
        })
        
        // Push reactively to store
        addMemory({
          id: `mem-${Date.now()}-${Math.random()}`,
          type: candidate.entry_type,
          content: candidate.content,
          createdAt: new Date().toISOString()
        })
      }

      // Mark the message as approved in UI state
      const updated = messages.map(m => {
        if (m.id === messageId) {
          return { ...m, approved: true }
        }
        return m
      })
      setMessages(updated)
      localStorage.setItem(`chat_${currentWorkspace.id}`, JSON.stringify(updated))
    } catch (e) {
      console.error('Failed to approve candidates:', e)
    }
  }

  const handleMakeChangeCandidates = (messageId: string) => {
    const updated = messages.map(m => {
      if (m.id === messageId) {
        return { ...m, makeChangeClicked: true }
      }
      return m
    })
    setMessages(updated)
    localStorage.setItem(`chat_${currentWorkspace.id}`, JSON.stringify(updated))
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full h-full">
      {/* Header */}
      <div className="border-b border-border p-6">
        <h2 className="text-2xl font-bold text-foreground">
          {currentWorkspace?.name || 'Chat'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Share your decisions and let me learn from them
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-4xl">💭</div>
              <div>
                <h3 className="text-foreground font-semibold mb-2">
                  Start capturing decisions
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Tell me about a decision you&apos;re making, a challenge you&apos;re facing, or a lesson you&apos;ve learned.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md lg:max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'glass text-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  
                  {/* Small Temporary / Clean Auto-saved Indicator */}
                  {message.role === 'assistant' && message.autoSavedCandidates && message.autoSavedCandidates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in duration-300">
                      {message.autoSavedCandidates.map((candidate: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Saved to memory:</span>
                          <span className="font-semibold capitalize">{candidate.entry_type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Candidates Approval Box */}
                  {message.role === 'assistant' && message.candidates && message.candidates.length > 0 && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-primary">
                          🎯 Extracted Candidate Memories (Pending Review)
                        </p>
                        {message.approved && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-in fade-in duration-200">
                            ✓ Approved
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        {message.candidates.map((candidate: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded bg-white/5 border border-white/5 leading-relaxed"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-1 py-0.5 rounded bg-primary/20 text-primary border border-primary/10">
                                {candidate.entry_type}
                              </span>
                              <span className="font-semibold text-foreground/90 text-[11px]">
                                {candidate.title || `Candidate ${candidate.entry_type}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {candidate.content}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Control buttons */}
                      {!message.approved && (
                        <div className="pt-2 flex items-center gap-2">
                          {message.makeChangeClicked ? (
                            <p className="text-[10px] text-accent font-medium italic animate-pulse">
                              ✍️ Please type in your correction in the chat box...
                            </p>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveCandidates(message.id, message.candidates || [])}
                                className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMakeChangeCandidates(message.id)}
                                className="px-3 py-1 text-xs rounded border border-border bg-secondary/40 hover:bg-secondary/60 text-foreground font-semibold transition-all"
                              >
                                Make change
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-6">
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Expected Memories recommendation button */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] text-muted-foreground">Quick action:</span>
            <button
              type="button"
              onClick={() => {
                setInput("Give me the expected memories of our session till now")
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[11px] text-primary hover:text-foreground font-semibold transition-all duration-200"
            >
              🔮 View Expected Memories
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share a decision, challenge, or lesson learned..."
            className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (input.trim() && !isLoading) {
                  handleSendMessage(e)
                }
              }
            }}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Message
              </>
            )}
          </Button>
        </form>
      </div>
      {/* Suggestions Popup Card */}
      {showPopup && popupSuggestion && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-sm w-full p-6 rounded-xl border border-white/20 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
            
            <h3 className="text-lg font-bold text-foreground mb-2">💡 Quick Suggestion</h3>
            <p className="text-sm text-muted-foreground mb-6">{popupSuggestion.text}</p>
            
            <div className="flex gap-3">
              {/* Not Yet Button (Green) */}
              <button
                type="button"
                onClick={() => {
                  setShowPopup(false)
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg"
              >
                Not yet
              </button>
              
              {/* Been There, Done That Button (Red) */}
              <button
                type="button"
                onClick={() => {
                  setShowPopup(false)
                  setShowSubPopup(true)
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors shadow-lg"
              >
                Been there, done that
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub Confirmation Popup */}
      {showSubPopup && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-sm w-full p-6 rounded-xl border border-white/20 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSubPopup(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
            <div className="text-center py-4">
              <span className="text-3xl mb-3 block">👍</span>
              <p className="text-base text-foreground font-semibold">Ok, I have noted that.</p>
            </div>
          </div>
        </div>
      )}
      {/* Pattern/Contradiction Insight Popup Card */}
      {showInsightPopup && insightData && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-md w-full p-6 rounded-xl border border-white/20 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowInsightPopup(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors text-lg"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">💡</span>
              <h3 className="text-lg font-bold text-foreground capitalize">
                {insightData.type.replace('_', ' ')} Detected
              </h3>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed mb-6 font-medium">
              {insightData.text}
            </p>
            
            <div className="flex gap-3">
              {/* No, not yet, thank you Button */}
              <button
                type="button"
                onClick={() => setShowInsightPopup(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 text-foreground text-sm font-semibold transition-colors shadow-lg"
              >
                no,not yet, thank you
              </button>
              
              {/* Yes, register it to memory Button */}
              <button
                type="button"
                onClick={handleRegisterInsight}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white text-sm font-bold transition-all shadow-lg"
              >
                yes,register it to memory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insight Saved Sub-Confirmation Popup */}
      {showInsightConfirmPopup && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-sm w-full p-6 rounded-xl border border-white/20 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowInsightConfirmPopup(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
            <div className="text-center py-4">
              <span className="text-3xl mb-3 block">✅</span>
              <p className="text-base text-foreground font-semibold">Insight committed to memory graph!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
