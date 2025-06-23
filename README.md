# Parley

A web application for running, monitoring, and analyzing conversations between large language models.

## Features

- **Real-time Conversation Streaming**: Watch AI-to-AI conversations unfold in real-time using Server-Sent Events (SSE).
- **Configurable Participants**: Set the provider (OpenAI, Anthropic), model, and persona for two different AIs.
- **Conversation Controls**: Start, pause, resume, and stop conversations on the fly.
- **Exporting**: Download conversation transcripts as JSON or a formatted PDF.
- **Secure & Performant**: Built with a modern tech stack, including rate limiting and asynchronous background tasks.

## Tech Stack

- **Backend**: Python 3.11, FastAPI, Uvicorn
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js & npm
- An OpenAI API Key
- An Anthropic API Key

### Installation & Running

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Parley
    ```

2.  **Setup Backend:**
    ```bash
    # Navigate to the backend directory
    cd backend

    # Create and activate a virtual environment
    python3 -m venv .venv
    source .venv/bin/activate

    # Install dependencies
    pip install -r requirements.txt

    # Create a .env file for your API keys
    cp .env.example .env
    # Add your keys to the .env file
    ```

3.  **Setup Frontend:**
    ```bash
    # Navigate to the frontend directory
    cd frontend

    # Install dependencies
    npm install

    # Create a local environment file for the frontend
    # You can copy the example if you need to change the default API URL
    cp .env.local.example .env.local
    ```

4.  **Run the Application:**
    - In one terminal, run the backend server:
      ```bash
      cd backend
      uvicorn app.main:app --reload
      ```
    - In another terminal, run the frontend dev server:
      ```bash
      cd frontend
      npm run dev
      ```
    - Open your browser to `http://localhost:3000`.

---

## Configuration

You can customize the application's behavior by editing files in the `backend` directory.

### Rate Limiting

The application includes two levels of rate limiting to prevent abuse and manage costs.

#### 1. General API Limit

This is a default limit applied to all API requests.

-   **Default:** 100 requests per minute per IP address.
-   **To Change:**
    1.  Open `backend/app/limiter.py`.
    2.  Modify the string in the `Limiter` object.

    ```python
    # Example: Change to 200 requests per minute
    limiter = Limiter(key_func=get_remote_address, default_limits=["200 per minute"])
    ```

#### 2. Conversation Start Limit

This is a stricter limit applied only to the endpoint that starts new conversations, as it is the most resource-intensive action.

-   **Default:** 10 conversations per hour per IP address.
-   **To Change:**
    1.  Open `backend/app/api/conversation.py`.
    2.  Find the `@limiter.limit` decorator above the `start_conversation` function and change the value.

    ```python
    # Example: Change to 25 conversations per hour
    @router.post("/start", response_model=ConversationResponse)
    @limiter.limit("25/hour")
    async def start_conversation(request: Request, start_request: ConversationStart):
        # ...
    ```

### Conversation Cleanup

Old, completed conversations are automatically removed from memory to prevent leaks.

-   **Default:** Conversations are removed 1 hour (3600 seconds) after they are completed. The cleanup task runs every 10 minutes (600 seconds).
-   **To Change:**
    1.  Open `backend/app/main.py`.
    2.  Find the `lifespan` function.
    3.  Adjust the `max_age_seconds` or the interval in the `cleanup_conversations_periodically` call.

    ```python
    # Example: Keep conversations for 2 hours (7200 seconds)
    cleanup_task = asyncio.create_task(cleanup_conversations_periodically(conversations, 600, max_age_seconds=7200))
    ```
