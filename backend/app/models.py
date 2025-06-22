from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from enum import Enum

class Provider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"

class ConversationStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"

class AIConfig(BaseModel):
    provider: Provider
    model: str
    persona: Optional[str] = None

class ConversationConfig(BaseModel):
    ai1: AIConfig
    ai2: AIConfig
    initial_prompt: str
    message_limit: int = Field(default=50, ge=1, le=1000)
    message_delay_ms: int = Field(default=1000, ge=0, le=60000)
    max_tokens_per_response: int = Field(default=500, ge=50, le=4000)

class ChatMessage(BaseModel):
    id: str
    conversation_id: str
    sender: Literal["ai1", "ai2", "system"]
    content: str
    timestamp: datetime
    tokens: Optional[int] = None

class ConversationStart(BaseModel):
    config: ConversationConfig

class ConversationResponse(BaseModel):
    id: str
    status: ConversationStatus
    created_at: datetime
    message_count: int = 0

class ConversationDetail(ConversationResponse):
    config: ConversationConfig
    messages: List[ChatMessage] = []