import re
import logging
from collections import Counter
from datetime import datetime
from typing import List, Dict
import nltk
import textstat
from textblob import TextBlob

from app.models import ChatMessage, ConversationConfig
from app.models.analytics import ConversationAnalytics, SentimentPoint, WordFrequency

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for analyzing conversation content using NLP techniques"""
    
    def __init__(self):
        self._ensure_nltk_data()
    
    def _ensure_nltk_data(self):
        """Download required NLTK data if not present"""
        try:
            nltk.data.find('tokenizers/punkt')
            nltk.data.find('corpora/stopwords')
        except LookupError:
            logger.info("Downloading required NLTK data...")
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
    
    def analyze_conversation(
        self, 
        conversation_id: str,
        messages: List[ChatMessage],
        config: ConversationConfig
    ) -> ConversationAnalytics:
        """
        Perform comprehensive analysis of a conversation
        
        Args:
            conversation_id: Unique identifier for the conversation
            messages: List of chat messages to analyze
            config: Conversation configuration
            
        Returns:
            ConversationAnalytics object with all computed metrics
        """
        try:
            # Basic validation
            if not messages:
                return self._empty_analytics(conversation_id)
            
            # Separate analysis by component
            sentiment_data = self._analyze_sentiment(messages)
            keywords = self._extract_keywords(messages)
            readability = self._calculate_readability(messages)
            vocabulary_richness = self._calculate_vocabulary_richness(messages)
            message_counts = self._count_messages_by_speaker(messages)
            avg_response_time = self._calculate_avg_response_time(messages)
            question_ratios = self._calculate_question_ratios(messages)
            
            return ConversationAnalytics(
                conversation_id=conversation_id,
                sentiment_over_time=sentiment_data,
                topic_keywords=keywords,
                readability_score=readability,
                vocabulary_richness=vocabulary_richness,
                message_counts=message_counts,
                avg_response_time_seconds=avg_response_time,
                question_ratio=question_ratios
            )
            
        except Exception as e:
            logger.error(f"Error analyzing conversation {conversation_id}: {e}")
            return self._empty_analytics(conversation_id)
    
    def _analyze_sentiment(self, messages: List[ChatMessage]) -> List[SentimentPoint]:
        """Analyze sentiment for each message using TextBlob"""
        sentiment_points = []
        
        for i, message in enumerate(messages):
            # Skip system messages
            if message.sender == 'system':
                continue
                
            try:
                blob = TextBlob(message.content)
                
                sentiment_points.append(SentimentPoint(
                    message_index=i,
                    sentiment_polarity=blob.sentiment.polarity,  # -1 to 1
                    sentiment_subjectivity=blob.sentiment.subjectivity,  # 0 to 1
                    speaker=message.sender
                ))
            except Exception as e:
                logger.warning(f"Failed to analyze sentiment for message {i}: {e}")
                continue
        
        return sentiment_points
    
    def _extract_keywords(self, messages: List[ChatMessage]) -> List[WordFrequency]:
        """Extract top keywords from all messages"""
        try:
            from nltk.corpus import stopwords
            from nltk.tokenize import word_tokenize
            
            # Combine all message content
            all_text = " ".join([msg.content for msg in messages if msg.sender != 'system'])
            
            # Clean and tokenize
            all_text = re.sub(r'[^\w\s]', '', all_text.lower())
            tokens = word_tokenize(all_text)
            
            # Remove stopwords and short words
            stop_words = set(stopwords.words('english'))
            filtered_tokens = [
                word for word in tokens 
                if word not in stop_words and len(word) > 2
            ]
            
            # Count frequency and get top 30
            word_counts = Counter(filtered_tokens)
            top_words = word_counts.most_common(30)
            
            return [
                WordFrequency(text=word, value=count) 
                for word, count in top_words
            ]
            
        except Exception as e:
            logger.error(f"Failed to extract keywords: {e}")
            return []
    
    def _calculate_readability(self, messages: List[ChatMessage]) -> float:
        """Calculate Flesch-Kincaid grade level for the conversation"""
        try:
            # Combine all non-system messages
            all_text = " ".join([
                msg.content for msg in messages 
                if msg.sender != 'system' and msg.content.strip()
            ])
            
            if not all_text.strip():
                return 0.0
                
            # Calculate Flesch-Kincaid grade level
            grade_level = textstat.flesch_kincaid_grade(all_text)
            return max(0.0, grade_level)  # Ensure non-negative
            
        except Exception as e:
            logger.error(f"Failed to calculate readability: {e}")
            return 0.0
    
    def _calculate_vocabulary_richness(self, messages: List[ChatMessage]) -> float:
        """Calculate Type-Token Ratio (unique words / total words)"""
        try:
            from nltk.tokenize import word_tokenize
            
            # Combine all non-system messages
            all_text = " ".join([
                msg.content for msg in messages 
                if msg.sender != 'system'
            ])
            
            if not all_text.strip():
                return 0.0
            
            # Clean and tokenize
            all_text = re.sub(r'[^\w\s]', '', all_text.lower())
            tokens = word_tokenize(all_text)
            
            # Filter out very short words
            tokens = [word for word in tokens if len(word) > 1]
            
            if not tokens:
                return 0.0
            
            # Calculate Type-Token Ratio
            unique_words = len(set(tokens))
            total_words = len(tokens)
            
            return unique_words / total_words if total_words > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Failed to calculate vocabulary richness: {e}")
            return 0.0
    
    def _count_messages_by_speaker(self, messages: List[ChatMessage]) -> Dict[str, int]:
        """Count messages per speaker"""
        counts = {}
        for message in messages:
            if message.sender != 'system':
                counts[message.sender] = counts.get(message.sender, 0) + 1
        return counts
    
    def _calculate_avg_response_time(self, messages: List[ChatMessage]) -> float:
        """Calculate average response time between AI messages"""
        try:
            response_times = []
            
            for i in range(1, len(messages)):
                current_msg = messages[i]
                prev_msg = messages[i-1]
                
                # Skip system messages
                if current_msg.sender == 'system' or prev_msg.sender == 'system':
                    continue
                
                # Calculate time difference
                time_diff = (current_msg.timestamp - prev_msg.timestamp).total_seconds()
                if time_diff > 0:  # Ensure positive time difference
                    response_times.append(time_diff)
            
            return sum(response_times) / len(response_times) if response_times else 0.0
            
        except Exception as e:
            logger.error(f"Failed to calculate response times: {e}")
            return 0.0
    
    def _calculate_question_ratios(self, messages: List[ChatMessage]) -> Dict[str, float]:
        """Calculate ratio of questions asked by each speaker"""
        try:
            speaker_stats = {}
            
            for message in messages:
                if message.sender == 'system':
                    continue
                
                if message.sender not in speaker_stats:
                    speaker_stats[message.sender] = {'total': 0, 'questions': 0}
                
                speaker_stats[message.sender]['total'] += 1
                
                # Count questions (messages ending with ?)
                if message.content.strip().endswith('?'):
                    speaker_stats[message.sender]['questions'] += 1
            
            # Calculate ratios
            ratios = {}
            for speaker, stats in speaker_stats.items():
                if stats['total'] > 0:
                    ratios[speaker] = stats['questions'] / stats['total']
                else:
                    ratios[speaker] = 0.0
            
            return ratios
            
        except Exception as e:
            logger.error(f"Failed to calculate question ratios: {e}")
            return {}
    
    def _empty_analytics(self, conversation_id: str) -> ConversationAnalytics:
        """Return empty analytics object for error cases"""
        return ConversationAnalytics(
            conversation_id=conversation_id,
            sentiment_over_time=[],
            topic_keywords=[],
            readability_score=0.0,
            vocabulary_richness=0.0,
            message_counts={},
            avg_response_time_seconds=0.0,
            question_ratio={}
        )