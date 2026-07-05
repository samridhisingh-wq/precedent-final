# Precedent - Quick Start Guide

Get Precedent up and running in 5 minutes.

## What is Precedent?

An AI-powered decision memory system that:
- Captures your decisions, goals, and lessons learned
- Learns from outcomes using Cognee Cloud
- Warns you before repeating past mistakes
- Visualizes your decision-making patterns

## For Hackathon Judges

### Live Demo (1 minute)

1. **Visit**: http://localhost:3000 (or Vercel deployment link)
2. **See the UI**: Beautiful dark theme with sidebar, memory health, navigation
3. **Try the chat**: Type in the chat box: *"I'm planning to launch a new product next quarter but I'm unsure about timing"*
4. **Click Dashboard** to see memory extraction and stats

### What's Happening Behind the Scenes

- **Frontend** (Next.js): Beautiful UI for decision capture
- **Backend** (FastAPI): Orchestrates extraction, storage, intelligence
- **Cognee Cloud**: Stores structured memories in a knowledge graph
- **Intelligence**: Analyzes similar decisions to warn about repeating mistakes

## Installation (5 minutes)

### Backend

```bash
cd backend
pip install -r requirements.txt
export COGNEE_API_TOKEN="your_token_here"
export OPENAI_API_KEY="your_key_here"
python main.py
```

Backend runs on: `http://localhost:8000`

### Frontend

```bash
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

## Key Features to Demonstrate

### 1. Chat & Memory Extraction
- Type a decision in chat
- System extracts: Decision, Goal, Reasoning, Outcomes, Rejected Alternatives
- Shows memory health score (87/100)

### 2. Dashboard
- Click "Dashboard" in sidebar
- See stat cards: Decisions Logged, Rejections Stored, Successful Outcomes, Repeat Mistakes Prevented
- Beautiful colored icons with "live" badges

### 3. Memory Vault
- Click "Memory Vault" 
- Browse all captured memories with metadata
- Filter by type (decision, goal, outcome, etc)

### 4. Graph Visualization
- Click "Memory Graph"
- See relationships between decisions and outcomes
- Visualize clusters of similar decisions

### 5. Pre-Flight Checks
- Propose a decision
- System searches for similar past decisions
- Shows warnings and suggestions based on history

## File Structure

```
.
├── frontend/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── lib/             # API client
│   └── package.json     # Dependencies
│
├── backend/
│   ├── main.py          # FastAPI app (all endpoints + services)
│   ├── cognee_config.py # Cognee Cloud integration
│   ├── requirements.txt
│   └── Dockerfile       # For Railway deployment
│
├── DEPLOYMENT.md        # How to deploy to production
├── README_SETUP.md      # Detailed setup instructions
└── QUICKSTART.md        # This file
```

## API Endpoints (For Testing)

```bash
# Health check
curl http://localhost:8000/api/health

# Send a message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to launch a new product"}'

# Get all memories
curl http://localhost:8000/api/vault

# Get graph visualization data
curl http://localhost:8000/api/graph-stats

# Pre-flight check
curl -X POST http://localhost:8000/api/preflight \
  -H "Content-Type: application/json" \
  -d '{"decision":"Should we pivot to a new market?"}'
```

## Technology Stack

### Frontend
- **Next.js 16**: React framework with Server Components
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: High-quality component library
- **Responsive Design**: Works on mobile and desktop

### Backend
- **FastAPI**: Modern Python web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation
- **httpx**: Async HTTP client

### Knowledge Graph
- **Cognee Cloud**: AI-powered knowledge graph for memory storage and similarity search

## Design Philosophy

### Theme
- **Dark navy/purple** background (premium, focused)
- **Cyan accents** (modern, friendly)
- **Clean typography** (professional)
- **Polished UI** (inspired by Lovable design)

### User Experience
- **Conversational**: Natural language decision capture
- **Visual**: Memory cards, graph visualization, stat dashboards
- **Intelligent**: Learns from decisions, warns about patterns
- **Progressive**: Builds memory over time

## Common Commands

```bash
# Start everything with Docker Compose
docker-compose up

# Run only backend
cd backend && python main.py

# Run only frontend
npm run dev

# Build for production
npm run build

# Format code
npm run lint
```

## Debugging

### Check logs
```bash
# Frontend errors
# Open DevTools (F12) → Console tab

# Backend errors
# Check terminal where you ran `python main.py`
```

### Test API directly
```bash
# See what backend returns
curl http://localhost:8000/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

## Next Steps

### For Development
1. Implement real LLM extraction with OpenAI
2. Add user authentication
3. Build mobile app
4. Slack/Teams integration

### For Deployment
1. Follow `DEPLOYMENT.md` to deploy to Railway + Vercel
2. Set Cognee API token in environment variables
3. Monitor logs and performance

## Demo Script (2 minutes)

1. **Show UI** (10 seconds)
   - "This is Precedent, a decision memory system"
   - "See the sidebar with memory health widget"
   - "Professional dark theme optimized for focus"

2. **Chat Demo** (30 seconds)
   - Type: "I'm thinking about hiring 5 more engineers"
   - Show extraction happening
   - "The system extracted: decision, goal, and reasoning"

3. **Dashboard** (20 seconds)
   - Click "Dashboard"
   - "See stats: decisions logged, outcomes, repeated mistakes prevented"
   - "Memory health at 87/100 means good decision tracking"

4. **Graph** (20 seconds)
   - Click "Memory Graph"
   - "See relationships between decisions"
   - "Find patterns in your decision-making"

5. **Pre-Flight Check** (30 seconds)
   - Go to chat
   - Click "Run Pre-Flight Check"
   - "System searches similar past decisions"
   - "Warns you before repeating mistakes"

**Total**: ~2 minutes, impressive demo!

## Questions?

Check the detailed docs:
- **Setup Issues**: See `README_SETUP.md`
- **Production Deployment**: See `DEPLOYMENT.md`
- **Architecture**: See `COGNEE_ARCHITECTURE.md`

---

**Ready to capture your decisions and learn from them!** 🚀
