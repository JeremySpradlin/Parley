from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import conversation, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Parley API...")
    yield
    logger.info("Shutting down Parley API...")

app = FastAPI(
    title="Parley API",
    description="API for AI-to-AI conversation management",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(conversation.router, prefix="/conversation", tags=["conversation"])