# Precedent - Decision Memory System with Cognee Cloud

A full-stack application that captures, learns from, and helps you avoid repeating past mistakes using Cognee Cloud's knowledge graph intelligence.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│     Beautiful UI for decision capture & memory exploration   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────────┐
│              Backend (FastAPI @ :8000)                       │
│  ┌──────────────────────────────────────────────────────────┤
│  │ Services Layer:                                          │
│  │ • ExtractionService   - Parse decisions from chat        │
│  │ • ResponseService     - Generate intelligent responses   │
│  │ • DecisionIntelligence - Pre-flight decision analysis   │
│  │ • CogneeService       - Graph operations                │
│  └──────────────────────────────────────────────────────────┤
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/gRPC
┌──────────────────────▼──────────────────────────────────────┐
│          Cognee Cloud (Knowledge Graph)                      │
│  • Stores structured decision memories                       │
│  • Finds similar past decisions (similarity search)          │
│  • Builds relationship graph between decisions              │
│  • Powers pre-flight warnings                               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional, for containerized dev)
- Cognee Cloud API Token
- OpenAI API Key (optional, for future LLM features)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create .env file with your API keys
cp .env.example .env
# Edit .env and add:
# COGNEE_API_TOKEN=your_token_here
# OPENAI_API_KEY=your_key_here

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: `http://localhost:8000`

Health check: `curl http://localhost:8000/api/health`

### 2. Frontend Setup

```bash
# In the root directory (if not already there)
cd ..

# Install Node dependencies
npm install

# Ensure .env.local has correct API URL
# cat .env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:8000

# Run the frontend
npm run dev
```

Frontend will be available at: `http://localhost:3000`

### 3. Using Docker Compose (Recommended for Development)

```bash
# Create .env file in root directory
cp backend/.env.example .env

# Edit .env with your API keys
COGNEE_API_TOKEN=your_token
OPENAI_API_KEY=your_key

# Run both services
docker-compose up

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## API Endpoints

### Chat Endpoint
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "I'm planning to launch a new product next quarter"
}

Response:
{
  "message": "I've noted your decision...",
  "extracted_memory": {...},
  "entry_id": "entry-123"
}
```

### Vault (Memories) Endpoint
```bash
GET /api/vault

Response:
{
  "entries": [...],
  "total": 5,
  "decisions": 2,
  "plans": 1,
  "rejected": 1,
  "successful": 1
}
```

### Graph Statistics
```bash
GET /api/graph-stats

Response:
{
  "nodes": [...],
  "edges": [...],
  "clusters": 2,
  "has_cognee_graph": true,
  "entries": [...],
  "similarity_links": [...]
}
```

### Pre-Flight Check
```bash
POST /api/preflight
Content-Type: application/json

{
  "decision": "Should we pivot to a new market?"
}

Response:
{
  "status": "ready",
  "warnings": ["Similar decision made 3 times before"],
  "suggestions": ["Review previous outcomes"],
  "similar_count": 3
}
```

## Features

### Decision Capture
- Natural language conversation about decisions
- Automatic extraction of decisions, goals, reasoning, outcomes
- Stores in Cognee Cloud knowledge graph

### Memory Vault
- Browse all captured memories
- Filter by type (decision, goal, outcome, rejected alternative)
- See metadata and extraction confidence

### Graph Visualization
- View decision relationships
- Clusters of similar decisions
- Network topology of your decision-making patterns

### Pre-Flight Checks
- Query similar past decisions before acting
- See what happened with similar choices
- Avoid repeating mistakes
- Get suggestions based on history

## Data Model

### Memory Types
- **Decision**: A choice or plan to act
- **Goal**: An objective or target state
- **Reasoning**: Why a decision was made
- **Outcome**: What happened as a result
- **Rejected Alternative**: Options not chosen

### Cognee Graph Schema
```
Decision ──related_to──> Goal
   │                      │
   ├──influenced_by──> Reasoning
   │
   └──resulted_in──> Outcome

RejectedAlternative ──of──> Decision
```

## Deployment

### Deploy to Railway

1. **Backend on Railway**:
   ```bash
   # Push to GitHub
   git push origin main
   
   # Connect to Railway
   # Select Python service
   # Set environment variables:
   # - COGNEE_API_TOKEN
   # - OPENAI_API_KEY
   # - PORT=8000
   ```

2. **Frontend on Vercel**:
   ```bash
   # Vercel automatically detects Next.js
   # Set environment variable:
   # - NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
   ```

### Docker Build
```bash
# Backend
docker build -t precedent-backend ./backend
docker run -p 8000:8000 \
  -e COGNEE_API_TOKEN=$COGNEE_API_TOKEN \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  precedent-backend

# Frontend
docker build -f Dockerfile.next -t precedent-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://backend:8000 \
  precedent-frontend
```

## Project Structure

```
.
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── cognee_config.py        # Cognee Cloud integration
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile             # Docker configuration
│   └── .env.example           # Environment template
├── app/
│   ├── page.tsx               # Landing/chat page
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/
│   ├── chat-interface.tsx     # Chat UI
│   ├── dashboard.tsx          # Stats dashboard
│   ├── sidebar.tsx            # Navigation sidebar
│   └── ui/                    # shadcn UI components
├── lib/
│   ├── api.ts                 # API client
│   └── utils.ts               # Utilities
├── .env.local                 # Frontend env vars
├── docker-compose.yml         # Docker composition
└── Dockerfile.next            # Next.js Docker config
```

## Theme & Design

The application uses a sophisticated dark theme:
- **Primary**: Deep navy/purple background
- **Secondary**: Dark slate for contrast
- **Accent**: Cyan/blue for highlights
- **Success**: Emerald green
- **Warning**: Amber/orange
- **Typography**: Professional sans-serif (Geist)

This creates a premium, focused experience suitable for serious decision-making.

## Development Tips

### Adding a New Memory Type
1. Update `CogneeMemoryTypes` in `cognee_config.py`
2. Update `ExtractionService.extract_memory_structure()` in `main.py`
3. Update frontend dashboard to display the new type

### Improving Extraction
The current `ExtractionService` uses keyword detection. To improve:
1. Integrate OpenAI API for semantic understanding
2. Train a custom extraction model
3. Use Cognee's built-in extraction (if available)

### Testing Locally
```bash
# Test backend without frontend
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I am planning to ship a new product"}'

# Test vault
curl http://localhost:8000/api/vault

# Health check
curl http://localhost:8000/api/health
```

## Troubleshooting

### Backend won't connect to Cognee
- Check `COGNEE_API_TOKEN` is set correctly
- Verify token hasn't expired in Cognee dashboard
- Check firewall/network access

### Frontend shows API errors
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for detailed errors

### Docker containers won't start
- Ensure Docker daemon is running
- Check port conflicts (3000, 8000)
- View logs: `docker-compose logs -f`

## Next Steps

1. **Integrate Real LLM**: Use OpenAI API for semantic memory extraction
2. **Add User Accounts**: Implement authentication with Better Auth
3. **Personalization**: Learn user preferences over time
4. **Mobile App**: Build iOS/Android companion apps
5. **Slack Integration**: Capture decisions directly from Slack
6. **Analytics**: Dashboard showing decision patterns and success rates

## License

MIT

## Support

For issues or questions, check the troubleshooting section or create an issue in the repository.

---

**Built with** ❤️ **using Next.js, FastAPI, and Cognee Cloud**
