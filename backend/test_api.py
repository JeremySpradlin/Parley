#!/usr/bin/env python3
"""Quick test script for the API"""
import asyncio
import httpx
import json

async def test_api():
    async with httpx.AsyncClient() as client:
        # Test health endpoint
        print("Testing health endpoint...")
        resp = await client.get("http://localhost:8000/health")
        print(f"Health: {resp.json()}\n")
        
        # Test starting a conversation
        print("Starting conversation...")
        config = {
            "config": {
                "ai1": {
                    "provider": "anthropic",
                    "model": "claude-3-5-sonnet-20241022",
                    "persona": "You are a friendly assistant"
                },
                "ai2": {
                    "provider": "openai", 
                    "model": "gpt-4",
                    "persona": "You are a curious questioner"
                },
                "initial_prompt": "Let's have a conversation about the future of AI",
                "message_limit": 5,
                "message_delay_ms": 1000,
                "max_tokens_per_response": 150
            }
        }
        
        resp = await client.post("http://localhost:8000/conversation/start", json=config)
        conversation = resp.json()
        print(f"Started conversation: {conversation}")
        
        # Get conversation details
        conv_id = conversation["id"]
        await asyncio.sleep(2)
        resp = await client.get(f"http://localhost:8000/conversation/{conv_id}")
        print(f"\nConversation details: {json.dumps(resp.json(), indent=2)}")

if __name__ == "__main__":
    asyncio.run(test_api())