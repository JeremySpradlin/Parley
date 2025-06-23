from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sse_starlette.sse import EventSourceResponse
from typing import Dict, AsyncGenerator
import asyncio
import uuid
import io
from datetime import datetime
import json
import logging

from app.models import (
    ConversationStart, ConversationResponse, ConversationDetail,
    ConversationStatus, ChatMessage
)
from app.services.conversation_manager import ConversationManager
from app.services.pdf_export import generate_conversation_pdf
from app.state import conversations
from app.limiter import limiter
from app.utils import handle_task_exception

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/start", response_model=ConversationResponse)
@limiter.limit("10/hour")  # Stricter limit for creating conversations
async def start_conversation(request: Request, start_request: ConversationStart):
    """Start a new AI-to-AI conversation"""
    conversation_id = str(uuid.uuid4())
    
    try:
        manager = ConversationManager(
            conversation_id=conversation_id,
            config=start_request.config
        )
        conversations[conversation_id] = manager
        
        # Start the conversation in the background
        task = asyncio.create_task(manager.run())
        task.add_done_callback(handle_task_exception)
        
        return ConversationResponse(
            id=conversation_id,
            status=ConversationStatus.RUNNING,
            created_at=datetime.utcnow(),
            message_count=0
        )
    except Exception as e:
        logger.error(f"Failed to start conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{conversation_id}/pause")
async def pause_conversation(request: Request, conversation_id: str):
    """Pause a running conversation"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    await manager.pause()
    
    return {"status": "paused", "conversation_id": conversation_id}

@router.post("/{conversation_id}/resume")
async def resume_conversation(request: Request, conversation_id: str):
    """Resume a paused conversation"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    await manager.resume()
    
    return {"status": "resumed", "conversation_id": conversation_id}

@router.post("/{conversation_id}/stop")
async def stop_conversation(request: Request, conversation_id: str):
    """Stop a conversation"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    await manager.stop()
    
    return {"status": "stopped", "conversation_id": conversation_id}

@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(request: Request, conversation_id: str):
    """Get conversation details and messages"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    return ConversationDetail(
        id=conversation_id,
        status=manager.status,
        created_at=manager.created_at,
        message_count=len(manager.messages),
        config=manager.config,
        messages=manager.messages
    )

@router.get("/{conversation_id}/stream")
async def stream_conversation(request: Request, conversation_id: str):
    """Stream conversation messages via Server-Sent Events"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    
    async def event_generator():
        try:
            # Send existing messages first
            for msg in manager.messages:
                yield {
                    "event": "message",
                    "data": json.dumps(msg.model_dump(mode="json"))
                }
            
            # Then stream new messages
            async for event in manager.stream():
                if await request.is_disconnected():
                    break
                
                yield {
                    "event": event['type'],
                    "data": json.dumps(event['data'])
                }
                
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for conversation {conversation_id}")
            raise
    
    return EventSourceResponse(event_generator())

@router.get("/{conversation_id}/download")
async def download_conversation(request: Request, conversation_id: str):
    """Download conversation data as JSON"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    
    # Prepare download data
    download_data = {
        "conversation_id": conversation_id,
        "status": manager.status.value,
        "created_at": manager.created_at.isoformat(),
        "message_count": len(manager.messages),
        "configuration": {
            "ai1": {
                "provider": manager.config.ai1.provider.value,
                "model": manager.config.ai1.model,
                "persona": manager.config.ai1.persona
            },
            "ai2": {
                "provider": manager.config.ai2.provider.value,
                "model": manager.config.ai2.model,
                "persona": manager.config.ai2.persona
            },
            "initial_prompt": manager.config.initial_prompt,
            "message_limit": manager.config.message_limit,
            "message_delay_ms": manager.config.message_delay_ms,
            "max_tokens_per_response": manager.config.max_tokens_per_response
        },
        "messages": [
            {
                "id": msg.id,
                "sender": msg.sender,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "tokens": msg.tokens
            }
            for msg in manager.messages
        ],
        "export_timestamp": datetime.utcnow().isoformat(),
        "export_version": "1.0"
    }
    
    # Create filename with timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"parley_conversation_{conversation_id[:8]}_{timestamp}.json"
    
    return JSONResponse(
        content=download_data,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Content-Type": "application/json"
        }
    )

@router.get("/{conversation_id}/export-pdf")
async def export_conversation_pdf(request: Request, conversation_id: str):
    """Export conversation as formatted PDF"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    
    try:
        # Generate PDF
        pdf_bytes = generate_conversation_pdf(
            conversation_id=conversation_id,
            config=manager.config,
            messages=manager.messages,
            status=manager.status.value,
            created_at=manager.created_at
        )
        
        # Create filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"parley_conversation_{conversation_id[:8]}_{timestamp}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")