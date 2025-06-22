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
        self._message_queue = asyncio.Queue()
        
    async def run(self):
        """Run the conversation loop"""
        try:
            self.status = ConversationStatus.RUNNING
            
            # Add initial prompt as system message
            initial_msg = ChatMessage(
                id=str(uuid.uuid4()),
                conversation_id=self.conversation_id,
                sender="system",
                content=self.config.initial_prompt,
                timestamp=datetime.utcnow()
            )
            await self._add_message(initial_msg)
            
            current_turn = "ai1"
            message_count = 0
            
            while message_count < self.config.message_limit and not self._stop_event.is_set():
                # Wait if paused
                await self._pause_event.wait()
                
                # Check if stopped
                if self._stop_event.is_set():
                    break
                
                # Get conversation history for context
                history = self._format_history()
                
                # Get current AI config and persona
                ai_config = self.config.ai1 if current_turn == "ai1" else self.config.ai2
                
                # Get AI response
                try:
                    response = await get_ai_response(
                        provider=ai_config.provider,
                        model=ai_config.model,
                        messages=history,
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
                    self.status = ConversationStatus.ERROR
                    error_msg = ChatMessage(
                        id=str(uuid.uuid4()),
                        conversation_id=self.conversation_id,
                        sender="system",
                        content=f"Error: {str(e)}",
                        timestamp=datetime.utcnow()
                    )
                    await self._add_message(error_msg)
                    break
            
            self.status = ConversationStatus.COMPLETED
            
        except Exception as e:
            logger.error(f"Conversation error: {e}")
            self.status = ConversationStatus.ERROR
    
    async def _add_message(self, message: ChatMessage):
        """Add a message and notify listeners"""
        self.messages.append(message)
        await self._message_queue.put(message)
    
    def _format_history(self) -> List[dict]:
        """Format conversation history for AI context"""
        history = []
        for msg in self.messages:
            if msg.sender == "system":
                history.append({"role": "system", "content": msg.content})
            elif msg.sender == "ai1":
                history.append({"role": "assistant", "content": msg.content})
            elif msg.sender == "ai2":
                history.append({"role": "user", "content": msg.content})
        return history
    
    async def stream(self) -> AsyncGenerator[ChatMessage, None]:
        """Stream messages as they're added"""
        while True:
            message = await self._message_queue.get()
            yield message
            if self.status in [ConversationStatus.COMPLETED, ConversationStatus.ERROR]:
                break
    
    async def pause(self):
        """Pause the conversation"""
        self._pause_event.clear()
        self.status = ConversationStatus.PAUSED
    
    async def resume(self):
        """Resume the conversation"""
        self._pause_event.set()
        self.status = ConversationStatus.RUNNING
    
    async def stop(self):
        """Stop the conversation"""
        self._stop_event.set()
        self._pause_event.set()  # Unpause to allow exit
        self.status = ConversationStatus.COMPLETED