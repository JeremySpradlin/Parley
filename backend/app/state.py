from typing import Dict
from app.services.conversation_manager import ConversationManager

# In-memory storage for active conversations
conversations: Dict[str, ConversationManager] = {} 