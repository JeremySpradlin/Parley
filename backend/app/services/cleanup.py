import asyncio
import logging
from typing import Dict
from datetime import datetime, timedelta

from app.services.conversation_manager import ConversationManager
from app.models import ConversationStatus

logger = logging.getLogger(__name__)

async def cleanup_conversations_periodically(
    conversations: Dict[str, ConversationManager],
    interval_seconds: int,
    max_age_seconds: int = 3600  # 1 hour
):
    """
    Periodically checks for and removes old, completed or errored conversations.
    """
    while True:
        await asyncio.sleep(interval_seconds)
        
        now = datetime.utcnow()
        ids_to_remove = []
        
        logger.info(f"Running cleanup task. Currently {len(conversations)} conversations in memory.")
        
        for convo_id, manager in conversations.items():
            is_done = manager.status in [ConversationStatus.COMPLETED, ConversationStatus.ERROR]
            age = now - manager.created_at
            
            if is_done and age > timedelta(seconds=max_age_seconds):
                ids_to_remove.append(convo_id)
        
        if ids_to_remove:
            logger.info(f"Removing {len(ids_to_remove)} old conversations: {ids_to_remove}")
            for convo_id in ids_to_remove:
                del conversations[convo_id]
        else:
            logger.info("No old conversations to remove.") 