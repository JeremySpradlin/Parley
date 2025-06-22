## AI Self-Conversation Web App – Development Plan

### 1. Objectives

1. Provide a browser-based interface for running, monitoring, and analysing AI-to-AI conversations using Anthropic Claude and OpenAI GPT models.
2. Preserve the core research features of the desktop app (conversation management, analysis, export) while making them accessible over the web.
3. Achieve a clean separation of concerns:
   • **Backend** – Python 3.11, FastAPI (+ Uvicorn) for REST & Server-Sent Event (SSE) APIs, background tasks, PDF generation, NLP analysis.
   • **Frontend** – React + TypeScript (Next.js or Vite) with **shadcn/ui** (Radix + Tailwind) for a modern, accessible UI.
4. Make the system easy to deploy locally (Docker Compose) or to the cloud (e.g. Fly.io, Render, AWS Fargate).

---

### 2. Current Desktop Architecture (Summary)

| Layer | Key Modules | Responsibilities |
|-------|-------------|------------------|
| **UI (PyQt6)** | `main.py` (class `AIConversationApp`) | GUI, configuration panel, start/stop controls, live message display, theme toggle |
| **Conversation Engine** | `ConversationManager` (QThread) in `main.py`, similar logic in `conversation_cli.py` | Alternating calls to Anthropic / OpenAI APIs, maintains history, emits Qt signals |
| **Analysis** | `analysis/` (`nlp_analyzer.py`, `web_server.py`) | Sentiment, topics, flow metrics; standalone Flask + Dash server |
| **Export** | `pdf_export.py` | Generate PDF from conversation |

Constraints to keep in mind:
• Blocking network calls & `time.sleep` → need to become **async** to scale.<br>
• Qt signal/slot layer → replace with Server-Sent Events (SSE).

---

### 3. Target Web Architecture

```
+-------------+          HTTPS / SSE          +--------------------+
|  Frontend   |  <––––––––––––––––––––––––––>  |     FastAPI API    |
|  (shadcn)   |                               |  /conversation     |
| React/Next  |                               |  /analysis         |
+-------------+                               +--------------------+
                                                 |  Async Workers   |
                                                 |  (conversation)  |
                                                 |  redis / rq etc. |
```

1. **FastAPI Backend**
   - Run under Uvicorn/Gunicorn with `--workers`.
   - **Pydantic models** for request/response schemas (ConversationConfig, ChatMessage, AnalysisResult, …).
   - **Endpoints**
     | Method | Path | Purpose |
     |--------|------|---------|
     | POST | `/conversation/start` | Start a new conversation; returns conversation_id |
     | POST | `/conversation/{id}/pause` | Pause by id |
     | POST | `/conversation/{id}/resume` | Resume by id |
     | POST | `/conversation/{id}/stop` | Gracefully stop by id |
     | GET  | `/conversation/{id}` | Metadata & current status |
     | GET  | `/conversation/{id}/export` | Download JSON or PDF |
     | GET  | `/conversation/{id}/analysis` | Return computed NLP metrics |
     | GET  | `/conversation/{id}/stream` | Real-time message stream via Server-Sent Events (SSE) |

   - **Background Task** pattern
     • Conversation loop runs in an `asyncio.create_task` dictionary keyed by id.<br>
     • Use `asyncio.Event` flags for pause/stop.<br>
     • Heavy analysis/PDF generation can be off-loaded to Celery or `BackgroundTasks` if sufficient.

   - **Reusable Services**
     • `AnthropicService`, `OpenAIService` (wrap API calls; retries, rate-limit handling).<br>
     • `ConversationManagerAsync` (adapted from current synchronous class).<br>
     • `AnalysisService` (wraps `nlp_analyzer.ConversationAnalyzer`).

   - **Storage**
     • In-memory first (Python dict). Defer persistent storage (SQLite/Postgres) to a later version.

2. **Frontend (shadcn/ui + Next.js)**

   - **Pages / Routes**
     1. `/` – Main page to configure and launch a new conversation.
     2. `/conversation/[id]` – Split-screen live chat view (left = AI 1, right = AI 2), controls (start/stop/pause), settings drawer.
     3. `/analysis/[id]` – Charts & metrics (reuse existing Dash logic → convert to React charts: Recharts / Chart.js).
   - **State Management** – TanStack Query (react-query) for fetching REST data, native browser `EventSource` API for live SSE messages.
   - **UI Library** – shadcn components (Button, Card, Tabs, Alert / Callout). Tailwind used for layout.
   - **Theming** – shadcn dark/light toggle persists in `localStorage`.

3. **PDF & File Export**
   - Provide `/conversation/{id}/export?format=pdf|json`.
   - Frontend offers "Download" button; backend streams file.

4. **Analysis Dashboard Options**
   - **Short-term**: Keep existing Dash server and embed via `<iframe>` at `/dashboard/{id}` (quick win).
   - **Long-term**: Port plots to React (e.g. Plotly.js, Nivo) and fetch data from `/analysis/{id}`.

---

### 4. Detailed Task Breakdown

#### 4.1 Repository Layout (mono-repo)
```
web-app/
├─ backend/
│  ├─ app/
│  │  ├─ main.py          # FastAPI app instance
│  │  ├─ api/            
│  │  │   ├─ conversation.py
│  │  │   └─ analysis.py
│  │  ├─ services/
│  │  │   ├─ conversation.py  # ConversationManagerAsync
│  │  │   ├─ anthropic.py
│  │  │   └─ openai.py
│  │  ├─ models.py       # Pydantic models
│  │  └─ utils.py
│  ├─ requirements.txt   
│  └─ Dockerfile
├─ frontend/
│  ├─ src/
│  │  ├─ pages/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  └─ lib/
│  ├─ tailwind.config.ts
│  ├─ shadcn.json
│  └─ Dockerfile
└─ docker-compose.yml
```

#### 4.2 Backend Implementation Steps
1. **Bootstrap FastAPI project** (`fastapi`, `uvicorn[standard]`, `pydantic`, `python-dotenv`).
2. **Implement Configuration** using a Pydantic `BaseSettings` class for type-safe management of environment variables.
3. **Define Global Error Handling** using FastAPI exception handlers to ensure consistent JSON error responses for states like 404 (Not Found) or 400 (Bad Request).
4. **Port ConversationManager**
   - Make it an `async` generator `async def stream(self): yield ChatMessage`.
   - Replace `self.msleep(delay)` with `await asyncio.sleep(delay/1000)`.
5. **Create service layer** (anthropic/openai wrappers with exponential back-off). Reuse logic from desktop code.
6. **Wire REST & SSE endpoints**.
7. **Integrate AnalysisService** – run on-demand or automatically after conversation ends.
8. **Add PDF export**.
9. **Add authentication placeholder** (optional – bearer token env variable).

#### 4.3 Frontend Implementation Steps
1. Init Next.js app with TypeScript + Tailwind.
2. Add **shadcn/ui** (`npx shadcn-ui@latest init`).
3. Build pages and hooks:
   - `useConversationStream` hook using the browser's native `EventSource` API.
   - Forms for config (participants, providers, models, limits).
4. Implement live chat layout using `ResizablePanel` pattern.
5. Build analysis charts using `react-chartjs-2` or `react-plotly.js`.
6. Polish UX: loading states, toasts.

#### 4.4 Dev & Deploy
- **Docker Compose** with two services: `backend` (ports 8000) and `frontend` (3000) behind Caddy/NGINX.
- Provide `.env.example` for API keys.
- CI pipeline (GitHub Actions) → lint, test, Docker build.

---

### 5. Re-using Existing Code
- **Business logic** in `conversation_cli.py` and `main.py` can migrate mostly unchanged once converted to async / dependency style.
- **NLP analysis** (`analysis/nlp_analyzer.py`) is backend-ready; just import in FastAPI.
- **PDF export** (`pdf_export.py`) can be copied to backend service.

---

### 6. Milestones & Estimates
| # | Milestone | Est. Time |
|---|-----------|-----------|
| 1 | FastAPI skeleton + health & config route | 0.5 d |
| 2 | Async ConversationManager + SSE stream | 1.5 d |
| 3 | REST controls (start/stop/etc.) | 0.5 d |
| 4 | Frontend skeleton w/ shadcn, main page | 1.0 d |
| 5 | Live conversation UI | 1.0 d |
| 6 | Analysis endpoint + basic charts | 1.0 d |
| 7 | PDF/JSON export | 0.5 d |
| 8 | Docker & deployment docs | 0.5 d |
| **Total** | **~6.5 days** |

---

### 7. Potential Enhancements
- OAuth authentication (Auth0, Clerk).
- Save conversation transcripts to Postgres.
- Rate-limiting & quota per user.
- Support more providers (Gemini, Llama 3 via Ollama).
- Real-time token streaming (partial responses) via the existing SSE endpoint.
- Integrate OpenAI Function-calling / Claude Tool Use for structured tasks.


---

*Generated by AI based on the existing PyQt6 desktop application.* 