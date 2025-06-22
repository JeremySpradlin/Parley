import os
from typing import List, Optional
import logging
from app.models import Provider
from app.config import settings

logger = logging.getLogger(__name__)

async def get_ai_response(
    provider: Provider,
    model: str,
    conversation_history: List[dict],
    current_speaker: str,
    persona: Optional[str] = None,
    max_tokens: int = 500
) -> str:
    """Get response from AI provider with proper perspective handling"""
    
    # Build dynamic system prompt like the desktop app
    system_prompt = f"""You are {current_speaker.upper()}. {persona or 'You are a helpful AI assistant.'}

You are having a conversation with another AI. Keep your responses conversational,
thoughtful, and engaging. Aim for 1-3 sentences unless the topic requires more depth."""
    
    # Format conversation history with proper role perspective
    formatted_messages = _format_conversation_for_speaker(conversation_history, current_speaker)
    
    try:
        if provider == Provider.ANTHROPIC:
            return await _get_anthropic_response(model, system_prompt, formatted_messages, max_tokens)
        elif provider == Provider.OPENAI:
            return await _get_openai_response(model, system_prompt, formatted_messages, max_tokens)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    except Exception as e:
        logger.error(f"AI service error: {e}")
        raise

def _format_conversation_for_speaker(conversation_history: List[dict], current_speaker: str) -> List[dict]:
    """Format conversation history from the current speaker's perspective"""
    formatted_messages = []
    
    for msg in conversation_history:
        if msg["sender"] == "system":
            # Skip system messages as they're handled separately
            continue
        elif msg["sender"] == current_speaker:
            # Current speaker's own messages are "assistant" role
            formatted_messages.append({
                "role": "assistant",
                "content": msg["content"]
            })
        else:
            # Other speaker's messages are "user" role
            formatted_messages.append({
                "role": "user", 
                "content": msg["content"]
            })
    
    return formatted_messages

async def _get_anthropic_response(model: str, system_prompt: str, messages: List[dict], max_tokens: int) -> str:
    """Get response from Anthropic Claude"""
    if not settings.anthropic_api_key:
        raise ValueError("Anthropic API key not configured")
    
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        
        # Ensure conversation starts with user message for Anthropic
        if not messages or messages[0]["role"] != "user":
            messages.insert(0, {"role": "user", "content": "Please respond to the following conversation."})
        
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages
        )
        
        return response.content[0].text
        
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        raise

async def _get_openai_response(model: str, system_prompt: str, messages: List[dict], max_tokens: int) -> str:
    """Get response from OpenAI"""
    if not settings.openai_api_key:
        raise ValueError("OpenAI API key not configured")
    
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        
        # Add system prompt as first message for OpenAI
        openai_messages = [{"role": "system", "content": system_prompt}] + messages
        
        response = await client.chat.completions.create(
            model=model,
            messages=openai_messages,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise