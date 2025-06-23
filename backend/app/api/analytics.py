from fastapi import APIRouter, HTTPException, Request
from typing import List
import logging

from app.models.analytics import ConversationAnalytics, ConversationSummary
from app.services.analytics_service import AnalyticsService
from app.state import conversations
from app.limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter()
analytics_service = AnalyticsService()

@router.get("/conversations", response_model=List[ConversationSummary])
@limiter.limit("30/minute")  # Reasonable limit for listing conversations
async def list_conversations(request: Request):
    """Get a list of all conversations available for analytics"""
    try:
        conversation_summaries = []
        
        for conv_id, manager in conversations.items():
            # Generate a descriptive name based on personas or models
            ai1_name = manager.config.ai1.persona[:20] if manager.config.ai1.persona else manager.config.ai1.model
            ai2_name = manager.config.ai2.persona[:20] if manager.config.ai2.persona else manager.config.ai2.model
            
            name = f"{ai1_name} vs {ai2_name}"
            
            conversation_summaries.append(ConversationSummary(
                id=conv_id,
                status=manager.status.value,
                name=name,
                message_count=len(manager.messages),
                created_at=manager.created_at.isoformat()
            ))
        
        # Sort by creation time (newest first)
        conversation_summaries.sort(key=lambda x: x.created_at, reverse=True)
        
        return conversation_summaries
        
    except Exception as e:
        logger.error(f"Failed to list conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversations")

@router.get("/{conversation_id}", response_model=ConversationAnalytics)
@limiter.limit("10/minute")  # Stricter limit for analytics processing
async def analyze_conversation(request: Request, conversation_id: str):
    """Get comprehensive analytics for a specific conversation"""
    try:
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        manager = conversations[conversation_id]
        
        # Ensure the conversation has messages to analyze
        if not manager.messages:
            raise HTTPException(status_code=400, detail="Conversation has no messages to analyze")
        
        # Perform analytics
        analytics = analytics_service.analyze_conversation(
            conversation_id=conversation_id,
            messages=manager.messages,
            config=manager.config
        )
        
        return analytics
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404, 400)
        raise
    except Exception as e:
        logger.error(f"Failed to analyze conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze conversation")