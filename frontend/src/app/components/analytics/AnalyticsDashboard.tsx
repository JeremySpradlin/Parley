'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApi } from '@/lib/hooks'; // Adjust path if necessary
import { useConversation } from '../../context/ConversationContext';
import { SentimentChart } from './SentimentChart';
import { WordCloudComponent } from './WordCloudComponent';
import { TopicDriftChart } from './TopicDriftChart';
import { MetricsCard } from './MetricsCard';

interface ConversationSummary {
  id: string;
  status: string;
  name: string;
  message_count: number;
  created_at: string;
}

interface ConversationAnalytics {
  conversation_id: string;
  sentiment_over_time: Array<{
    message_index: number;
    sentiment_polarity: number;
    sentiment_subjectivity: number;
    speaker: string;
  }>;
  topic_keywords: Array<{
    text: string;
    value: number;
  }>;
  topic_drift: Array<{
    segment_index: number;
    start_message: number;
    end_message: number;
    dominant_topics: Array<{
      text: string;
      value: number;
    }>;
    topic_shift_score: number;
  }>;
  readability_score: number;
  vocabulary_richness: number;
  message_counts: Record<string, number>;
  avg_response_time_seconds: number;
  question_ratio: Record<string, number>;
}

export function AnalyticsDashboard() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  const { data: conversations, isLoading: isLoadingConversations, error: conversationsError, fetchData: fetchConversations } = useApi<ConversationSummary[]>();
  const { data: analytics, isLoading: isLoadingAnalytics, error: analyticsError, fetchData: fetchAnalytics } = useApi<ConversationAnalytics>();
  const { conversationId: liveConversationId } = useConversation();

  useEffect(() => {
    fetchConversations('/api/analytics/conversations');
  }, [fetchConversations]);
  
  // Set the initially selected conversation from the live context
  useEffect(() => {
    if (liveConversationId) {
      setSelectedConversationId(liveConversationId);
    }
  }, [liveConversationId]);

  useEffect(() => {
    if (selectedConversationId) {
      fetchAnalytics(`/api/analytics/${selectedConversationId}`);
    }
  }, [selectedConversationId, fetchAnalytics]);

  const handleConversationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedConversationId(e.target.value);
  };

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      return `${(seconds / 60).toFixed(1)}m`;
    }
  };

  const formatQuestionRatio = (ratios: Record<string, number>) => {
    return Object.entries(ratios)
      .map(([speaker, ratio]) => `${speaker.toUpperCase()}: ${(ratio * 100).toFixed(1)}%`)
      .join(', ');
  };

  const handleExportPdf = async () => {
    if (!selectedConversationId) return;

    try {
      const response = await fetch(`/api/analytics/${selectedConversationId}/export-pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `parley_analytics_${selectedConversationId.slice(0, 8)}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename=\"?([^\"]+)\"?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to export analytics PDF');
      }
    } catch (error) {
      console.error('Error exporting analytics PDF:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Conversation Selector */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-200">Select Conversation</h2>
          </div>
          
          {analytics && selectedConversationId && (
            <button
              onClick={handleExportPdf}
              className="bg-red-600/60 hover:bg-red-500/60 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm backdrop-blur-sm border border-red-600/50 hover:scale-105"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          )}
        </div>
        
        <div className="mt-4">
          {isLoadingConversations && <p>Loading conversations...</p>}
          {conversationsError && <p className="text-red-400">Error: {conversationsError.message}</p>}
          {conversations && (
            <select 
              onChange={handleConversationChange}
              value={selectedConversationId || ''}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:bg-gray-700/70"
            >
              <option value="" disabled>Select a conversation to analyze</option>
              {conversations.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({new Date(c.created_at).toLocaleString()})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoadingAnalytics && <div className="text-center p-8">Loading analytics...</div>}
      {analyticsError && <div className="text-center p-8 text-red-400">Error loading analytics: {analyticsError.message}</div>}

      {analytics && !isLoadingAnalytics && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Chart */}
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <span className="text-xl">📊</span>
                Sentiment Over Time
              </h3>
              <SentimentChart data={analytics.sentiment_over_time} />
            </div>

            {/* Word Cloud */}
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <span className="text-xl">☁️</span>
                Key Topics
              </h3>
              <WordCloudComponent words={analytics.topic_keywords} />
            </div>
          </div>

          {/* Topic Drift Analysis */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-xl">🔄</span>
              Topic Evolution Throughout Conversation
            </h3>
            <TopicDriftChart data={analytics.topic_drift} />
          </div>

          {/* Message Counts */}
          <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-xl">💬</span>
              Message Distribution
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(analytics.message_counts).map(([speaker, count]) => (
                <div key={speaker} className="bg-gray-700/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-200">{count}</div>
                  <div className="text-sm text-gray-400">{speaker.toUpperCase()} Messages</div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Readability Score"
              value={analytics.readability_score.toFixed(1)}
              tooltip="Flesch-Kincaid Grade Level"
              icon="📖"
            />
            <MetricsCard
              title="Vocabulary Richness"
              value={`${(analytics.vocabulary_richness * 100).toFixed(1)}%`}
              tooltip="Type-Token Ratio (unique words / total words)"
              icon="🎯"
            />
            <MetricsCard
              title="Avg Response Time"
              value={formatResponseTime(analytics.avg_response_time_seconds)}
              tooltip="Average time between AI responses"
              icon="⏱️"
            />
            <MetricsCard
              title="Question Ratio"
              value={formatQuestionRatio(analytics.question_ratio)}
              tooltip="Percentage of messages ending with ?"
              icon="❓"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedConversationId && !isLoadingAnalytics && !analyticsError && (
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-12 border border-gray-700/50">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">Ready to Analyze</h3>
            <p>Select a conversation from the dropdown above to view detailed analytics and insights.</p>
          </div>
        </div>
      )}
    </div>
  );
}