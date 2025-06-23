from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import List
import logging
import io
from datetime import datetime

from app.models.analytics import ConversationAnalytics, ConversationSummary
from app.services.analytics_service import AnalyticsService
from app.services.analytics_pdf_export import generate_analytics_pdf
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

@router.get("/{conversation_id}/export-pdf")
@limiter.limit("5/minute")  # Stricter limit for PDF generation
async def export_analytics_pdf(request: Request, conversation_id: str):
    """Export conversation analytics as a PDF report"""
    try:
        if conversation_id not in conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        manager = conversations[conversation_id]
        
        # Ensure the conversation has messages to analyze
        if not manager.messages:
            raise HTTPException(status_code=400, detail="Conversation has no messages to analyze")
        
        # Generate analytics
        analytics = analytics_service.analyze_conversation(
            conversation_id=conversation_id,
            messages=manager.messages,
            config=manager.config
        )
        
        # Generate PDF
        pdf_bytes = generate_analytics_pdf(
            conversation_id=conversation_id,
            analytics=analytics,
            config=manager.config,
            created_at=manager.created_at
        )
        
        # Create filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"parley_analytics_{conversation_id[:8]}_{timestamp}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404, 400)
        raise
    except Exception as e:
        logger.error(f"Failed to export analytics PDF for {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to export analytics PDF")