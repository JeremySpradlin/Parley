'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Message {
  id: string;
  sender: 'ai1' | 'ai2' | 'system';
  content: string;
  timestamp: string;
}

interface ConversationViewProps {
  conversationId: string;
  onStop: () => void;
  onComplete: () => void;
}

export function ConversationView({ conversationId, onStop, onComplete }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<string>('connecting');
  const [conversationStatus, setConversationStatus] = useState<string>('running');
  const [messageLimit, setMessageLimit] = useState<number>(10);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (!conversationId) return;

    // Reset state for new conversation
    setMessages([]);
    setIsTyping(null);
    setConversationStatus('running');
    setStatus('connecting');

    const fetchConversationDetails = async () => {
      try {
        const response = await fetch(`${API_URL}/conversation/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          setMessageLimit(data.config.message_limit);
          setConversationStatus(data.status);
          // Set initial messages if any
          if (data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (error) {
        console.error('Failed to fetch conversation details:', error);
        setStatus('error');
      }
    };

    fetchConversationDetails();

    // Connect to SSE endpoint
    const eventSource = new EventSource(`${API_URL}/conversation/${conversationId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('connected');
    };

    const handleMessageEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
        setIsTyping(null); // Clear typing indicator immediately
        
        // Show typing indicator for next AI if conversation is still running
        setTimeout(() => {
          setConversationStatus(prevStatus => {
            if (prevStatus === 'running') {
              const nextSpeaker = data.sender === 'ai1' ? 'ai2' : 'ai1';
              setIsTyping(nextSpeaker);
            }
            return prevStatus;
          });
        }, 100);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    const handleStatusUpdateEvent = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        setConversationStatus(data.status);
        if (data.status === 'completed' || data.status === 'error') {
            setIsTyping(null);
            if (data.status === 'completed') {
              onComplete();
            }
        }
    };

    eventSource.addEventListener('message', handleMessageEvent);
    eventSource.addEventListener('status_update', handleStatusUpdateEvent);

    eventSource.onerror = () => {
      setStatus('error');
      setIsTyping(null);
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener('message', handleMessageEvent);
      eventSource.removeEventListener('status_update', handleStatusUpdateEvent);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [conversationId, onComplete, API_URL]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStop = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    await fetch(`${API_URL}/conversation/${conversationId}/stop`, {
      method: 'POST'
    });
    setConversationStatus('completed');
    setIsTyping(null);
    onStop();
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`${API_URL}/conversation/${conversationId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from Content-Disposition header or create one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `parley_conversation_${conversationId.slice(0, 8)}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
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
        console.error('Failed to download conversation');
      }
    } catch (error) {
      console.error('Error downloading conversation:', error);
    }
  };

  const handleExportPdf = async () => {
    try {
      const response = await fetch(`${API_URL}/conversation/${conversationId}/export-pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `parley_conversation_${conversationId.slice(0, 8)}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
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
        console.error('Failed to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const getSenderLabel = (sender: string) => {
    switch (sender) {
      case 'ai1': return 'AI 1';
      case 'ai2': return 'AI 2';
      case 'system': return 'System';
      default: return sender;
    }
  };

  const getSenderColor = (sender: string) => {
    switch (sender) {
      case 'ai1': return 'text-blue-400';
      case 'ai2': return 'text-green-400';
      case 'system': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'completed': return 'text-blue-400';
      case 'paused': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const progressPercentage = messageLimit > 0 ? (messages.length / messageLimit) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-800/20 to-gray-900/20 rounded-2xl border border-gray-700/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800/60 backdrop-blur-sm border-b border-gray-700/50 p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Live Conversation</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  {status}
                </span>
                <span className="text-gray-400">•</span>
                <span className={getStatusColor(conversationStatus)}>
                  {conversationStatus}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {messages.length > 0 && (
              <>
                <Link
                  href="/analytics"
                  className="bg-purple-600/60 hover:bg-purple-500/60 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center gap-1 text-sm backdrop-blur-sm border border-purple-600/50 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                  Analytics
                </Link>
                <button
                  onClick={handleDownload}
                  className="bg-gray-600/60 hover:bg-gray-500/60 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center gap-1 text-sm backdrop-blur-sm border border-gray-600/50 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  JSON
                </button>
                <button
                  onClick={handleExportPdf}
                  className="bg-blue-600/60 hover:bg-blue-500/60 text-white font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center gap-1 text-sm backdrop-blur-sm border border-blue-600/50 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </button>
              </>
            )}
            {conversationStatus === 'running' && (
              <button
                onClick={handleStop}
                className="bg-red-600/60 hover:bg-red-500/60 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 backdrop-blur-sm border border-red-600/50 hover:scale-105"
              >
                Stop
              </button>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progress: {messages.length} / {messageLimit} messages</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out ${
                conversationStatus === 'completed' ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 
                conversationStatus === 'error' ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-green-400 to-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-center">Waiting for the conversation to begin...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => {
              const isAI1 = message.sender === 'ai1';
              const isSystem = message.sender === 'system';
              
              return (
                <div 
                  key={`${message.id}-${index}`} 
                  className={`flex ${isAI1 ? 'justify-start' : isSystem ? 'justify-center' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`flex items-start gap-3 max-w-[80%] ${isAI1 ? '' : isSystem ? 'max-w-[60%]' : 'flex-row-reverse'}`}>
                    {/* Avatar */}
                    {!isSystem && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isAI1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-green-500 to-green-600'
                      }`}>
                        <span className="text-xs font-bold text-white">{isAI1 ? '1' : '2'}</span>
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`relative ${isSystem ? 'w-full' : ''}`}>
                      {!isSystem && (
                        <div className={`text-xs font-medium mb-1 ${isAI1 ? 'text-blue-400' : 'text-green-400'} ${isAI1 ? 'text-left' : 'text-right'}`}>
                          {getSenderLabel(message.sender)}
                          <span className="text-gray-500 ml-2">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      
                      <div className={`
                        relative p-4 rounded-2xl shadow-lg backdrop-blur-sm border
                        ${isSystem 
                          ? 'bg-gray-700/40 border-gray-600/50 text-gray-300 text-center text-sm'
                          : isAI1 
                            ? 'bg-blue-600/20 border-blue-500/30 text-gray-100 rounded-tl-md' 
                            : 'bg-green-600/20 border-green-500/30 text-gray-100 rounded-tr-md'
                        }
                        transition-all duration-200 hover:shadow-xl
                      `}>
                        {/* Message tail */}
                        {!isSystem && (
                          <div className={`absolute top-0 w-3 h-3 transform rotate-45 ${
                            isAI1 
                              ? 'bg-blue-600/20 border-l border-t border-blue-500/30 -left-1' 
                              : 'bg-green-600/20 border-r border-t border-green-500/30 -right-1'
                          }`} />
                        )}
                        
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className={`flex ${isTyping === 'ai1' ? 'justify-start' : 'justify-end'} animate-in fade-in duration-300`}>
                <div className={`flex items-start gap-3 max-w-[80%] ${isTyping === 'ai2' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isTyping === 'ai1' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-green-500 to-green-600'
                  }`}>
                    <span className="text-xs font-bold text-white">{isTyping === 'ai1' ? '1' : '2'}</span>
                  </div>
                  
                  <div className={`
                    relative p-4 rounded-2xl backdrop-blur-sm border
                    ${isTyping === 'ai1' 
                      ? 'bg-blue-600/10 border-blue-500/20 rounded-tl-md' 
                      : 'bg-green-600/10 border-green-500/20 rounded-tr-md'
                    }
                  `}>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full animate-bounce ${isTyping === 'ai1' ? 'bg-blue-400' : 'bg-green-400'}`} style={{ animationDelay: '0ms' }}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${isTyping === 'ai1' ? 'bg-blue-400' : 'bg-green-400'}`} style={{ animationDelay: '150ms' }}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${isTyping === 'ai1' ? 'bg-blue-400' : 'bg-green-400'}`} style={{ animationDelay: '300ms' }}></div>
                      <span className="text-xs text-gray-400 ml-2">thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Completion Message */}
            {conversationStatus === 'completed' && (
              <div className="flex justify-center animate-in fade-in duration-500">
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl px-6 py-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-blue-400">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Conversation Completed</p>
                      <p className="text-xs text-gray-400">Reached message limit ({messageLimit} messages)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {conversationStatus === 'error' && (
              <div className="flex justify-center animate-in fade-in duration-500">
                <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-xl px-6 py-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3 text-red-400">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Conversation Error</p>
                      <p className="text-xs text-gray-400">An error occurred during the conversation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}