import re
import logging
from collections import Counter
from datetime import datetime
from typing import List, Dict
import nltk
import textstat
from textblob import TextBlob
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk import pos_tag, bigrams

from app.models import ChatMessage, ConversationConfig
from app.models.analytics import ConversationAnalytics, SentimentPoint, WordFrequency, TopicSegment

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for analyzing conversation content using NLP techniques"""
    
    def __init__(self):
        self._ensure_nltk_data()
    
    def _ensure_nltk_data(self):
        """Download required NLTK data if not present"""
        packages = ['punkt', 'stopwords', 'averaged_perceptron_tagger', 'wordnet']
        for package_id in packages:
            try:
                # This is a bit of a hack to find the correct path type
                if package_id == 'punkt':
                    nltk.data.find(f'tokenizers/{package_id}')
                elif package_id == 'averaged_perceptron_tagger':
                    nltk.data.find(f'taggers/{package_id}')
                else:
                    nltk.data.find(f'corpora/{package_id}')
            except LookupError:
                logger.info(f"Downloading NLTK package: {package_id}...")
                nltk.download(package_id, quiet=True)
    
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
            key_phrases = self._extract_key_phrases(messages)
            topic_drift = self._analyze_topic_drift(messages)
            readability = self._calculate_readability(messages)
            vocabulary_richness = self._calculate_vocabulary_richness(messages)
            message_counts = self._count_messages_by_speaker(messages)
            avg_response_time = self._calculate_avg_response_time(messages)
            question_ratios = self._calculate_question_ratios(messages)
            
            return ConversationAnalytics(
                conversation_id=conversation_id,
                sentiment_over_time=sentiment_data,
                topic_keywords=key_phrases,
                topic_drift=topic_drift,
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
    
    def _extract_key_phrases(self, messages: List[ChatMessage]) -> List[WordFrequency]:
        """Extract top key phrases (bigrams) and words from all messages."""
        try:
            all_text = " ".join([msg.content for msg in messages if msg.sender != 'system'])
            
            # Clean and tokenize
            all_text = re.sub(r'[^\w\s]', '', all_text.lower())
            tokens = word_tokenize(all_text)
            
            # Lemmatize tokens to group words like "task" and "tasks"
            lemmatizer = WordNetLemmatizer()
            lemmatized_tokens = [lemmatizer.lemmatize(token) for token in tokens]

            # Part-of-speech tagging is crucial for finding meaningful phrases
            tagged_tokens = pos_tag(lemmatized_tokens)

            stop_words = set(stopwords.words('english'))
            
            # Filter for meaningful words (nouns, adjectives)
            def is_good_pos(pos_tag):
                return pos_tag.startswith('NN') or pos_tag.startswith('JJ')

            filtered_words = [
                word for word, tag in tagged_tokens
                if word not in stop_words and len(word) > 2 and is_good_pos(tag)
            ]
            
            # --- Single Keywords ---
            word_counts = Counter(filtered_words)

            # --- Key Phrases (Bigrams) ---
            # Create two-word phrases from the meaningful words
            phrase_counts = Counter(" ".join(phrase) for phrase in bigrams(filtered_words))

            # Combine single words and phrases, giving phrases a higher weight
            combined_counts = Counter()
            for word, count in word_counts.items():
                combined_counts[word] = count
            for phrase, count in phrase_counts.items():
                combined_counts[phrase] = count * 1.5  # Boost score for phrases

            # Get the top 20 most common phrases and words
            top_items = combined_counts.most_common(20)

            return [
                WordFrequency(text=item, value=int(score))
                for item, score in top_items if score > 1 # Only include items mentioned more than once
            ]

        except Exception as e:
            logger.error(f"Failed to extract key phrases: {e}")
            return []
    
    def _analyze_topic_drift(self, messages: List[ChatMessage]) -> List[TopicSegment]:
        """Analyze how topics change throughout the conversation by dividing into segments"""
        try:
            # Filter out system messages
            user_messages = [msg for msg in messages if msg.sender != 'system']
            
            if len(user_messages) < 4:  # Need at least 4 messages for meaningful segments
                return []
            
            # Divide conversation into segments (aim for 3-5 segments)
            num_segments = min(5, max(3, len(user_messages) // 3))
            segment_size = len(user_messages) // num_segments
            
            segments = []
            previous_topics = set()
            
            for i in range(num_segments):
                start_idx = i * segment_size
                end_idx = start_idx + segment_size if i < num_segments - 1 else len(user_messages)
                
                segment_messages = user_messages[start_idx:end_idx]
                segment_topics = self._extract_segment_topics(segment_messages)
                
                # Calculate topic shift score (how much topics changed from previous segment)
                current_topics = set(topic.text for topic in segment_topics)
                
                if i == 0:
                    topic_shift_score = 0.0  # First segment has no shift
                else:
                    # Calculate Jaccard similarity (intersection / union)
                    intersection = len(current_topics & previous_topics)
                    union = len(current_topics | previous_topics)
                    similarity = intersection / union if union > 0 else 0.0
                    topic_shift_score = 1.0 - similarity  # Higher score = more drift
                
                segments.append(TopicSegment(
                    segment_index=i,
                    start_message=start_idx,
                    end_message=end_idx - 1,
                    dominant_topics=segment_topics,
                    topic_shift_score=topic_shift_score
                ))
                
                previous_topics = current_topics
            
            return segments
            
        except Exception as e:
            logger.error(f"Failed to analyze topic drift: {e}")
            return []
    
    def _extract_segment_topics(self, messages: List[ChatMessage]) -> List[WordFrequency]:
        """Extract top topics for a segment of messages"""
        try:
            segment_text = " ".join([msg.content for msg in messages])
            
            if not segment_text.strip():
                return []
            
            # Clean and tokenize
            segment_text = re.sub(r'[^\w\s]', '', segment_text.lower())
            tokens = word_tokenize(segment_text)
            
            # Lemmatize and filter
            lemmatizer = WordNetLemmatizer()
            lemmatized_tokens = [lemmatizer.lemmatize(token) for token in tokens]
            tagged_tokens = pos_tag(lemmatized_tokens)
            
            stop_words = set(stopwords.words('english'))
            
            # Filter for meaningful words
            def is_good_pos(pos_tag):
                return pos_tag.startswith('NN') or pos_tag.startswith('JJ')
            
            filtered_words = [
                word for word, tag in tagged_tokens
                if word not in stop_words and len(word) > 2 and is_good_pos(tag)
            ]
            
            # Count word frequencies
            word_counts = Counter(filtered_words)
            
            # Return top 5 topics for this segment
            top_words = word_counts.most_common(5)
            
            return [
                WordFrequency(text=word, value=count)
                for word, count in top_words if count > 0
            ]
            
        except Exception as e:
            logger.error(f"Failed to extract segment topics: {e}")
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
            topic_drift=[],
            readability_score=0.0,
            vocabulary_richness=0.0,
            message_counts={},
            avg_response_time_seconds=0.0,
            question_ratio={}
        )