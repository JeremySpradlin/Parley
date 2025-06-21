# Backend Implementation Plan

## 0. Goals
Build a FastAPI service that streams a conversation between two configurable AI agents (OpenAI & Anthropic), protects API-key usage with Basic Auth + rate-limit, and exposes a JSON export endpoint.  Designed for easy extension (PDF export, DB persistence) in later milestones.

---
## 1. Tech Stack & Dependencies
* **Python ≥ 3.10**  (async features)
* **FastAPI**  – Web framework
* **Uvicorn**  – ASGI server
* **httpx[http2]**  – Async HTTP client to providers
* **sse-starlette**  – Helper for Server-Sent Events (SSE)
* **pydantic**  – Schemas / validation
* **python-uuid**  – Run IDs (std-lib uuid)
* **slowapi**  – IP rate limiting (optional-Redis backend)
* **passlib[bcrypt]**  – Password hashing (Basic Auth)
* **python-dotenv**  – Local env loading during dev (DEV_MODE)
* **openai**  – OpenAI Python SDK for GPT models
* **anthropic**  – Anthropic Python SDK for Claude models
* **structlog**  – Structured logging for production debugging

`requirements.txt` will list pinned versions for reproducible deploys.

---
## 2. Environment Variables
| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Key for OpenAI models |
| `ANTHROPIC_API_KEY` | Key for Anthropic models |
| `BASIC_AUTH_USER` | Username for Basic Auth |
| `BASIC_AUTH_PW_HASH` | `bcrypt` hash of the single shared password |
| `DEV_MODE` | When `true`, disables auth + rate-limit |
| `RUN_MAX_TURNS` | (optional) absolute cap per conversation |

---
## 3. Project Structure (`backend/app`)
```
app/
  ├── main.py            # FastAPI factory & middleware
  ├── api/
  │     ├── run.py       # REST endpoints
  │     └── __init__.py
  ├── core/
  │     ├── security.py  # BasicAuth & DEV_MODE toggles
  │     ├── rate_limit.py
  │     └── settings.py  # Pydantic BaseSettings loader
  ├── services/
  │     ├── orchestrator.py  # RunManager, conversation loop
  │     └── providers/
  │           ├── base.py
  │           ├── openai.py
  │           └── anthropic.py
  ├── schemas.py         # Pydantic models shared across routes
  └── utils.py
```

---
## 4. API Surface
| Method | Path | Body / Query | Purpose |
|--------|------|--------------|---------|
| POST | `/api/run` | `RunCreate` (2 bots, max_turns, topic) | Start run, returns `{id}` |
| GET  | `/api/stream/{id}` | – | SSE stream of token deltas & turn markers |
| PATCH | `/api/run/{id}/bot/{index}` | `BotPatch` (prompt?, temperature?) | Update bot config mid-conversation |
| POST | `/api/run/{id}/stop` | – | Cancel background task |
| GET  | `/api/export/{id}.json` | – | Final or partial transcript download |
| GET  | `/health` | – | Health check endpoint for monitoring |

All `/api/**` guarded by Basic Auth unless `DEV_MODE=true`.

Note: Mid-run bot-config edits **are supported**. Frontend can tweak a bot's temperature or prompt; changes take effect on the very next turn.

---
## 5. Conversation Orchestration Logic
1. **RunManager** creates `asyncio.Task` per conversation.
2. Internal state:
   ```python
   transcript: list[ChatMessage]
   bots: list[BotConfig]  # this dict may be patched at runtime via PATCH endpoint
   cancelled: asyncio.Event
   status: str  # 'running', 'completed', 'cancelled', 'error'
   error_message: Optional[str]
   ```
3. Loop with enhanced error handling:
   ```python
   for turn in range(max_turns):
       if cancelled.is_set(): break
       agent_idx = turn % 2  # 0,1,0,1…
       
       # Build full conversation history for context
       messages = [{"role": "user" if i == 0 else f"assistant", 
                    "content": msg.content} for i, msg in enumerate(transcript)]
       if not messages:  # First turn
           messages = [{"role": "user", "content": initial_topic}]
       
       try:
           # Use the *latest* config (could have been patched during run)
           response_stream = providers[agent_idx].stream(messages, bots[agent_idx])
           full_content = ""
           async for delta in response_stream:
               full_content += delta
               yield {"type": "token", "role": f"bot{agent_idx}", "delta": delta}
           transcript.append(ChatMessage(role=f"bot{agent_idx}", content=full_content))
           yield {"type": "turn_complete", "turn": turn}
       except Exception as e:
           error_msg = f"Provider error: {str(e)}"
           yield {"type": "error", "message": error_msg}
           status = "error"
           error_message = error_msg
           break
   ```
4. On completion, cancel, or error, mark run with appropriate status for `/export`.
5. Implement cleanup handler to ensure resources are freed on task cancellation.

---
## 6. Provider Abstraction
`ProviderBase` with:
* `async def stream(self, messages: list[dict], cfg: BotConfig) -> AsyncGenerator[str]`
* `async def validate_config(self, cfg: BotConfig) -> bool`
* Error handling for rate limits, network issues, and API errors

`openai.py` and `anthropic.py` implement via their SDKs' streaming APIs with:
* Proper message format conversion for each provider
* Retry logic with exponential backoff for transient errors
* Token counting/estimation for each provider's limits

---
## 7. Security Layer
* **BasicAuth** via `fastapi.security.HTTPBasic`.
* Hash check with `passlib.context.CryptContext`.
* Middleware short-circuit when `DEV_MODE`.
* `slowapi` decorator `@limiter.limit("10/minute")` on `/api/run`.

---
## 8. Tests
* `pytest-asyncio` for async route tests.
* Mock provider streams with `async_generator` fixtures.

---
## 9. Local Dev Commands
```bash
# Install deps
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run API (auth disabled in DEV_MODE)
DEV_MODE=true uvicorn app.main:app --reload
```

---
## 10. Additional Implementation Notes

### SSE Connection Management
* Implement proper SSE heartbeat (`:keepalive`) every 30 seconds to prevent proxy timeouts
* Handle client disconnections gracefully with try/finally blocks
* Buffer partial tokens from providers before yielding to ensure valid UTF-8

### Logging Strategy
* Use structured logging with request IDs for tracing conversations
* Log provider API calls with timing information
* Never log API keys or full prompts (only first 50 chars for debugging)

### Graceful Shutdown
* Implement FastAPI shutdown event handler
* Cancel all active conversation tasks with timeout
* Allow ongoing SSE streams to complete or timeout gracefully

### Implementation Order
1. Core settings and project structure
2. Schemas and Pydantic models
3. Provider abstraction and mock implementations
4. Basic auth and security layer
5. RunManager and orchestration logic (without streaming)
6. API endpoints (without SSE)
7. SSE streaming implementation
8. Real provider integrations (OpenAI, Anthropic)
9. Rate limiting
10. Comprehensive test suite

## 11. Stretch / Milestone-2 Notes
* PostgreSQL via SQLModel for persistent runs.
* PDF export (WeasyPrint).
* OAuth-based login instead of shared password.
* WebSocket support as alternative to SSE for bidirectional communication. 