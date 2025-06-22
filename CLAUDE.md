# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Parley is a web application for running and analyzing conversations between AI models (Anthropic Claude and OpenAI GPT). The project is migrating from a PyQt6 desktop application to a modern web stack.

## Architecture

### Backend (Python/FastAPI)
- **Framework**: FastAPI with Uvicorn/Gunicorn server
- **Python Version**: 3.11
- **Key Services**:
  - `ConversationManagerAsync`: Async generator for AI conversations (`async def stream(self): yield ChatMessage`)
  - `AnthropicService` / `OpenAIService`: API wrappers with exponential backoff and rate-limit handling
  - `AnalysisService`: Wraps `nlp_analyzer.ConversationAnalyzer` for sentiment, topics, flow metrics
- **Server-Sent Events (SSE)**: Real-time message streaming at `/conversation/{id}/stream`
- **Background Tasks**: Conversation loops using `asyncio.create_task()` dictionary keyed by conversation_id
- **Storage**: In-memory (Python dict) initially. Defer persistent storage (SQLite/Postgres) to a later version
- **Export**: PDF generation and JSON export capabilities

### Frontend (React/TypeScript)
- **Framework**: Next.js with TypeScript + Tailwind CSS
- **UI Library**: shadcn/ui components (Button, Card, Tabs, Alert/Callout, ResizablePanel, Slider, Select, Input)
- **State Management**: TanStack Query for REST data, native browser `EventSource` API for live SSE messages
- **Pages**:
  - `/` - Main configuration page with tabbed interface (Live Conversation, Basic Analysis, Advanced Analysis)
  - `/conversation/[id]` - Live conversation view (see UI design notes below)
  - `/analysis/[id]` - Charts & metrics (Recharts/Chart.js or embedded Dash via iframe)
- **Theming**: Dark mode interface with toggle switch persisting in localStorage

#### UI Design Reference (Based on Desktop App)
The frontend should follow this layout structure:

**Main Page Layout:**
- Dark theme with tab navigation at top (Live Conversation | Basic Analysis | Advanced Analysis)
- Left sidebar (approximately 300px) containing:
  - API Configuration section with dropdowns for Provider and Model selection
  - Conversation Settings with numeric inputs/sliders for:
    - Message Limit
    - Message Delay (ms)
    - Max Tokens per Response
  - AI Personas section with text areas for each AI's personality/role
  - Initial Prompt text area
  - Control buttons at bottom (Start Conversation, Pause, Stop, Save JSON, Export PDF)
  - Theme toggle switch
- Main content area showing conversation display or analysis based on active tab

**Key UI Components to Implement:**
- Use shadcn/ui Select components for provider/model dropdowns
- Use shadcn/ui Slider or Input components for numeric settings
- Use shadcn/ui Textarea for persona descriptions and prompts
- Use shadcn/ui Button variants for controls (primary for Start, secondary for others)
- Use shadcn/ui Tabs for top navigation
- Maintain consistent spacing and dark color scheme throughout

## Development Commands

### Backend
```bash
# Bootstrap FastAPI project dependencies
pip install fastapi uvicorn[standard] pydantic python-dotenv

# Install dependencies
pip install -r backend/requirements.txt

# Run development server
cd backend && uvicorn app.main:app --reload --port 8000

# Run with multiple workers (production)
cd backend && uvicorn app.main:app --workers 4
```

### Frontend
```bash
# Initialize Next.js with TypeScript + Tailwind
npx create-next-app@latest frontend --typescript --tailwind --eslint

# Add shadcn/ui
cd frontend && npx shadcn-ui@latest init

# Install dependencies
cd frontend && npm install

# Run development server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Run linting
cd frontend && npm run lint

# Run type checking
cd frontend && npm run typecheck
```

### Docker
```bash
# Run both services
docker-compose up

# Rebuild containers
docker-compose up --build
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app instance
│   ├── api/
│   │   ├── conversation.py  # Conversation endpoints
│   │   └── analysis.py      # Analysis endpoints
│   ├── services/
│   │   ├── conversation.py  # ConversationManagerAsync
│   │   ├── anthropic.py     # Anthropic API wrapper
│   │   └── openai.py        # OpenAI API wrapper
│   ├── models.py            # Pydantic models
│   └── utils.py
├── requirements.txt
└── Dockerfile

frontend/
├── src/
│   ├── pages/               # Next.js pages
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks (useConversationStream, etc.)
│   └── lib/                 # Utilities
├── tailwind.config.ts
├── shadcn.json
└── Dockerfile
```

## Key API Endpoints

- `POST /conversation/start` - Start new conversation (returns conversation_id)
- `POST /conversation/{id}/pause` - Pause conversation by id
- `POST /conversation/{id}/resume` - Resume conversation by id
- `POST /conversation/{id}/stop` - Stop conversation gracefully
- `GET /conversation/{id}` - Get conversation metadata and status
- `GET /conversation/{id}/export?format=pdf|json` - Export conversation
- `GET /conversation/{id}/analysis` - Get NLP analysis results
- `GET /conversation/{id}/stream` - Real-time message stream via Server-Sent Events (SSE)

## Important Implementation Notes

1. **Async Patterns**: The conversation engine must use async/await patterns. Replace `time.sleep()` with `await asyncio.sleep()`. Convert `self.msleep(delay)` to `await asyncio.sleep(delay/1000)`.

2. **Server-Sent Events (SSE)**: Frontend connects to `/conversation/{id}/stream` using the browser's native `EventSource` API to receive real-time messages. Messages follow the Pydantic `ChatMessage` model.

3. **Service Layer**: All external API calls (Anthropic, OpenAI) should go through service wrappers with proper error handling and exponential backoff.

4. **Background Tasks**: Long-running conversations are managed as background tasks using `asyncio.create_task()` dictionary keyed by id. Use `asyncio.Event` flags for pause/stop control.

5. **Frontend State**: Use TanStack Query for REST data fetching and native browser `EventSource` API for real-time SSE updates.

6. **Pydantic Models**: Define schemas for ConversationConfig, ChatMessage, AnalysisResult, etc.

7. **Analysis Options**: 
   - Short-term: Embed existing Dash server via iframe
   - Long-term: Port to React charts (Recharts, Chart.js, Plotly.js, Nivo)

## Migration from Desktop App

Key files from the PyQt6 desktop version that contain reusable logic:
- `conversation_cli.py` - Core conversation logic (needs async conversion)
- `analysis/nlp_analyzer.py` - NLP analysis (can be used as-is)
- `pdf_export.py` - PDF generation (can be copied to backend)

## Environment Variables

Create a `.env` file in the backend directory:
```
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```