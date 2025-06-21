# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Backend Focus

This instance of Claude Code is focused exclusively on implementing the **backend** portion of the Parley application as specified in `backend_plan.md`. While the frontend plan exists for context, all implementation work should be directed at the FastAPI/Python backend only.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server with hot reload
DEV_MODE=true uvicorn app.main:app --reload

# Run tests
pytest

# Run async tests
pytest -v --asyncio-mode=auto

# Run specific test file
pytest tests/test_orchestrator.py -v

# Check code formatting (once configured)
black app/ tests/ --check
ruff check app/ tests/

# Format code (once configured)
black app/ tests/
ruff check app/ tests/ --fix
```

## Architecture

This is the **Parley backend** - a FastAPI service that orchestrates conversations between AI agents (OpenAI and Anthropic) and streams them to clients via Server-Sent Events (SSE).

### Core Technologies
- **FastAPI** - Modern async Python web framework
- **Pydantic** - Data validation and serialization
- **httpx** - Async HTTP client for AI provider APIs
- **sse-starlette** - Server-Sent Events implementation
- **slowapi** - Rate limiting
- **passlib[bcrypt]** - Password hashing for Basic Auth

### Architectural Patterns

1. **Provider Abstraction Pattern**
   - Base provider interface in `services/providers/base.py`
   - Concrete implementations for OpenAI (`openai.py`) and Anthropic (`anthropic.py`)
   - Easy extensibility for new AI providers

2. **Asynchronous Orchestration**
   - Each conversation runs in its own asyncio Task
   - Non-blocking streaming from AI providers
   - Graceful cancellation and error handling

3. **In-Memory State Management**
   - `RunManager` class maintains active conversations
   - Designed for future database persistence
   - Thread-safe operations for concurrent access

### API Endpoints

- **POST /api/run** - Initialize a new conversation between two bots
- **GET /api/stream/{run_id}** - SSE endpoint for real-time token streaming
- **PATCH /api/run/{run_id}/bot/{bot_index}** - Update bot configuration mid-conversation
- **POST /api/run/{run_id}/stop** - Cancel an active conversation
- **GET /api/export/{run_id}.json** - Download conversation transcript

### Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app initialization and middleware
│   ├── api/
│   │   └── run.py          # REST API endpoints
│   ├── core/
│   │   ├── security.py     # Basic auth implementation
│   │   ├── rate_limit.py   # IP-based rate limiting
│   │   └── settings.py     # Environment configuration
│   ├── services/
│   │   ├── orchestrator.py # Conversation orchestration logic
│   │   └── providers/
│   │       ├── base.py     # Abstract provider interface
│   │       ├── openai.py   # OpenAI implementation
│   │       └── anthropic.py # Anthropic implementation
│   ├── schemas.py          # Pydantic models for API
│   └── utils.py           # Shared utilities
├── tests/                  # Pytest test suite
└── requirements.txt        # Python dependencies
```

### Environment Variables

Required in `.env` file:
```
OPENAI_API_KEY=sk-...       # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-... # Anthropic API key
BASIC_AUTH_USER=admin       # Basic auth username
BASIC_AUTH_PW_HASH=$2b$...  # Bcrypt hash of password
DEV_MODE=false              # Set to 'true' to disable auth/rate-limit
RUN_MAX_TURNS=50           # Optional: max conversation turns
```

### Key Implementation Notes

1. **Streaming Architecture**
   - Uses SSE for unidirectional real-time streaming
   - Each token is yielded as received from AI providers
   - Frontend receives incremental updates via EventSource API

2. **Error Handling**
   - Provider errors are caught and streamed as error events
   - Conversation state is updated on errors
   - Graceful cleanup of resources on cancellation

3. **Security Considerations**
   - Never log or expose API keys
   - Basic auth header required for all endpoints (except in DEV_MODE)
   - Rate limiting on conversation creation (10/minute per IP)
   - Password stored as bcrypt hash, never plaintext

4. **Development Mode**
   - Set `DEV_MODE=true` to disable authentication and rate limiting
   - Useful for local development and testing
   - Never use in production

5. **Testing Strategy**
   - Use pytest with async fixtures
   - Mock AI provider responses with `async_generator`
   - Test conversation orchestration logic thoroughly
   - Verify SSE streaming behavior

### Future Enhancements (Milestone 2)
- PostgreSQL integration with SQLModel
- OAuth authentication to replace Basic Auth
- Persistent conversation history
- PDF export functionality
- Model-specific parameters support