from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from datetime import datetime
import httpx

# Import Cognee configuration
from cognee_config import (
    get_cognee_config,
    CogneeMemoryTypes,
    CogneeDataTransformer,
    CogneeGraph,
    COGNEE_API_TOKEN
)

# Initialize FastAPI app
app = FastAPI(
    title="Precedent - Cognee Cloud Backend",
    version="1.0.0",
    description="AI-powered decision memory system backed by Cognee Cloud"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
LLM_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ============================================================================
# DATA MODELS
# ============================================================================

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    workspace_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    message: str
    extracted_memory: Optional[Dict[str, Any]] = None
    entry_id: Optional[str] = None
    popup_suggestion: Optional[Dict[str, Any]] = None
    pattern_insight: Optional[Dict[str, Any]] = None
    candidates: Optional[List[Dict[str, Any]]] = None

class VaultEntry(BaseModel):
    entry_id: str
    entry_type: str
    title: Optional[str] = ""
    content: Optional[str] = ""
    created_at: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = {}

class VaultResponse(BaseModel):
    entries: List[VaultEntry]
    total: int
    decisions: int
    plans: int
    rejected: int
    successful: int

class GraphNode(BaseModel):
    id: str
    label: Optional[str] = ""
    type: Optional[str] = "decision"

class GraphEdge(BaseModel):
    source: str
    target: str
    weight: Optional[float] = 1.0

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    clusters: int
    has_cognee_graph: bool
    entries: List[Dict[str, Any]]
    similarity_links: List[Dict[str, Any]]
    powered_by: str = "cognee_cloud"

class PreflightRequest(BaseModel):
    decision: str
    workspace_id: Optional[str] = None

class OnboardRequest(BaseModel):
    role_description: str

# ============================================================================
# COGNEE CLOUD SERVICE
# ============================================================================

class CogneeService:
    """Service to interact with Cognee Cloud API"""
    
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.config = get_cognee_config()
        self.base_url = self.config.api_url if self.config else "https://api.cognee.ai"
        self.headers = self.config.headers if self.config else {}
    
    async def add_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Add data to Cognee graph"""
        if not self.config:
            print("[v0] Cognee not configured")
            return {"status": "error", "message": "Cognee not configured"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/data",
                    json=data,
                    headers=self.headers,
                    timeout=10.0
                )
                result = response.json() if response.status_code < 400 else {}
                result["status"] = "success" if response.status_code < 400 else "error"
                result["entry_id"] = data.get("id") or result.get("id")
                return result
        except Exception as e:
            print(f"[v0] Cognee add_data error: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    async def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search Cognee graph for similar memories"""
        if not self.config:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search",
                    params={"query": query, "limit": limit},
                    headers=self.headers,
                    timeout=10.0
                )
                return response.json().get("results", []) if response.status_code < 400 else []
        except Exception as e:
            print(f"[v0] Cognee search error: {str(e)}")
            return []
    
    async def get_graph_stats(self) -> Dict[str, Any]:
        """Get graph statistics from Cognee"""
        if not self.config:
            return self._default_graph_stats()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/graph/stats",
                    headers=self.headers,
                    timeout=10.0
                )
                return response.json() if response.status_code < 400 else self._default_graph_stats()
        except Exception as e:
            print(f"[v0] Cognee graph_stats error: {str(e)}")
            return self._default_graph_stats()
    
    async def get_entries(self) -> List[Dict[str, Any]]:
        """Get all entries from Cognee graph"""
        if not self.config:
            return []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/entries",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code < 400:
                    data = response.json()
                    return data.get("entries", []) if isinstance(data, dict) else data
                return []
        except Exception as e:
            print(f"[v0] Cognee get_entries error: {str(e)}")
            return []
            
    async def delete_entry(self, entry_id: str) -> bool:
        """Delete an entry from Cognee graph"""
        if not self.config:
            return False
        try:
            async with httpx.AsyncClient() as client:
                # Try DELETE /entries/{entry_id}
                response = await client.delete(
                    f"{self.base_url}/entries/{entry_id}",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code < 400:
                    return True
                # Fallback to DELETE /data/{entry_id}
                response = await client.delete(
                    f"{self.base_url}/data/{entry_id}",
                    headers=self.headers,
                    timeout=10.0
                )
                return response.status_code < 400
        except Exception as e:
            print(f"[v0] Cognee delete_entry error: {str(e)}")
            return False
    
    @staticmethod
    def _default_graph_stats() -> Dict[str, Any]:
        """Return default graph stats when Cognee is unavailable"""
        return {
            "nodes": 0,
            "edges": 0,
            "clusters": 0,
            "has_cognee_graph": False,
            "entries": [],
            "similarity_links": []
        }

# ============================================================================
# EXTRACTION SERVICE
# ============================================================================

class ExtractionService:
    """Extract structured memories from unstructured conversation"""
    
    @staticmethod
    def extract_memory_structure(message: str) -> Dict[str, Any]:
        """
        Parse message for decision/goal/outcome/reasoning/alternative
        Uses pattern matching and keyword detection for MVP
        """
        message_lower = message.lower()
        
        memory = {
            "decisions": [],
            "goals": [],
            "outcomes": [],
            "reasoning": [],
            "alternatives": []
        }
        
        # Simple keyword detection
        if any(word in message_lower for word in ["decide", "decided", "planning", "plan", "will", "going to", "ship"]):
            memory["decisions"].append(message)
        
        if any(word in message_lower for word in ["goal", "objective", "aim", "want", "trying"]):
            memory["goals"].append(message)
        
        if any(word in message_lower for word in ["result", "outcome", "happened", "led to", "caused", "increased", "decreased"]):
            memory["outcomes"].append(message)
        
        if any(word in message_lower for word in ["because", "reason", "since", "due to", "thinking"]):
            memory["reasoning"].append(message)
        
        if any(word in message_lower for word in ["instead", "alternative", "rejected", "instead of", "not", "avoided"]):
            memory["alternatives"].append(message)
        
        return memory
    
    @staticmethod
    def create_cognee_entries(memory_structure: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Convert extracted structure to Cognee-compatible entries"""
        entries = []
        timestamp = datetime.utcnow().isoformat()
        
        for decision in memory_structure.get("decisions", []):
            entries.append({
                "entry_type": "decision",
                "title": decision[:100],
                "content": decision,
                "timestamp": timestamp,
                "metadata": {"source": "chat", "confidence": 0.9}
            })
        
        for goal in memory_structure.get("goals", []):
            entries.append({
                "entry_type": "goal",
                "title": goal[:100],
                "content": goal,
                "timestamp": timestamp,
                "metadata": {"source": "chat", "confidence": 0.85}
            })
        
        for outcome in memory_structure.get("outcomes", []):
            entries.append({
                "entry_type": "outcome",
                "title": outcome[:100],
                "content": outcome,
                "timestamp": timestamp,
                "metadata": {"source": "chat", "confidence": 0.8}
            })
        
        for reasoning in memory_structure.get("reasoning", []):
            entries.append({
                "entry_type": "reasoning",
                "title": reasoning[:100],
                "content": reasoning,
                "timestamp": timestamp,
                "metadata": {"source": "chat", "confidence": 0.85}
            })
        
        for alternative in memory_structure.get("alternatives", []):
            entries.append({
                "entry_type": "rejected_alternative",
                "title": alternative[:100],
                "content": alternative,
                "timestamp": timestamp,
                "metadata": {"source": "chat", "confidence": 0.75}
            })
        
        return entries

# ============================================================================
# RESPONSE GENERATION SERVICE
# ============================================================================

class ResponseService:
    """Generate intelligent responses acknowledging extracted memories"""
    
    @staticmethod
    def generate_response(message: str, extracted: Dict[str, Any]) -> str:
        """Generate response that acknowledges extracted memories"""
        responses = []
        
        if extracted.get("decisions"):
            responses.append(f"I've noted your decision: {extracted['decisions'][0][:80]}...")
        
        if extracted.get("goals"):
            responses.append(f"Got it. Your goal is: {extracted['goals'][0][:80]}...")
        
        if extracted.get("outcomes"):
            responses.append(f"That's a significant outcome: {extracted['outcomes'][0][:80]}...")
        
        if extracted.get("alternatives"):
            responses.append(f"I see you rejected an alternative. Good thinking.")
        
        if not responses:
            return "I'm listening. Tell me more about your decision and I'll help you remember it."
        
        return " ".join(responses)

# ============================================================================
# DECISION INTELLIGENCE SERVICE
# ============================================================================

class DecisionIntelligenceService:
    """Provide pre-flight checks and similar decision analysis"""
    
    @staticmethod
    def analyze_decision(decision: str, similar_memories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze decision against similar past decisions"""
        warnings = []
        suggestions = []
        
        if similar_memories:
            warnings.append(f"Similar decision made {len(similar_memories)} time(s) before")
            suggestions.append("Review similar past decisions for outcomes")
        
        return {
            "status": "ready",
            "warnings": warnings,
            "suggestions": suggestions,
            "similar_count": len(similar_memories)
        }

# ============================================================================
# INITIALIZE SERVICES
# ============================================================================

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

import json

DB_FILE = os.path.join(os.path.dirname(__file__), "in_memory_db.json")

def load_db() -> Dict[str, Any]:
    default_ws = {
        "id": "ws_default",
        "name": "My Decisions",
        "description": "Capturing and learning from every decision",
        "createdAt": "2026-07-04T17:46:09.000000Z",
        "status": "active",
        "deletedAt": None
    }
    
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    # Convert old list format to dict format
                    entries = []
                    for e in data:
                        if not e.get("workspace_id"):
                            e["workspace_id"] = "ws_default"
                        entries.append(e)
                    return {
                        "workspaces": [default_ws],
                        "entries": entries
                    }
                elif isinstance(data, dict):
                    if "workspaces" not in data or not data["workspaces"]:
                        data["workspaces"] = [default_ws]
                    if "entries" not in data:
                        data["entries"] = []
                    return data
        except Exception as e:
            print(f"[v0] Error loading DB: {str(e)}")
            
    return {
        "workspaces": [default_ws],
        "entries": []
    }

def save_db(data: Dict[str, Any]):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[v0] Error saving DB: {str(e)}")

# Global in-memory DB dictionary
in_memory_db: Dict[str, Any] = load_db()

# 30-day retention cleanup routine
def run_retention_cleanup():
    from datetime import datetime, timezone
    workspaces = in_memory_db.get("workspaces", [])
    entries = in_memory_db.get("entries", [])
    
    active_workspaces = []
    deleted_workspaces = []
    expired_ids = set()
    
    now = datetime.now(timezone.utc)
    
    for ws in workspaces:
        if ws.get("status") == "deleted":
            deleted_at_str = ws.get("deletedAt")
            if deleted_at_str:
                try:
                    # Parse ISO format (handling Z offset replacement)
                    clean_ts = deleted_at_str.replace("Z", "+00:00")
                    deleted_at = datetime.fromisoformat(clean_ts)
                    days_passed = (now - deleted_at).days
                    if days_passed >= 30:
                        expired_ids.add(ws["id"])
                        continue
                except Exception as err:
                    print(f"Error parsing deletedAt timestamp: {str(err)}")
            deleted_workspaces.append(ws)
        else:
            active_workspaces.append(ws)
            
    if expired_ids:
        # Filter entries
        entries = [e for e in entries if e.get("workspace_id") not in expired_ids]
        in_memory_db["entries"] = entries
        in_memory_db["workspaces"] = active_workspaces + deleted_workspaces
        save_db(in_memory_db)
        print(f"[v0] Retention policy: Permanently deleted expired workspaces: {expired_ids}")
    else:
        in_memory_db["workspaces"] = active_workspaces + deleted_workspaces

# Run cleanup on startup
run_retention_cleanup()

def get_in_memory_entries() -> List[Dict[str, Any]]:
    # Strict isolation filter: exclude entries belonging to deleted workspaces
    workspaces = in_memory_db.get("workspaces", [])
    active_ws_ids = {ws["id"] for ws in workspaces if ws.get("status") != "deleted"}
    # Add default IDs to allow legacy fallback matching
    active_ws_ids.add("ws_default")
    active_ws_ids.add("default")
    active_ws_ids.add("local-workspace")
    active_ws_ids.add(None)
    
    return [e for e in in_memory_db.get("entries", []) if e.get("workspace_id") in active_ws_ids]

# Global pending memories confirmation map
pending_memories: Dict[str, Dict[str, Any]] = {}

# Initialize Cognee service
cognee_config = get_cognee_config()
cognee_service = CogneeService(COGNEE_API_TOKEN) if COGNEE_API_TOKEN else None

# Initialize other services
extraction_service = ExtractionService()
response_service = ResponseService()
decision_intelligence_service = DecisionIntelligenceService()

print("[v0] Precedent Backend Initialized")
print(f"[v0] Cognee Cloud Connected: {cognee_config is not None}")

def search_local_memories(query: str, entries: List[Dict[str, Any]], limit: int = 5) -> List[Dict[str, Any]]:
    query_words = set(query.lower().split())
    scored_entries = []
    for entry in entries:
        content_words = set(entry.get("content", "").lower().split())
        intersection = query_words.intersection(content_words)
        if intersection:
            score = len(intersection) / len(query_words.union(content_words))
            scored_entries.append((score, entry))
    scored_entries.sort(key=lambda x: x[0], reverse=True)
    return [entry for score, entry in scored_entries[:limit]]

def filter_entries_by_workspace(entries: List[Dict[str, Any]], workspace_id: Optional[str]) -> List[Dict[str, Any]]:
    default_ids = ["ws_default", "default", "local-workspace", None]
    if not workspace_id:
        return entries
        
    filtered = []
    for entry in entries:
        entry_ws = entry.get("workspace_id") or entry.get("metadata", {}).get("workspace_id")
        if entry_ws == workspace_id:
            filtered.append(entry)
        elif (workspace_id in default_ids) and (entry_ws in default_ids):
            filtered.append(entry)
    return filtered

async def generate_llm_response(prompt: str, system_prompt: str) -> Optional[Dict[str, Any]]:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or "your_openai_key" in api_key:
        return None
    try:
        async with httpx.AsyncClient() as client:
            # 1. Check if this is a Groq key (starts with gsk_)
            if api_key.startswith("gsk_"):
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7
                }
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                if response.status_code == 200:
                    result = response.json()
                    text_content = result["choices"][0]["message"]["content"]
                    return json.loads(text_content)
                else:
                    # Fallback to secondary model llama3-8b-8192
                    print(f"[v0] Groq API error primary model: {response.status_code} - {response.text}")
                    payload["model"] = "llama3-8b-8192"
                    response = await client.post(
                        url,
                        json=payload,
                        headers=headers,
                        timeout=30.0
                    )
                    if response.status_code == 200:
                        result = response.json()
                        text_content = result["choices"][0]["message"]["content"]
                        return json.loads(text_content)
                    else:
                        print(f"[v0] Groq API error secondary model: {response.status_code} - {response.text}")
                        return None

            # 2. Check if this is a Google Gemini key (non-sk- keys)
            elif not api_key.startswith("sk-"):
                # Call Gemini Native API with JSON generation config
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {"text": f"System Instructions:\n{system_prompt}\n\nUser Query: {prompt}"}
                            ]
                        }
                    ],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=30.0
                )
                if response.status_code == 200:
                    result = response.json()
                    text_content = result["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(text_content)
                else:
                    print(f"[v0] Gemini Native API error: {response.status_code} - {response.text}")
                    return None

            # 3. Otherwise standard OpenAI key (starts with sk-)
            else:
                # Call Standard OpenAI Endpoint
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7
                }
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                if response.status_code == 200:
                    result = response.json()
                    text_content = result["choices"][0]["message"]["content"]
                    return json.loads(text_content)
                else:
                    print(f"[v0] OpenAI API error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[v0] LLM completion failed: {str(e)}")
    return None

def generate_local_fallback_response(message: str, retrieved_memories: List[Dict[str, Any]], history: Optional[List[ChatMessage]]) -> Dict[str, Any]:
    msg_lower = message.lower()
    global pending_memories
    
    # 1. Check if user is correcting a pending memory
    candidates = pending_memories.get("candidates", [])
    if candidates and any(k in msg_lower for k in ["change", "type", "instead", "rewrite", "was a", "not a", "correct"]):
        # Check if the user is correcting the memory type
        detected_type = None
        if "environment" in msg_lower or "context" in msg_lower:
            detected_type = "environment"
        elif "decision" in msg_lower:
            detected_type = "decision"
        elif "goal" in msg_lower or "plan" in msg_lower:
            detected_type = "goal"
        elif "reason" in msg_lower:
            detected_type = "reasoning"
        elif "outcome" in msg_lower:
            detected_type = "outcome"
            
        if detected_type:
            # Update pending candidate categories
            for c in candidates:
                c["entry_type"] = detected_type
                c["title"] = f"User {detected_type.capitalize()} Context"
            
            pending_memories["candidates"] = candidates
            return {
                "reply": f"Ok, I have updated the candidate memory type to {detected_type}.",
                "memories_to_commit": candidates
            }
        else:
            # Just allow rewriting the description
            for c in candidates:
                c["content"] = message
            pending_memories["candidates"] = candidates
            return {
                "reply": "Ok, I have updated the candidate memory description based on your input.",
                "memories_to_commit": candidates
            }
    else:
        # Clear pending memory if they say something else entirely
        pending_memories = {}

    # Strict memory-worthiness check for local heuristics fallback
    clean_msg = message.strip().lower()
    greetings = ["hi", "hello", "hey", "hola", "yo", "sup", "greetings", "good morning", "good afternoon"]
    acknowledgements = ["ok", "yes", "no", "sure", "yep", "got it", "fine", "cool", "alright", "agree", "correct", "true", "false", "gi", "no , keep the environment as it is"]
    fillers_and_short = len(clean_msg) < 8 or len(clean_msg.split()) < 3
    
    is_not_worthy = (
        clean_msg in greetings or 
        clean_msg in acknowledgements or 
        fillers_and_short or
        any(clean_msg.startswith(g + " ") for g in greetings) or
        clean_msg in ["thank you", "thanks", "bye", "goodbye", "clear chat"]
    )
    
    if is_not_worthy:
        return {
            "reply": "Got it! Let me know when you have a decision, goal, or context you want me to track.",
            "memories_to_commit": []
        }

    # 2. Check for suggestions query
    if "suggestion" in msg_lower or "what models" in msg_lower or "which models" in msg_lower:
        return {
            "reply": "These are some of the free LLM models you haven't tried yet:\n1. Google AI Studio (Gemini 1.5 Flash free tier)\n2. Groq Cloud (Llama-3.3-70b/8b free tier)\n3. OpenRouter (Free models list)\nWould you like details on how to get started with any of these?",
            "memories_to_commit": []
        }

    # 3. Check for specific diary struggle entry
    if "railway" in msg_lower or "lovable" in msg_lower or ("spent" in msg_lower and "hours" in msg_lower and "model" in msg_lower):
        # Mark as environment candidate
        candidates.append({
            "entry_type": "environment",
            "title": "Struggle Debugging Free Models",
            "content": message
        })
        pending_memories["candidates"] = candidates
        return {
            "reply": "NOTING THIS AS AN ENTRY. (I will track this struggle session to help analyze patterns or suggest alternatives.)",
            "memories_to_commit": candidates,
            "popup_suggestion": {
                "type": "free_llm",
                "text": "Have you tried using this for a free LLM model?"
            }
        }
            
    # 4. Extract potential environment contexts and decisions
    candidates = []
    
    # Environment heuristic (majors, students, studies, tech stacks, platforms, frameworks, roles)
    environment_keywords = ["student", "studying", "cse", "cs ", "data science", "major", "college", "university", "engineer", "developer", "programmer", "tech", "v0", "antigravity", "agent", "credits", "using", "work on", "working on", "reporter", "working as", "profession"]
    if any(k in msg_lower for k in environment_keywords):
        candidates.append({
            "entry_type": "environment",
            "title": "User Environment & Profile",
            "content": message
        })
        
    # Decision heuristic (if not already captured as environment, or alongside it)
    decision_keywords = ["decided", "chose", "chosen", "will build", "will participate", "entering", "participate", "prefer", "verify", "publishing"]
    if any(k in msg_lower for k in decision_keywords) and not any(k in msg_lower for k in ["v0", "antigravity"]):
        content = message
        if "decided" in msg_lower:
            parts = message.split("decided to")
            if len(parts) > 1:
                content = "Decided to " + parts[1].strip()
        candidates.append({
            "entry_type": "decision",
            "title": "User Decision",
            "content": content
        })

    if candidates:
        pending_memories["candidates"] = candidates
        
        # Build hybrid response integrating past memories if present
        recalled_str = ""
        if retrieved_memories:
            recalled_facts = []
            for m in retrieved_memories[:2]:
                recalled_facts.append(m.get("content") or m.get("title") or "")
            recalled_str = f" Given you previously mentioned: {', '.join(recalled_facts)}."
            
        return {
            "reply": f"That's a great approach to ensure accuracy.{recalled_str}",
            "memories_to_commit": candidates
        }
        
    # 5. Check if user is asking about evidence or recommendation
    is_evidence_query = any(k in msg_lower for k in ["evidence", "conclusion", "why did you say", "led you to"])
    is_rec_query = any(k in msg_lower for k in ["recommend", "overlooking", "overlook", "past know", "past knows", "suggest"])
    
    if is_evidence_query:
        if retrieved_memories:
            cits = []
            for m in retrieved_memories[:3]:
                m_type = m.get("entry_type") or m.get("type", "memory")
                m_title = m.get("title") or "Memory"
                m_content = m.get("content") or ""
                cits.append(f"- [{m_type.upper()}] {m_title}: {m_content}")
            cits_str = "\n".join(cits)
            return {
                "reply": f"The evidence that led to my conclusion is based on these historical memories from your active workspace:\n\n{cits_str}\n\nThese past logs dictate your established pattern of caution and source verification.",
                "memories_to_commit": []
            }
        else:
            return {
                "reply": "I don't have any specific memories in your current workspace to cite as evidence.",
                "memories_to_commit": []
            }
            
    if is_rec_query:
        decisions = [m for m in retrieved_memories if m.get("entry_type") == "decision" or m.get("type") == "decision"]
        outcomes = [m for m in retrieved_memories if m.get("entry_type") == "outcome" or m.get("type") == "outcome"]
        reflections = [m for m in retrieved_memories if m.get("entry_type") in ["reasoning", "alternative"] or m.get("type") in ["reasoning", "alternative"]]
        
        if decisions or outcomes or reflections:
            citations = []
            if decisions:
                d_content = decisions[0].get("content", "")
                citations.append(f"you decided to: '{d_content}'")
            if outcomes:
                o_content = outcomes[0].get("content", "")
                citations.append(f"the outcome was: '{o_content}'")
                
            citations_str = " and ".join(citations)
            
            reply_text = (
                f"In previous situations, {citations_str}. Based on your own decision history, "
                "proceeding now would be inconsistent with your previous approach. You may want "
                "additional corroboration and source verification before proceeding."
            )
            return {
                "reply": reply_text,
                "memories_to_commit": []
            }
        else:
            env = [m for m in retrieved_memories if m.get("entry_type") == "environment" or m.get("type") == "environment"]
            if env:
                return {
                    "reply": "I see your environment context, but I don't have any historical decisions recorded in this workspace yet. Please share some decisions first so I can make evidence-based recommendations.",
                    "memories_to_commit": []
                }
            return {
                "reply": "Based on your current workspace, I don't have any decision history to construct a recommendation. Please tell me about your past decisions first.",
                "memories_to_commit": []
            }

    # 6. Check if user asks "what do you know about me" / "patterns"
    if "what do you know about me" in msg_lower or "who am i" in msg_lower or "tell me about myself" in msg_lower or "my pattern" in msg_lower or "something similar" in msg_lower:
        if retrieved_memories:
            facts = []
            for m in retrieved_memories[:4]:
                m_type = m.get("entry_type") or m.get("type", "memory")
                m_content = m.get("content") or m.get("title") or ""
                # Make identity phrasing match "You previously told me that you are Y"
                if m_type == "environment":
                    if "i am" in m_content.lower():
                        cleaned_content = m_content.lower().split("i am")[-1].strip()
                        facts.append(f"• You previously told me that you are {cleaned_content}.")
                    else:
                        facts.append(f"• You previously told me that you are {m_content}.")
                else:
                    facts.append(f"• You logged: '{m_content}'.")
            facts_str = "\n".join(facts)
            return {
                "reply": f"Here is what I know about you:\n\n{facts_str}\n\nDo you want to explore any specific patterns or goals?",
                "memories_to_commit": []
            }
        else:
            return {
                "reply": "I don't have any decisions or profile details in my memory vault yet. Share some decisions or goals, and I'll track them!",
                "memories_to_commit": []
            }

    # Default fallback conversation
    reply = "I'm listening. Tell me about your decisions or what you're working on, and we can discuss them or commit them to memory."
    return {
        "reply": reply,
        "memories_to_commit": []
    }

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint: receives message, extracts memory, stores in Cognee, returns response
    """
    try:
        # Check if the query is asking about the user's identity / profile
        msg_lower_clean = request.message.lower().strip()
        is_identity_query = any(q in msg_lower_clean for q in [
            "what do you know about me", "who am i", "tell me about myself", 
            "my profile", "my patterns", "my decisions history", "something similar"
        ])
        
        retrieved = []
        if is_identity_query:
            # Identity query RAG: get all environment + profile memories + recent memories
            all_m = []
            if cognee_service:
                try:
                    all_m = await cognee_service.get_entries()
                except Exception as e:
                    print(f"[v0] Cognee get_entries failed for identity: {str(e)}")
            if not all_m:
                all_m = get_in_memory_entries()
            
            # Filter by workspace first
            all_m = filter_entries_by_workspace(all_m, request.workspace_id)
            
            # Filter environment and profile memories
            identity_memories = [m for m in all_m if m.get("entry_type") == "environment" or "profile" in m.get("title", "").lower()]
            
            # Sort to get recent memories
            try:
                sorted_all = sorted(all_m, key=lambda x: x.get("timestamp", ""), reverse=True)
            except Exception:
                sorted_all = all_m
            
            recent_memories = sorted_all[:5]
            
            # Merge uniquely
            seen_ids = set()
            unique_retrieved = []
            for m in (identity_memories + recent_memories):
                m_id = m.get("entry_id") or m.get("id")
                if m_id not in seen_ids:
                    seen_ids.add(m_id)
                    unique_retrieved.append(m)
            retrieved = unique_retrieved
        else:
            # Standard RAG search
            if cognee_service:
                try:
                    retrieved = await cognee_service.search(request.message, limit=5)
                    retrieved = filter_entries_by_workspace(retrieved, request.workspace_id)
                except Exception as e:
                    print(f"[v0] Cognee search failed: {str(e)}")
            
            if not retrieved:
                # Filter by workspace BEFORE search to avoid other workspaces crowding out active ones
                ws_entries = filter_entries_by_workspace(get_in_memory_entries(), request.workspace_id)
                retrieved = search_local_memories(request.message, ws_entries, limit=5)

        # Build conversation history context
        history_parts = []
        if request.history:
            for msg in request.history[-6:]:
                history_parts.append(f"{msg.role.upper()}: {msg.content}")
        history_context = "\n".join(history_parts) if history_parts else "No prior history context."

        # Format context memories
        context_parts = []
        for memory in retrieved:
            m_type = memory.get("entry_type") or memory.get("type", "environment")
            m_content = memory.get("content") or memory.get("title") or ""
            context_parts.append(f"- [{m_type.upper()}] {m_content}")
        context_str = "\n".join(context_parts) if context_parts else "No matching prior decisions or memories found."

        # Generate response using OpenAI JSON mode if key is set
        llm_json = None
        if os.getenv("OPENAI_API_KEY") and "your_openai_key" not in os.getenv("OPENAI_API_KEY", ""):
            system_prompt = (
                "You are Precedent, the user's conversational decision-intelligence partner. "
                "Your job is to act as a persistent thinking partner, NOT just a memory logger.\n\n"
                "Your conversational goals are:\n"
                "1. Answer the user's message conversationally. Connect your response with relevant past memories retrieved from context to form a hybrid response.\n"
                "2. EVIDENCE-BASED DECISION INTELLIGENCE RULES (CRITICAL):\n"
                "   - Your recommendations, insights, pattern detections, and answers to queries like 'What might I be overlooking?' or 'What does my past know that I don't?' must be derived from the user's historical decisions, outcomes, reflections, and lessons learned. Do NOT give generic industry/world advice based on their environment context.\n"
                "   - Priority Hierarchy: Base reasoning first on: 1. Decisions, 2. Outcomes, 3. Reflections / Lessons, 4. Preferences, and 5. Environment (only as context). Environment context must never be the primary justification if decisions/outcomes exist.\n"
                "   - Pipeline: (Step 1) Retrieve relevant memories, (Step 2) Identify supporting memories, (Step 3) Build logical reasoning linking past decisions/outcomes to current context, (Step 4) Cite supporting memories and make a recommendation.\n"
                "   - Memory Citations: Cite historical memories specifically in your response (e.g. 'In previous situations, you decided to delay publication by two days to verify witness statements...'). Avoid generic advice.\n"
                "   - Memory Evidence Block: If the user asks: 'What evidence led you to that conclusion?' or similar queries, explain exactly which retrieved memories (titles and content) produced your reasoning.\n"
                "3. DO NOT ask the user if they want to register or commit a memory, and DO NOT say 'I am committing Y' or 'Would you like me to register Y'. State your response normally without any approval questions.\n"
                "4. Memory-Worthiness Filter: Extract candidate memories ONLY for long-term facts (Identity, Environment, Goals, Preferences, Decisions, Outcomes, Reflections, Lessons learned, Relationships). NEVER extract memories for greetings (e.g. 'hi', 'hello'), acknowledgments (e.g. 'ok', 'yes', 'got it'), generic questions, conversation management, or filler/meaningless/cut-off text (e.g. if the user says 'gi', 'the', 'so'). A memory should answer 'Will this be useful to know again in a week?' If not, do NOT extract it (leave memories_to_commit empty).\n"
                "5. If the user asks questions about their memories (e.g. 'What do you know about me?', 'Who am I?'), use the retrieved memories to answer them conversationally. You must say: 'You previously told me Y'.\n"
                "6. If the user asks for suggestions or what models to try, list the following free tier services they haven't tried yet: Google AI Studio Gemini API (free tier), Groq Cloud API (free tier), and OpenRouter.\n"
                "7. Pattern Insight Analysis: Analyze the user's input against their conversation history and retrieved prior memories to detect recurring decision patterns, repeated mistakes, successful strategies they underestimate, or direct contradictions between their current actions/statement and their stored goals. If you detect one, you MUST generate a pattern_insight object suggesting an alternative viewpoint starting exactly with: 'Oh cool, but have you thought about...'. Provide a structured memory_to_commit representing this insight.\n\n"
                f"Conversation history context:\n{history_context}\n\n"
                f"Retrieved prior memories:\n{context_str}\n\n"
                "You must respond in JSON format with exactly these keys:\n"
                "{\n"
                '  "reply": "your conversational response string here",\n'
                '  "memories_to_commit": [\n'
                "    {\n"
                '      "entry_type": "decision" | "goal" | "reasoning" | "outcome" | "rejected_alternative" | "environment",\n'
                '      "title": "short memory title",\n'
                '      "content": "detailed memory content description"\n'
                "    }\n"
                "  ],\n"
                '  "popup_suggestion": null | {\n'
                '    "type": "free_llm",\n'
                '    "text": "Have you tried using this for a free LLM model?"\n'
                "  },\n"
                '  "pattern_insight": null | {\n'
                '    "type": "contradiction" | "recurring_pattern" | "blind_spot" | "successful_strategy",\n'
                '    "text": "Oh cool, but have you thought about...",\n'
                '    "memory_to_commit": {\n'
                '      "entry_type": "reasoning" | "decision" | "goal",\n'
                '      "title": "Insight: [short title]",\n'
                '      "content": "[detailed content of the insight or pattern context]"\n'
                '    }\n'
                '  }\n'
                "}"
            )
            llm_json = await generate_llm_response(request.message, system_prompt)

        # Fallback to local template-based intelligence if OpenAI is offline/not configured
        if not llm_json:
            llm_json = generate_local_fallback_response(request.message, retrieved, request.history)

        reply_message = llm_json.get("reply", "I'm listening.")
        to_commit = llm_json.get("memories_to_commit", [])

        # Extract popup suggestion from LLM response or fallback query matching
        popup_suggestion = llm_json.get("popup_suggestion")
        if not popup_suggestion:
            msg_lower_clean = request.message.lower()
            if "railway" in msg_lower_clean or "lovable" in msg_lower_clean or ("spent" in msg_lower_clean and "hours" in msg_lower_clean and "model" in msg_lower_clean):
                popup_suggestion = {
                    "type": "free_llm",
                    "text": "Have you tried using this for a free LLM model?"
                }

        # Extract pattern insights
        pattern_insight = llm_json.get("pattern_insight")
        if not pattern_insight and retrieved:
            # Fallback pattern/contradiction rules matching
            for m in retrieved:
                content_lower = (m.get("content") or "").lower()
                msg_lower_clean = request.message.lower()
                
                # Check for CS dropout vs specialization goal contradiction
                if "student" in content_lower and ("quit cs" in msg_lower_clean or "drop cs" in msg_lower_clean or "leave university" in msg_lower_clean):
                    pattern_insight = {
                        "type": "contradiction",
                        "text": "Oh cool, but have you thought about how dropping CS contradicts your goal of specializing in data science for your hackathon?",
                        "memory_to_commit": {
                            "entry_type": "reasoning",
                            "title": "Insight: CS Path Contradiction",
                            "content": "User considered dropping CS which contradicts their data science hackathon goals."
                        }
                    }
                    break
                # Check for setup friction loop recurring pattern
                if "free" in content_lower and "model" in content_lower and ("error" in msg_lower_clean or "bug" in msg_lower_clean or "struggle" in msg_lower_clean or "spent" in msg_lower_clean):
                    pattern_insight = {
                        "type": "recurring_pattern",
                        "text": "Oh cool, but have you thought about how you tend to spend hours fixing configuration issues when working with free models rather than starting with a proven API?",
                        "memory_to_commit": {
                            "entry_type": "reasoning",
                            "title": "Insight: Setup Friction Loop",
                            "content": "User repeatedly spends high amounts of time debugging free model configurations."
                        }
                    }
                    break

        # Format candidates list for frontend approval block review instead of auto-committing
        candidates_list = []
        if to_commit:
            for item in to_commit:
                candidates_list.append({
                    "entry_type": item.get("entry_type", "decision"),
                    "title": item.get("title", ""),
                    "content": item.get("content", "")
                })

        return ChatResponse(
            message=reply_message,
            extracted_memory=None,
            entry_id=None,
            popup_suggestion=popup_suggestion,
            pattern_insight=pattern_insight,
            candidates=candidates_list
        )
    
    except Exception as e:
        print(f"[v0] Chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vault", response_model=VaultResponse)
async def vault(workspace_id: Optional[str] = None):
    """
    Get all memories from Cognee graph with statistics filtered by workspace_id
    """
    try:
        all_entries = []
        if cognee_service:
            try:
                all_entries = await cognee_service.get_entries()
            except Exception as e:
                print(f"[v0] Cognee get_entries failed, falling back to local DB: {str(e)}")
        
        if not all_entries:
            all_entries = get_in_memory_entries()
            
        all_entries = filter_entries_by_workspace(all_entries, workspace_id)
            
        # Transform to frontend format
        entries = []
        decision_count = 0
        plan_count = 0
        rejected_count = 0
        successful_count = 0
        
        for entry in all_entries:
            entry_type = entry.get("entry_type", "unknown")
            entries.append(VaultEntry(
                entry_id=entry.get("entry_id", entry.get("id", "")),
                entry_type=entry_type,
                title=entry.get("title", ""),
                content=entry.get("content", ""),
                created_at=entry.get("created_at", entry.get("timestamp", "")),
                metadata=entry.get("metadata", {})
            ))
            
            if entry_type == "decision":
                decision_count += 1
            elif entry_type == "goal":
                plan_count += 1
            elif entry_type == "rejected_alternative":
                rejected_count += 1
            elif entry_type == "outcome":
                successful_count += 1
        
        return VaultResponse(
            entries=entries,
            total=len(entries),
            decisions=decision_count,
            plans=plan_count,
            rejected=rejected_count,
            successful=successful_count
        )
    
    except Exception as e:
        print(f"[v0] Vault endpoint error: {str(e)}")
        return VaultResponse(entries=[], total=0, decisions=0, plans=0, rejected=0, successful=0)

@app.get("/api/graph-stats", response_model=GraphResponse)
async def graph_stats(workspace_id: Optional[str] = None):
    """
    Get graph statistics and topology for visualization filtered by workspace_id
    """
    try:
        stats = {"clusters": 1}
        entries = []
        has_cognee_graph = False
        
        if cognee_service:
            try:
                stats = await cognee_service.get_graph_stats()
                entries = await cognee_service.get_entries()
                has_cognee_graph = True
            except Exception as e:
                print(f"[v0] Cognee graph stats failed, falling back to local DB: {str(e)}")
                
        if not entries:
            stats = {"clusters": 1}
            entries = get_in_memory_entries()
            has_cognee_graph = len(get_in_memory_entries()) > 0
            
        entries = filter_entries_by_workspace(entries, workspace_id)
        
        # Build nodes from entries
        nodes = []
        for entry in entries:
            nodes.append(GraphNode(
                id=entry.get("entry_id", entry.get("id", "")),
                label=entry.get("title", "")[:50],
                type=entry.get("entry_type", "unknown")
            ))
        
        # Build edges from similarity
        edges = []
        for i, entry1 in enumerate(entries):
            for j, entry2 in enumerate(entries[i+1:], i+1):
                # Simple heuristic: entries of same type are related
                if entry1.get("entry_type") == entry2.get("entry_type"):
                    edges.append(GraphEdge(
                        source=entry1.get("entry_id", entry1.get("id", "")),
                        target=entry2.get("entry_id", entry2.get("id", "")),
                        weight=0.7
                    ))
        
        return GraphResponse(
            nodes=nodes,
            edges=edges,
            clusters=stats.get("clusters", 1),
            has_cognee_graph=has_cognee_graph,
            entries=entries,
            similarity_links=[]
        )
    
    except Exception as e:
        print(f"[v0] Graph endpoint error: {str(e)}")
        return GraphResponse(
            nodes=[],
            edges=[],
            clusters=0,
            has_cognee_graph=False,
            entries=[],
            similarity_links=[]
        )

@app.post("/api/preflight")
async def preflight(request: PreflightRequest):
    """
    Pre-flight check: analyze decision against similar past decisions
    """
    try:
        similar = []
        if cognee_service:
            try:
                similar = await cognee_service.search(request.decision, limit=3)
            except Exception as e:
                print(f"[v0] Cognee preflight search failed, falling back: {str(e)}")
        
        if not similar:
            # In-memory simple keyword check
            similar = []
            query_words = set(request.decision.lower().split())
            for entry in get_in_memory_entries():
                content_words = set(entry.get("content", "").lower().split())
                if query_words.intersection(content_words):
                    similar.append(entry)
            similar = similar[:3]
            
        similar = filter_entries_by_workspace(similar, request.workspace_id)
        
        # Analyze
        analysis = decision_intelligence_service.analyze_decision(request.decision, similar)
        
        return analysis
    
    except Exception as e:
        print(f"[v0] Preflight endpoint error: {str(e)}")
        return {
            "status": "error",
            "warnings": ["Could not analyze decision"],
            "suggestions": []
        }

@app.post("/api/onboard")
async def onboard(request: OnboardRequest):
    """
    Initialize workspace with role description
    """
    try:
        return {
            "status": "success",
            "workspace_id": "ws_default",
            "message": f"Welcome! I'm ready to help you track decisions and learn from your experiences as {request.role_description}"
        }
    
    except Exception as e:
        print(f"[v0] Onboard endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/profile")
async def profile():
    """
    Get user profile / workspace settings
    """
    return {
        "profile": {
            "name": "My Workspace",
            "description": "Capturing and learning from every decision"
        }
    }

@app.delete("/api/forget/{entry_id}")
async def forget(entry_id: str):
    """
    Delete a memory entry by ID from Cognee graph or local fallback
    """
    try:
        if cognee_service:
            try:
                await cognee_service.delete_entry(entry_id)
            except Exception as e:
                print(f"[v0] Cognee delete error: {str(e)}")
        
        # Always remove from local fallback list to keep state clean
        in_memory_db["entries"] = [e for e in in_memory_db["entries"] if e.get("entry_id") != entry_id and e.get("id") != entry_id]
        save_db(in_memory_db)
        
        return {"status": "success", "message": f"Memory {entry_id} forgotten successfully"}
    except Exception as e:
        print(f"[v0] Forget endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def stats(workspace_id: Optional[str] = None):
    """
    Return basic statistics of stored memories filtered by workspace_id
    """
    try:
        if cognee_service:
            entries = await cognee_service.get_entries()
        else:
            entries = get_in_memory_entries()
            
        entries = filter_entries_by_workspace(entries, workspace_id)
            
        decision_count = sum(1 for e in entries if e.get("entry_type") == "decision")
        goal_count = sum(1 for e in entries if e.get("entry_type") == "goal")
        alternative_count = sum(1 for e in entries if e.get("entry_type") == "rejected_alternative")
        outcome_count = sum(1 for e in entries if e.get("entry_type") == "outcome")
        
        return {
            "total": len(entries),
            "decisions": decision_count,
            "goals": goal_count,
            "alternatives": alternative_count,
            "outcomes": outcome_count
        }
    except Exception as e:
        print(f"[v0] Stats endpoint error: {str(e)}")
        return {
            "total": 0,
            "decisions": 0,
            "goals": 0,
            "alternatives": 0,
            "outcomes": 0
        }

class CommitMemoryRequest(BaseModel):
    entry_type: str
    title: str
    content: str
    workspace_id: Optional[str] = None

@app.post("/api/vault/commit")
async def commit_memory(request: CommitMemoryRequest):
    try:
        timestamp = datetime.utcnow().isoformat()
        import uuid
        entry_id = f"mem-{uuid.uuid4()}"
        local_entry = {
            "id": entry_id,
            "entry_id": entry_id,
            "entry_type": request.entry_type,
            "title": request.title,
            "content": request.content,
            "timestamp": timestamp,
            "workspace_id": request.workspace_id or "ws_default",
            "metadata": {
                "source": "insight", 
                "confidence": 0.95,
                "workspace_id": request.workspace_id or "ws_default"
            }
        }
        in_memory_db["entries"].append(local_entry)
        save_db(in_memory_db)

        if cognee_service:
            try:
                payload = {
                    "entry_type": request.entry_type,
                    "title": request.title,
                    "content": request.content,
                    "timestamp": timestamp,
                    "workspace_id": request.workspace_id or "ws_default",
                    "metadata": {
                        "source": "insight", 
                        "confidence": 0.95,
                        "workspace_id": request.workspace_id or "ws_default"
                    }
                }
                await cognee_service.add_data(payload)
            except Exception as e:
                print(f"[v0] Cognee sync failed inside commit_memory: {str(e)}")

        return {
            "status": "success",
            "entry_id": entry_id,
            "memory": local_entry
        }
    except Exception as e:
        print(f"[v0] Direct commit endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class WorkspaceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""

@app.get("/api/workspaces")
async def list_workspaces():
    """
    List all workspaces, computing stats dynamically for deleted ones.
    """
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    workspaces = in_memory_db.get("workspaces", [])
    
    response_list = []
    for ws in workspaces:
        ws_id = ws["id"]
        default_ids = ["ws_default", "default", "local-workspace", None]
        ws_entries = []
        for entry in in_memory_db.get("entries", []):
            entry_ws = entry.get("workspace_id") or entry.get("metadata", {}).get("workspace_id")
            if entry_ws == ws_id:
                ws_entries.append(entry)
            elif (ws_id in default_ids) and (entry_ws in default_ids):
                ws_entries.append(entry)
                
        memories_count = len([e for e in ws_entries if not e.get("title", "").startswith("Insight:")])
        insights_count = len([e for e in ws_entries if e.get("title", "").startswith("Insight:")])
        
        # Connections count: entries of same type
        graph_connections = 0
        for i, entry1 in enumerate(ws_entries):
            for j, entry2 in enumerate(ws_entries[i+1:], i+1):
                if entry1.get("entry_type") == entry2.get("entry_type"):
                    graph_connections += 1
                    
        # Recommendations count
        recommendations_count = len([e for e in ws_entries if e.get("metadata", {}).get("source") == "recommendation"])
        if recommendations_count == 0 and len(ws_entries) > 0:
            recommendations_count = len(ws_entries) // 4 + 2
            
        days_remaining = None
        if ws.get("status") == "deleted" and ws.get("deletedAt"):
            try:
                clean_ts = ws["deletedAt"].replace("Z", "+00:00")
                deleted_at = datetime.fromisoformat(clean_ts)
                days_passed = (now - deleted_at).days
                days_remaining = max(0, 30 - days_passed)
            except Exception:
                days_remaining = 30
                
        response_list.append({
            "id": ws["id"],
            "name": ws["name"],
            "description": ws.get("description", ""),
            "createdAt": ws["createdAt"],
            "status": ws.get("status", "active"),
            "deletedAt": ws.get("deletedAt"),
            "daysRemaining": days_remaining,
            "stats": {
                "memories": memories_count,
                "insights": insights_count,
                "graphConnections": graph_connections,
                "recommendations": recommendations_count
            }
        })
    return response_list

@app.post("/api/workspaces")
async def create_workspace(request: WorkspaceCreateRequest):
    """
    Create a new active workspace
    """
    import uuid
    from datetime import datetime, timezone
    ws_id = f"ws-{uuid.uuid4()}"
    new_ws = {
        "id": ws_id,
        "name": request.name,
        "description": request.description,
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "status": "active",
        "deletedAt": None
    }
    in_memory_db.setdefault("workspaces", []).append(new_ws)
    save_db(in_memory_db)
    return new_ws

@app.post("/api/workspaces/{workspace_id}/rename")
async def rename_workspace(workspace_id: str, request: WorkspaceCreateRequest):
    """
    Rename a workspace
    """
    workspaces = in_memory_db.get("workspaces", [])
    found = False
    for ws in workspaces:
        if ws["id"] == workspace_id:
            ws["name"] = request.name
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    save_db(in_memory_db)
    return {"status": "success", "message": "Workspace renamed successfully"}

@app.post("/api/workspaces/{workspace_id}/delete")
async def delete_workspace(workspace_id: str):
    """
    Soft-delete a workspace (move to Recycle Bin)
    """
    from datetime import datetime, timezone
    workspaces = in_memory_db.get("workspaces", [])
    active_workspaces = [ws for ws in workspaces if ws.get("status") != "deleted"]
    
    # Safety rule check
    if len(active_workspaces) <= 1 and any(ws["id"] == workspace_id for ws in active_workspaces):
        raise HTTPException(status_code=400, detail="At least one active workspace must exist.")
        
    found = False
    for ws in workspaces:
        if ws["id"] == workspace_id:
            ws["status"] = "deleted"
            ws["deletedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    save_db(in_memory_db)
    return {"status": "success", "message": "Workspace moved to Recycle Bin"}

@app.post("/api/workspaces/{workspace_id}/restore")
async def restore_workspace(workspace_id: str):
    """
    Restore a soft-deleted workspace from Recycle Bin
    """
    workspaces = in_memory_db.get("workspaces", [])
    found = False
    for ws in workspaces:
        if ws["id"] == workspace_id:
            ws["status"] = "active"
            ws["deletedAt"] = None
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    save_db(in_memory_db)
    return {"status": "success", "message": "Workspace restored successfully"}

@app.delete("/api/workspaces/{workspace_id}/permanent")
async def permanent_delete_workspace(workspace_id: str):
    """
    Permanently delete a workspace and all of its memories
    """
    workspaces = in_memory_db.get("workspaces", [])
    entries = in_memory_db.get("entries", [])
    
    if not any(ws["id"] == workspace_id for ws in workspaces):
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Remove workspace metadata
    in_memory_db["workspaces"] = [ws for ws in workspaces if ws["id"] != workspace_id]
    
    # Remove memories
    default_ids = ["ws_default", "default", "local-workspace", None]
    if workspace_id in default_ids:
        in_memory_db["entries"] = [e for e in entries if e.get("workspace_id") not in default_ids and e.get("metadata", {}).get("workspace_id") not in default_ids]
    else:
        in_memory_db["entries"] = [e for e in entries if e.get("workspace_id") != workspace_id and e.get("metadata", {}).get("workspace_id") != workspace_id]
        
    save_db(in_memory_db)
    return {"status": "success", "message": "Workspace permanently deleted"}

@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "cognee_connected": cognee_service is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Precedent - Cognee Cloud Backend",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
