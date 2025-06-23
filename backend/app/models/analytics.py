from pydantic import BaseModel
from typing import List, Dict

class SentimentPoint(BaseModel):
    message_index: int
    sentiment_polarity: float
    sentiment_subjectivity: float
    speaker: str

class WordFrequency(BaseModel):
    text: str
    value: int

class ConversationAnalytics(BaseModel):
    conversation_id: str
    sentiment_over_time: List[SentimentPoint]
    topic_keywords: List[WordFrequency]
    readability_score: float
    vocabulary_richness: float
    message_counts: Dict[str, int]
    avg_response_time_seconds: float
    question_ratio: Dict[str, float]

class ConversationSummary(BaseModel):
    id: str
    status: str
    name: str
    message_count: int
    created_at: str