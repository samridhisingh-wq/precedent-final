# Precedent Backend Architecture Plan
## Cognee Cloud-First Decision Intelligence System

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
│           - Chat Interface                                   │
│           - Memory Timeline/Vault/Graph                      │
│           - Pre-Flight Decision Widget                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (FastAPI/Python)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ API Layer (Route Handlers)                           │  │
│  │ - POST /chat (receive message, return response)      │  │
│  │ - GET /vault (list memories with filters)           │  │
│  │ - GET /graph-stats (graph topology & entities)      │  │
│  │ - POST /preflight (decision pre-check)              │  │
│  │ - POST /onboard (workspace creation)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │ Core Service Layer                                  │  │
│  │ - Message Processing Service                        │  │
│  │ - Cognee Integration Service                        │  │
│  │ - Decision Intelligence Service                     │  │
│  │ - Response Generation Service                       │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                         │
└───────────────────┼──────────────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
   ┌─────────────┐      ┌──────────────────┐
   │ Cognee      │      │ Local Database   │
   │ Cloud API   │      │ (SQLite/Postgres)│
   │             │      │                  │
   │ - Add nodes │      │ - Session state  │
   │ - Add edges │      │ - Workspace meta │
   │ - Query     │      │ - Preferences    │
   │ - Search    │      │ - Temp cache     │
   └─────────────┘      └──────────────────┘
```

---

## 2. Data Flow: Chat → Memory → Graph → Response

### Complete Message Flow with Cognee:

User Message:
`"I'm thinking about joining a hackathon solo next month"`

**Step 1: MESSAGE RECEIPT**
- POST /chat with message and workspace_id

**Step 2: LLM EXTRACTION**
- Prompt LLM to extract structured data:
  - Decision: "Join hackathon as solo participant"
  - Goal: "Build portfolio & win competition"
  - Reasoning: "Career growth opportunity"
  - Alternatives: ["Skip hackathon", "Join team"]
  - Confidence: 0.75

**Step 3: COGNEE GRAPH INGESTION**
- Create Decision node in Cognee
- Create Goal, Reasoning, Alternative nodes
- Create relationships:
  - Decision --[has_goal]--> Goal
  - Decision --[based_on]--> Reasoning
  - Decision --[considered]--> Alternative
- Attach workspace_id metadata to all nodes

**Step 4: SIMILARITY SEARCH**
- Query Cognee: "Find similar decisions to 'Join hackathon solo'"
- Cognee returns similar past decisions with outcomes

**Step 5: DECISION INTELLIGENCE**
- Analyze similar decisions for patterns
- Extract lessons and mistakes from past outcomes
- Generate warnings and recommendations
- Calculate success rate

**Step 6: RESPONSE GENERATION**
- LLM synthesizes conversational response
- Include precedent warnings gently
- Acknowledge extracted memories

**Step 7: RETURN TO FRONTEND**
- Conversation response
- Extracted memories (decision, goal, reasoning, etc.)
- Pre-flight check with warnings and recommendations
- Similar decisions found

---

## 3. Cognee Graph Schema

### Entity Types:

**Decision**
- title: Main decision being made
- confidence: 0-1 (how sure the user is)
- timestamp: When it was decided
- workspace_id: Which workspace it belongs to
- status: pending|completed|abandoned
- context: Raw user message

**Goal**
- title: What success looks like
- description: Details about the goal
- timestamp: When set
- workspace_id: Workspace filter

**Reasoning**
- title: Why they're thinking this way
- description: Detailed reasoning
- timestamp: When identified
- workspace_id: Workspace filter

**RejectedAlternative**
- title: What they considered but didn't choose
- description: Why it was rejected
- timestamp: When considered
- workspace_id: Workspace filter

**Outcome**
- title: What actually happened
- type: success|partial_success|failure
- lessons_learned: What to remember
- timestamp: When outcome occurred
- workspace_id: Workspace filter

### Relationships:

```
Decision --[has_goal]--> Goal
Decision --[based_on]--> Reasoning
Decision --[considered]--> RejectedAlternative
Decision --[produced]--> Outcome
Outcome --[similar_to]--> Outcome (for pattern matching)
Decision --[repeat_of]--> Decision (when repeating past decision)
Decision --[contradicts]--> Decision (when doing opposite of past)
```

---

## 4. API Endpoints

### POST /chat
Receives a natural language message, extracts structures, stores in Cognee, finds similar decisions, generates response.

**Request:**
```json
{
  "message": "I'm thinking about joining a hackathon solo",
  "workspace_id": "workspace-123"
}
```

**Response:**
```json
{
  "message": "That sounds like an exciting opportunity...",
  "memories": [
    { "type": "decision", "content": "Join hackathon as solo participant" },
    { "type": "goal", "content": "Build portfolio & win competition" }
  ],
  "preflight_check": {
    "status": "warning",
    "warnings": ["You've done this before and had integration issues..."],
    "recommendations": ["Plan backend architecture first"]
  }
}
```

### GET /vault
List all memories in workspace, optionally filtered by type.

**Query:** `?workspace_id=...&type=decision&limit=50`

**Response:**
```json
{
  "entries": [...],
  "total": 42,
  "decisions": 15,
  "goals": 8,
  "outcomes": 12,
  "rejected": 7
}
```

### GET /graph-stats
Return graph topology for visualization.

**Query:** `?workspace_id=...`

**Response:**
```json
{
  "nodes": 42,
  "edges": 56,
  "clusters": 3,
  "entries": [...],
  "similarity_links": [...],
  "powered_by": "cognee_cloud"
}
```

### POST /preflight
Explicit decision intelligence check.

**Request:**
```json
{
  "decision": "I want to launch a new product next quarter",
  "workspace_id": "workspace-123"
}
```

**Response:**
```json
{
  "status": "warning",
  "warnings": [...],
  "recommendations": [...],
  "similar_decisions": [...],
  "success_rate_similar": 0.6
}
```

### POST /onboard
Initialize workspace.

**Request:**
```json
{
  "workspace_name": "My Decisions",
  "role_description": "Software engineer",
  "workspace_id": "workspace-123"
}
```

---

## 5. Core Services

### Message Processing Service
- Receives user message
- Calls LLM with extraction prompt
- Validates and structures extraction
- Returns structured memory objects

### Cognee Integration Service
- Creates entities in Cognee graph
- Creates relationships between entities
- Attaches workspace metadata
- Queries Cognee for similar decisions
- Retrieves graph topology

### Decision Intelligence Service
- Analyzes similar past decisions
- Extracts patterns and lessons
- Generates warnings
- Calculates success rates
- Creates recommendations

### Response Generation Service
- Synthesizes conversational response
- Includes precedent warnings
- Acknowledges memories
- Returns friendly, helpful text

---

## 6. Technology Stack

**Backend:**
- FastAPI (Python)
- OpenAI API (for LLM extraction)
- Cognee Cloud API (for graph storage)
- SQLite/PostgreSQL (for metadata)
- Railway (deployment)

**Frontend:**
- Next.js 16
- Zustand (state)
- Native Fetch API
- Reactflow (graph viz)

---

## 7. Implementation Sequence

1. Set up FastAPI backend structure
2. Integrate Cognee Cloud API
3. Build LLM extraction pipeline
4. Implement message processing flow
5. Build Cognee graph schema
6. Implement similarity search
7. Build decision intelligence logic
8. Create API endpoints
9. Update frontend to use new endpoints
10. Test end-to-end flow
11. Deploy to Railway

---

## 8. Hackathon Demo Flow

1. **Onboard** - User creates workspace
2. **Chat Naturally** - User describes decisions conversationally
3. **Extract Memories** - System shows extracted structures
4. **Store in Cognee** - Backend adds to graph
5. **Find Similar** - User chats about similar decision, system finds past one
6. **Pre-Flight Warning** - System proactively warns about past mistakes
7. **Display Graph** - User sees memory relationships visualized
8. **Demonstrate Learning** - More chats → graph grows → connections deepen

This showcases Cognee Cloud's power for decision intelligence and memory retrieval.

---

Ready to build this?
