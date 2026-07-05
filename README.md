# Precedent - AI Decision Memory System with Cognee Cloud

> Never repeat the same mistake twice.

Precedent is a full-stack AI application that captures your decisions, learns from outcomes using Cognee Cloud's knowledge graph, and intelligently warns you before repeating past mistakes.

## The Vision

Every decision you make shapes your future. But most of us forget the context of past decisions, repeat the same mistakes, and miss opportunities to apply lessons learned. **Precedent** changes that by creating a living memory of your decisions and their outcomes.

## Live Demo

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000/api/health
- **API Docs**: http://localhost:8000/docs (auto-generated Swagger)

## Quick Start (5 minutes)

### Prerequisites
- Python 3.11+ OR Docker
- Node.js 20+
- Cognee Cloud API Token

### Run Locally

#### Option 1: Docker Compose (Easiest)
```bash
docker-compose up
```
Then visit http://localhost:3000

#### Option 2: Manual Setup
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
export COGNEE_API_TOKEN="your_token"
python main.py

# Terminal 2: Frontend
npm install
npm run dev
```

Then visit http://localhost:3000

## Product Features

### 1. **Decision Capture**
Chat naturally about your decisions, goals, and lessons learned. The system automatically extracts and structures them.

```
You: "I'm thinking about launching a new product next quarter"
System: ✓ Captured as Decision
         ✓ Extracted Goal: Product launch by Q3
         ✓ Identified Reasoning: Market opportunity
```

### 2. **Memory Management**
Browse all captured memories in the vault. See metadata, confidence scores, and relationships.

### 3. **Graph Intelligence**
Cognee Cloud builds a knowledge graph of your decisions. See clusters, patterns, and relationships.

### 4. **Pre-Flight Checks**
Before making a big decision, query your decision history:
- "What similar decisions have I made?"
- "What were the outcomes?"
- "Any warnings based on my history?"

### 5. **Decision Analytics**
Dashboard showing:
- Decisions logged
- Outcomes (successful vs unsuccessful)
- Repeat mistakes prevented
- Decision patterns and trends

## Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Next.js 16 + React 19)   │
│  Dark Theme, Responsive, Beautiful  │
└────────────┬────────────────────────┘
             │ REST API
┌────────────▼────────────────────────┐
│  Backend (FastAPI + Python 3.11)    │
│  • Chat endpoint                    │
│  • Memory extraction                │
│  • Graph queries                    │
│  • Intelligence engine              │
└────────────┬────────────────────────┘
             │ HTTP
┌────────────▼────────────────────────┐
│  Cognee Cloud (Knowledge Graph)     │
│  • Memory storage                   │
│  • Similarity search                │
│  • Pattern detection                │
│  • Graph analytics                  │
└─────────────────────────────────────┘
```

## Documentation

Start here based on your needs:

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [**QUICKSTART.md**](./QUICKSTART.md) | Get running in 5 min, demo script | 5 min |
| [**README_SETUP.md**](./README_SETUP.md) | Detailed setup & API docs | 15 min |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Deploy to Railway + Vercel | 20 min |
| [**BUILD_SUMMARY.md**](./BUILD_SUMMARY.md) | What's built & how it works | 10 min |
| [**COGNEE_ARCHITECTURE.md**](./COGNEE_ARCHITECTURE.md) | Technical architecture | 15 min |

## Project Structure

```
precedent/
├── app/                          # Next.js pages & layout
│   ├── page.tsx                 # Main chat/decision page
│   ├── layout.tsx               # Root layout with theme
│   └── globals.css              # Dark theme design tokens
│
├── components/                   # React components
│   ├── chat-interface.tsx       # Chat UI
│   ├── dashboard.tsx            # Stats dashboard
│   ├── sidebar.tsx              # Navigation sidebar
│   ├── memories-view.tsx        # Memory vault
│   ├── graph-view.tsx           # Graph visualization
│   └── ui/                      # shadcn/ui components
│
├── lib/
│   ├── api.ts                   # API client
│   ├── store.ts                 # Client state management
│   └── utils.ts                 # Utilities
│
├── backend/                      # Python FastAPI backend
│   ├── main.py                  # Main application (527 lines)
│   ├── cognee_config.py         # Cognee Cloud integration
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile              # Container config
│   └── .env.example            # Environment template
│
├── Configuration Files
│   ├── docker-compose.yml       # Local dev orchestration
│   ├── Dockerfile.next         # Frontend container
│   ├── railway.json            # Railway deployment
│   ├── vercel.json             # Vercel deployment
│   ├── next.config.mjs         # Next.js config
│   ├── tailwind.config.ts      # Tailwind CSS config
│   └── tsconfig.json           # TypeScript config
│
└── Documentation
    ├── README.md               # This file
    ├── QUICKSTART.md          # 5-minute start guide
    ├── README_SETUP.md        # Detailed setup
    ├── DEPLOYMENT.md          # Production deployment
    ├── BUILD_SUMMARY.md       # What's built
    └── COGNEE_ARCHITECTURE.md # Technical deep dive
```

## Technology Stack

### Frontend
- **Next.js 16**: React with Server Components, incredible DX
- **React 19**: Latest React features
- **TypeScript**: Type-safe development
- **Tailwind CSS v4**: Utility-first styling
- **shadcn/ui**: Accessible component library

### Backend
- **FastAPI**: Modern, fast Python framework
- **Pydantic**: Data validation
- **httpx**: Async HTTP client
- **Python 3.11+**: Latest Python

### Infrastructure
- **Docker & Docker Compose**: Local development
- **Railway**: Backend hosting
- **Vercel**: Frontend hosting
- **Cognee Cloud**: Knowledge graph backend

## Design Philosophy

### Theme
The application uses a sophisticated dark theme optimized for focus:
- **Primary Colors**: Deep navy (#1a1a2e) and purple (#16213e)
- **Accents**: Cyan (#00d4ff) for highlights
- **Success**: Emerald green (#10b981)
- **Warning**: Amber (#f59e0b)

This creates a premium, professional appearance suitable for serious decision-making.

### UX Principles
- **Conversational**: Natural language input
- **Progressive Disclosure**: Information revealed when needed
- **Visual Feedback**: Clear status and results
- **Accessibility**: Full keyboard navigation, screen reader support

## API Endpoints

### Chat
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "I'm planning to launch a new product"
}
```

### Vault (Memories)
```bash
GET /api/vault
```

### Graph Statistics
```bash
GET /api/graph-stats
```

### Pre-Flight Check
```bash
POST /api/preflight
Content-Type: application/json

{
  "decision": "Should we pivot to a new market?"
}
```

### Health Check
```bash
GET /api/health
```

Full Swagger docs available at `/docs` when backend runs.

## Deployment

### Deploy Backend to Railway

1. Push code to GitHub
2. Connect Railway to your repo
3. Set environment variables:
   - `COGNEE_API_TOKEN`
   - `OPENAI_API_KEY` (optional)
4. Deploy (auto-detects Dockerfile)

### Deploy Frontend to Vercel

1. Import project from GitHub
2. Set environment variable: `NEXT_PUBLIC_API_URL=<railway-backend-url>`
3. Deploy (auto-detects Next.js)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Environment Variables

### Backend (in Railway)
```
COGNEE_API_TOKEN=your_cognee_token_here
OPENAI_API_KEY=your_openai_key_here  # Optional
PORT=8000
```

### Frontend (in Vercel)
```
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
```

## Development

### Install Dependencies
```bash
npm install
cd backend && pip install -r requirements.txt
```

### Run Locally
```bash
docker-compose up
```

### Build for Production
```bash
npm run build
docker build -t precedent-backend ./backend
```

### Code Quality
```bash
npm run lint
npm run format
```

## Key Features Implemented

- [x] Beautiful dark theme UI (Lovable-inspired)
- [x] Natural language chat interface
- [x] Memory extraction (decisions, goals, outcomes, etc)
- [x] Cognee Cloud integration
- [x] Graph visualization support
- [x] Pre-flight decision checks
- [x] Memory vault (browse all captured memories)
- [x] Dashboard with stats
- [x] Sidebar with workspace management
- [x] API client with error handling
- [x] Docker & Docker Compose setup
- [x] Railway deployment config
- [x] Vercel deployment config
- [x] Comprehensive documentation

## Roadmap

### Phase 2: Intelligence
- [ ] OpenAI integration for semantic extraction
- [ ] ML model for outcome prediction
- [ ] Decision scoring and ranking
- [ ] Personalized recommendations

### Phase 3: Collaboration
- [ ] User authentication (Better Auth)
- [ ] Team collaboration features
- [ ] Decision sharing and voting
- [ ] Benchmark against community

### Phase 4: Integrations
- [ ] Slack bot for decision capture
- [ ] Email notifications
- [ ] Calendar integration
- [ ] Mobile app (React Native)

### Phase 5: Enterprise
- [ ] Organization management
- [ ] Advanced analytics dashboard
- [ ] API marketplace
- [ ] Custom models

## Contributing

This project is built with modern best practices and is ready for contribution:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT - Feel free to use for personal or commercial projects.

## Support

### For Issues
1. Check [README_SETUP.md](./README_SETUP.md) for setup help
2. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment issues
3. View backend logs: `docker-compose logs backend`
4. View frontend logs: Browser DevTools (F12)

### For Questions
- See [QUICKSTART.md](./QUICKSTART.md) for quick answers
- See [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) for what's included
- See [COGNEE_ARCHITECTURE.md](./COGNEE_ARCHITECTURE.md) for technical details

## Credits

Built with:
- **Cognee Cloud** - Knowledge graph intelligence
- **FastAPI** - Modern Python framework
- **Next.js** - React framework
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library

## The Vision Beyond

Imagine a world where:
- You never make the same mistake twice
- You learn from every decision
- Your past wisdom guides your future
- Teams build institutional memory
- Organizations make better decisions

That's the world Precedent is building.

---

**Start capturing your decisions today.** Visit http://localhost:3000 to begin.

Made with ❤️ using Next.js, FastAPI, and Cognee Cloud.
