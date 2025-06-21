# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Frontend Focus

This instance of Claude Code is focused exclusively on implementing the **frontend** portion of the Parley application as specified in `frontend_plan.md`. While the backend plan exists for context, all implementation work should be directed at the React/TypeScript frontend only.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (proxies /api to localhost:8000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Run tests (when implemented)
pnpm test

# Lint and typecheck (when configured)
pnpm lint
pnpm typecheck
```

## Architecture Overview

This is a React 18 + TypeScript frontend for Parley, a web app for running conversations between AI agents. The app allows users to configure two AI bots, start/stop streamed conversations, watch messages render in real-time, modify bot settings during conversations, and export transcripts.

### Core Technologies
- **React 18** with TypeScript
- **Vite** for build tooling and dev server
- **shadcn/ui** components (built on Radix UI)
- **TailwindCSS** for styling (dark theme by default)
- **React Context + useReducer** for state management
- **Axios** for HTTP requests with Basic Auth
- **Server-Sent Events (SSE)** for real-time streaming

### Key Architectural Patterns

1. **State Management**: Global app state via React Context pattern with a reducer handling actions like `UPDATE_BOT`, `START_RUN`, `APPEND_DELTA`, etc.

2. **Real-time Streaming**: Custom `useSSE` hook manages EventSource connections for streaming conversation responses from the backend.

3. **API Communication**: All backend calls go through an Axios client configured with Basic Auth interceptor. The API layer abstracts endpoints for starting runs, streaming, patching bot configs, stopping runs, and exporting.

4. **Authentication**: Shared password authentication with modal prompt on 401 responses. Password stored in sessionStorage and attached to requests via Basic Auth header.

5. **Component Structure**:
   - `BotConfigCard`: Manages individual bot configuration (name, model, prompt, temperature)
   - `ConversationPanel`: Controls conversation flow (start/stop/export)
   - `Transcript`: Renders streaming messages with auto-scroll
   - `MessageBubble`: Individual message display with role-based styling

### Backend Integration

The frontend expects a FastAPI backend running on port 8000 with these endpoints (implementing the backend is not part of this frontend-focused instance's scope):
- `POST /api/run` - Start a new conversation
- `GET /api/stream/{id}` - SSE stream for conversation updates
- `PATCH /api/run/{id}/bot/{index}` - Update bot config mid-conversation
- `POST /api/run/{id}/stop` - Stop active conversation
- `GET /api/export/{id}.json` - Download conversation transcript

In development, Vite proxies `/api` requests to `localhost:8000`.

### Important Notes

- The project is currently in planning phase - no actual code exists yet
- Bot 1 uses blue accent colors, Bot 2 uses green
- Dark theme is the default with Tailwind's dark mode configuration
- Temperature sliders show numeric values on the thumb
- Authentication can be disabled by setting `DEV_MODE=true` in the backend