# Parley 🤖💬

A modern web application for orchestrating AI-to-AI conversations using Anthropic Claude and OpenAI GPT models. Built with FastAPI, Next.js, and TypeScript.

![Parley Demo](https://img.shields.io/badge/Status-Active-brightgreen)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.5-green)

## 🌟 Features

- **AI-to-AI Conversations**: Orchestrate conversations between different AI models
- **Multi-Provider Support**: Support for Anthropic Claude and OpenAI GPT models
- **Real-time Streaming**: Live conversation updates via Server-Sent Events (SSE)
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Conversation Management**: Start, pause, resume, and stop conversations
- **Export Functionality**: Download conversations as JSON files
- **Configurable Parameters**: Customize message limits, delays, and token limits
- **Persona Customization**: Define unique personalities for each AI participant

## 🏗️ Architecture

Parley follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────┐    HTTP/SSE    ┌─────────────────┐
│   Frontend      │ ◄────────────► │    Backend      │
│   (Next.js)     │                │   (FastAPI)     │
│                 │                │                 │
│ • React/TS      │                │ • Python 3.11+  │
│ • Tailwind CSS  │                │ • FastAPI       │
│ • shadcn/ui     │                │ • Pydantic      │
└─────────────────┘                └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │   AI Services   │
                                    │                 │
                                    │ • Anthropic     │
                                    │ • OpenAI        │
                                    └─────────────────┘
```

### Backend (FastAPI)
- **REST API**: Conversation management endpoints
- **Server-Sent Events**: Real-time message streaming
- **Async Architecture**: Non-blocking conversation execution
- **Pydantic Models**: Type-safe data validation
- **In-Memory Storage**: Conversation state management

### Frontend (Next.js)
- **React 19**: Modern React with concurrent features
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible component library
- **Real-time Updates**: SSE integration for live conversations

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **API Keys**: Anthropic and/or OpenAI API keys

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Parley
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys:
# ANTHROPIC_API_KEY=your_anthropic_key_here
# OPENAI_API_KEY=your_openai_key_here

# Start the backend server
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 5. Using the Start Script (Alternative)

For convenience, you can use the provided start script:

```bash
chmod +x start.sh
./start.sh
```

This will start both backend and frontend servers automatically.

## 📖 Usage Guide

### Starting a Conversation

1. **Configure AI Participants**:
   - Select providers (Anthropic/OpenAI) for each AI
   - Choose models (e.g., claude-3-sonnet-20240229, gpt-4)
   - Define personas (optional personality descriptions)

2. **Set Conversation Parameters**:
   - **Initial Prompt**: The starting message for the conversation
   - **Message Limit**: Maximum number of messages (1-1000)
   - **Message Delay**: Time between messages in milliseconds
   - **Max Tokens**: Maximum tokens per response (50-4000)

3. **Start the Conversation**:
   - Click "Start Conversation" to begin
   - Watch the conversation unfold in real-time
   - Use pause/resume/stop controls as needed

### Managing Conversations

- **Pause**: Temporarily halt the conversation
- **Resume**: Continue from where you left off
- **Stop**: End the conversation permanently
- **Download**: Export the conversation as JSON

### Real-time Features

- **Live Updates**: Messages appear as they're generated
- **Status Indicators**: See conversation state (running, paused, completed)
- **Message Counter**: Track conversation progress

## 🔧 API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/conversation/start` | Start a new conversation |
| `GET` | `/conversation/{id}` | Get conversation details |
| `GET` | `/conversation/{id}/stream` | Stream messages via SSE |
| `POST` | `/conversation/{id}/pause` | Pause conversation |
| `POST` | `/conversation/{id}/resume` | Resume conversation |
| `POST` | `/conversation/{id}/stop` | Stop conversation |
| `GET` | `/conversation/{id}/download` | Download conversation JSON |

### Data Models

#### ConversationConfig
```typescript
{
  ai1: {
    provider: "anthropic" | "openai",
    model: string,
    persona?: string
  },
  ai2: {
    provider: "anthropic" | "openai", 
    model: string,
    persona?: string
  },
  initial_prompt: string,
  message_limit: number,
  message_delay_ms: number,
  max_tokens_per_response: number
}
```

#### ChatMessage
```typescript
{
  id: string,
  conversation_id: string,
  sender: "ai1" | "ai2" | "system",
  content: string,
  timestamp: string,
  tokens?: number
}
```

## 🛠️ Development

### Project Structure

```
Parley/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── services/       # Business logic
│   │   ├── models.py       # Pydantic models
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt    # Python dependencies
│   └── test_api.py         # API tests
├── frontend/               # Next.js frontend
│   ├── src/
│   │   └── app/
│   │       ├── components/ # React components
│   │       ├── layout.tsx  # App layout
│   │       └── page.tsx    # Main page
│   ├── package.json        # Node dependencies
│   └── tsconfig.json       # TypeScript config
├── start.sh               # Development startup script
└── README.md              # This file
```

### Development Commands

#### Backend
```bash
cd backend

# Run tests
pytest

# Format code
black app/

# Type checking
mypy app/

# Start with auto-reload
python -m uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build

# Start development server
npm run dev
```

### Environment Variables

#### Backend (.env)
```bash
# API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest test_api.py -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Docker Deployment

1. **Build Images**:
```bash
# Backend
docker build -t parley-backend ./backend

# Frontend
docker build -t parley-frontend ./frontend
```

2. **Docker Compose**:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Cloud Deployment

#### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

#### Railway (Backend)
```bash
cd backend
railway up
```

#### Fly.io (Full Stack)
```bash
fly launch
fly deploy
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow **TypeScript** best practices
- Use **Pydantic** for data validation
- Write **comprehensive tests**
- Update **documentation** for new features
- Follow **conventional commits**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for Claude API
- **OpenAI** for GPT API
- **FastAPI** for the excellent web framework
- **Next.js** for the React framework
- **shadcn/ui** for the component library
- **Tailwind CSS** for the styling framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/parley/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/parley/discussions)
- **Documentation**: [Wiki](https://github.com/your-repo/parley/wiki)

---

**Made with ❤️ for AI research and experimentation** 
