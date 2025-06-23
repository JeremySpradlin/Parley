import asyncio
from typing import List, AsyncGenerator, Optional
from datetime import datetime
import uuid
import logging

from app.models import (
    ConversationConfig, ChatMessage, ConversationStatus, Provider
)
from app.services.ai_service import get_ai_response

logger = logging.getLogger(__name__)

class ConversationManager:
    def __init__(self, conversation_id: str, config: ConversationConfig):
        self.conversation_id = conversation_id
        self.config = config
        self.messages: List[ChatMessage] = []
        self.status = ConversationStatus.IDLE
        self.created_at = datetime.utcnow()
        self._pause_event = asyncio.Event()
        self._pause_event.set()  # Not paused by default
        self._stop_event = asyncio.Event()
        self._event_queue = asyncio.Queue()
        
    async def _dispatch_event(self, event_type: str, data: dict):
        """Dispatch an event to the queue."""
        await self._event_queue.put({"type": event_type, "data": data})

    async def _set_status(self, status: ConversationStatus):
        """Set the conversation status and dispatch an event."""
        if self.status != status:
            self.status = status
            await self._dispatch_event("status_update", {"status": self.status.value})

    async def run(self):
        """Run the conversation loop"""
        try:
            await self._set_status(ConversationStatus.RUNNING)
            
            # Get first AI response to the initial prompt
            current_turn = "ai1"
            message_count = 0
            
            # Start with ai1 responding to the initial prompt
            try:
                ai_config = self.config.ai1
                response = await get_ai_response(
                    provider=ai_config.provider,
                    model=ai_config.model,
                    conversation_history=[],  # Empty history for first message
                    current_speaker="ai1",
                    persona=f"{ai_config.persona}\n\nRespond to this initial prompt: {self.config.initial_prompt}",
                    max_tokens=self.config.max_tokens_per_response
                )
                
                # Create first message
                first_msg = ChatMessage(
                    id=str(uuid.uuid4()),
                    conversation_id=self.conversation_id,
                    sender="ai1",
                    content=response,
                    timestamp=datetime.utcnow()
                )
                await self._add_message(first_msg)
                
                current_turn = "ai2"  # Switch to AI2 for next turn
                message_count = 1
                
            except Exception as e:
                logger.error(f"Error getting initial AI response: {e}")
                await self._set_status(ConversationStatus.ERROR)
                return
            
            while message_count < self.config.message_limit and not self._stop_event.is_set():
                # Wait if paused
                await self._pause_event.wait()
                
                # Check if stopped
                if self._stop_event.is_set():
                    break
                
                # Get current AI config and persona
                ai_config = self.config.ai1 if current_turn == "ai1" else self.config.ai2
                
                # Convert messages to the format expected by ai_service
                conversation_history = [
                    {
                        "sender": msg.sender,
                        "content": msg.content
                    }
                    for msg in self.messages
                ]
                
                # Get AI response
                try:
                    response = await get_ai_response(
                        provider=ai_config.provider,
                        model=ai_config.model,
                        conversation_history=conversation_history,
                        current_speaker=current_turn,
                        persona=ai_config.persona,
                        max_tokens=self.config.max_tokens_per_response
                    )
                    
                    # Create message
                    msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        conversation_id=self.conversation_id,
                        sender=current_turn,
                        content=response,
                        timestamp=datetime.utcnow()
                    )
                    await self._add_message(msg)
                    
                    # Switch turns
                    current_turn = "ai2" if current_turn == "ai1" else "ai1"
                    message_count += 1
                    
                    # Delay between messages
                    if self.config.message_delay_ms > 0:
                        await asyncio.sleep(self.config.message_delay_ms / 1000)
                        
                except Exception as e:
                    logger.error(f"Error getting AI response: {e}")
                    await self._set_status(ConversationStatus.ERROR)
                    error_msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        conversation_id=self.conversation_id,
                        sender="system",
                        content=f"Error: {str(e)}",
                        timestamp=datetime.utcnow()
                    )
                    await self._add_message(error_msg)
                    break
            
            await self._set_status(ConversationStatus.COMPLETED)
            
        except Exception as e:
            logger.error(f"Conversation error: {e}")
            await self._set_status(ConversationStatus.ERROR)
    
    async def _add_message(self, message: ChatMessage):
        """Add a message and dispatch it as an event"""
        self.messages.append(message)
        await self._dispatch_event("message", message.model_dump(mode="json"))
    
    
    async def stream(self) -> AsyncGenerator[dict, None]:
        """Stream events (messages, status changes) as they're added"""
        while True:
            event = await self._event_queue.get()
            yield event
            # Use a special 'end' event to signal stream closure
            if event.get("type") == "status_update" and event["data"]["status"] in [
                ConversationStatus.COMPLETED.value, ConversationStatus.ERROR.value
            ]:
                break
    
    async def pause(self):
        """Pause the conversation"""
        self._pause_event.clear()
        await self._set_status(ConversationStatus.PAUSED)
    
    async def resume(self):
        """Resume the conversation"""
        self._pause_event.set()
        await self._set_status(ConversationStatus.RUNNING)
    
    async def stop(self):
        """Stop the conversation"""
        self._stop_event.set()
        self._pause_event.set()  # Unpause to allow exit
        await self._set_status(ConversationStatus.COMPLETED)