# Front-End Implementation Plan

## 0. Goals
Single-page React (TypeScript) application that allows users to configure two AI bots, start/stop a streamed conversation, watch messages render in real-time, tweak bot settings mid-run, and download the transcript as JSON.  Minimal build setup, modern UI via shadcn/ui (Tailwind).

---
## 1. Tech Stack
* **React 18 + TypeScript**
* **Vite** – fast dev server & bundler
* **shadcn/ui** – Pre-styled components (TailwindCSS)
* **TailwindCSS** – Utility-first styling
* **Radix Icons** – UI icons
* **zustand** or **React Context + useReducer** – Local state (we choose Context to avoid extra dep)
* **Axios** – HTTP client with Basic-Auth helper
* **file-saver** – Trigger JSON download

`package.json` scripts:
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

---
## 2. Directory Structure (`frontend/src`)
```
src/
 ├── api/
 │     └── client.ts        # axios instance with auth header helper
 │     └── runs.ts          # startRun, streamRun, patchBot, stopRun, downloadJson
 ├── hooks/
 │     └── useSSE.ts        # generic SSE subscription hook with reconnection
 ├── components/
 │     ├── BotConfigCard.tsx
 │     ├── ConversationPanel.tsx
 │     ├── Transcript.tsx
 │     ├── MessageBubble.tsx
 │     ├── HeaderBar.tsx    # title & light/dark toggle
 │     ├── ErrorBoundary.tsx # Global error boundary
 │     └── LoadingSpinner.tsx # Reusable loading indicator
 ├── context/
 │     └── AppState.tsx     # reducer + provider
 ├── pages/
 │     └── HomePage.tsx     # composes everything
 ├── types/
 │     └── index.ts         # BotConfig, ChatMessage, RunCreate, etc.
 ├── lib/
 │     └── utils.ts         # tokenCountApprox, scroll helpers, etc.
 ├── styles/
 │     └── index.css        # Tailwind entry (via shadcn preset)
 ├── App.tsx
 └── main.tsx
```

---
## 3. Key Components & Responsibilities
1. **BotConfigCard**
   * Props: `index (0|1)`, `config`, `dispatch`.
   * Fields: Bot name, Provider+Model `Select`, System Prompt `Textarea`, Temperature `Slider`.
   * On change: immediately dispatch local state **and** (if `state.status === "running"`) call `PATCH /api/run/{id}/bot/{index}` so changes apply on the next turn.
   * Fields remain *enabled* during a run, but show a subtle "(will apply next turn)" tooltip when edited.

2. **ConversationPanel**
   * Fields: Initial Topic + Max Turns (`Input`), **Start** / **Stop** / **Export** buttons.
   * Start → `POST /api/run` then open SSE via `useSSE`.
   * Stop → `POST /api/run/{id}/stop`.
   * Export enabled when `state.transcript.length > 0`.

3. **Transcript** & **MessageBubble**
   * Renders streaming content; active assistant bolded.
   * Auto-scroll to bottom on new tokens.

4. **useSSE hook**
   * Accepts `url`, onMessage callback, optional retry config.
   * Internally uses `EventSource` with automatic reconnection on disconnect.
   * Exponential backoff for retries (1s, 2s, 4s... max 30s).
   * Cleans up on `useEffect` dispose.

5. **AppState Context**
   ```ts
   interface AppState {
     bots: [BotConfig, BotConfig];
     topic: string;
     maxTurns: number;
     runId?: string;
     status: 'idle' | 'running' | 'finished' | 'error';
     transcript: ChatMessage[];
     error?: string;
     isLoading: boolean;  // For API call states
   }
   ```
   * Reducer actions: `UPDATE_BOT`, `SET_TOPIC`, `SET_MAX_TURNS`, `START_RUN`, `APPEND_DELTA`, `FINISH_RUN`, `STOP_RUN`, `ERROR`, `SET_LOADING`.

6. **ErrorBoundary**
   * Wraps the entire app to catch React errors.
   * Shows fallback UI with error message and reset button.
   * Logs errors to console in development.

7. **LoadingSpinner**
   * Reusable loading indicator component.
   * Used during API calls (start/stop run, export).

---
## 4. API Layer (`api/runs.ts`)
```ts
export const startRun = (payload: RunCreate) => axios.post<{id: string}>('/api/run', payload);
export const streamRun = (id: string) => new EventSource(`/api/stream/${id}`);
export const patchBot  = (id: string, idx: 0 | 1, data: Partial<BotConfig>) =>
  axios.patch(`/api/run/${id}/bot/${idx}`, data);
export const stopRun   = (id: string) => axios.post(`/api/run/${id}/stop`);
export const downloadJson = (id: string) => axios.get(`/api/export/${id}.json`, { responseType: 'blob' });
```
`client.ts` attaches Basic Auth header using stored password (ask once via modal if 401 seen).
Note: `patchBot` is present because mid-conversation edits **are supported**.

---
## 5. Auth Flow (shared password)
1. First API call that returns 401 triggers a **PasswordModal**.
2. Store entered password in `sessionStorage` (not persisted across tabs).
3. Axios interceptor adds `Authorization: Basic base64(user:pw)`.

DEV_MODE=true ⇒ backend disables auth so frontend skips modal.

---
## 6. Styling & UX Touches
* Dark theme by default (matches mock).  Use Tailwind config `darkMode: 'class'`.
* Color accents: Bot1 (blue), Bot2 (green).
* Slider shows numeric value (temperature) on thumb.
* Toast notifications for errors / rate-limit responses (via `sonner` or shadcn Toast).
* Loading states:
  - Button spinners during API calls (Start becomes "Starting..." with spinner)
  - Skeleton loaders for initial data fetches
  - Disable form inputs during active API operations

---
## 7. Build & Dev
```bash
# bootstrap
pnpm i

# dev server (proxy /api → :8000)
pnpm dev

# prod build
pnpm build
```
`vite.config.ts` sets proxy:
```ts
server: { proxy: { '/api': 'http://localhost:8000' } }
```

---
## 8. Testing
* **Vitest + React Testing Library** for unit tests of reducer & components.
* Cypress (optional) for E2E start/stop/export happy path.

---
## 9. Stretch / Milestone-2 Notes
* Persist past runs in localStorage or call `/api/runs` (when backend DB ready).
* PDF export button (hide until backend supports).
* Model-specific advanced params (top_p, max_tokens).
* Shareable link: encode runId into URL and request from backend if still stored. 