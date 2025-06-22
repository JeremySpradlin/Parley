import os
from typing import List, Optional
import logging
from app.models import Provider
from app.config import settings

logger = logging.getLogger(__name__)

async def get_ai_response(
    provider: Provider,
    model: str,
    messages: List[dict],
    persona: Optional[str] = None,
    max_tokens: int = 500
) -> str:
    """Get response from AI provider"""
    
    # Add persona to system message if provided
    if persona and messages:
        if messages[0].get("role") == "system":
            messages[0]["content"] = f"{messages[0]['content']}\n\nYour persona: {persona}"
        else:
            messages.insert(0, {"role": "system", "content": f"Your persona: {persona}"})
    
    try:
        if provider == Provider.ANTHROPIC:
            return await _get_anthropic_response(model, messages, max_tokens)
        elif provider == Provider.OPENAI:
            return await _get_openai_response(model, messages, max_tokens)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    except Exception as e:
        logger.error(f"AI service error: {e}")
        raise

async def _get_anthropic_response(model: str, messages: List[dict], max_tokens: int) -> str:
    """Get response from Anthropic Claude"""
    if not settings.anthropic_api_key:
        raise ValueError("Anthropic API key not configured")
    
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        
        # Convert messages to Anthropic format
        system_msg = None
        conv_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            elif msg["role"] == "assistant":
                conv_messages.append({"role": "assistant", "content": msg["content"]})
            elif msg["role"] == "user":
                conv_messages.append({"role": "user", "content": msg["content"]})
        
        # Ensure conversation starts with user message for Anthropic
        if not conv_messages or conv_messages[0]["role"] != "user":
            conv_messages.insert(0, {"role": "user", "content": "Please respond to the following conversation."})
        
        response = await client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_msg,
            messages=conv_messages
        )
        
        return response.content[0].text
        
    except Exception as e:
        logger.error(f"Anthropic API error: {e}")
        raise

async def _get_openai_response(model: str, messages: List[dict], max_tokens: int) -> str:
    """Get response from OpenAI"""
    if not settings.openai_api_key:
        raise ValueError("OpenAI API key not configured")
    
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise