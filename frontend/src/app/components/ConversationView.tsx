'use client';

import { useEffect, useState, useRef } from 'react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch conversation details to get configuration
  useEffect(() => {
    if (!conversationId) return;

    const fetchConversationDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8000/conversation/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          setMessageLimit(data.config.message_limit);
          setConversationStatus(data.status);
        }
      } catch (error) {
        console.error('Failed to fetch conversation details:', error);
      }
    };

    fetchConversationDetails();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    // Connect to SSE endpoint
    const eventSource = new EventSource(`http://localhost:8000/conversation/${conversationId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('connected');
    };

    eventSource.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        setMessages(prev => [...prev, message]);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [conversationId]);

  // Check for conversation completion
  useEffect(() => {
    if (messages.length >= messageLimit && messageLimit > 0) {
      setConversationStatus('completed');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      onComplete();
    }
  }, [messages.length, messageLimit, onComplete]);

  // Poll for conversation status updates
  useEffect(() => {
    if (!conversationId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/conversation/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          setConversationStatus(data.status);
          if (data.status === 'completed' || data.status === 'error') {
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
            if (data.status === 'completed') {
              onComplete();
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll conversation status:', error);
      }
    };

    const interval = setInterval(pollStatus, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [conversationId, onComplete]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStop = async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    await fetch(`http://localhost:8000/conversation/${conversationId}/stop`, {
      method: 'POST'
    });
    onStop();
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(`http://localhost:8000/conversation/${conversationId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from Content-Disposition header or create one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `parley_conversation_${conversationId.slice(0, 8)}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename=(.+)/);
          if (filenameMatch) {
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
      const response = await fetch(`http://localhost:8000/conversation/${conversationId}/export-pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from Content-Disposition header or create one
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `parley_conversation_${conversationId.slice(0, 8)}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename=(.+)/);
          if (filenameMatch) {
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
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Live Conversation</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Connection: <span className={status === 'connected' ? 'text-green-400' : 'text-red-400'}>
                {status}
              </span>
            </span>
            <span className="text-sm text-gray-400">
              Status: <span className={getStatusColor(conversationStatus)}>
                {conversationStatus}
              </span>
            </span>
            <div className="flex gap-2">
              {messages.length > 0 && (
                <>
                  <button
                    onClick={handleDownload}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded transition-colors flex items-center gap-1 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    JSON
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded transition-colors flex items-center gap-1 text-sm"
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
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-4 rounded transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Messages: {messages.length} / {messageLimit}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                conversationStatus === 'completed' ? 'bg-blue-500' : 
                conversationStatus === 'error' ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center">Waiting for messages...</p>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={`${message.id}-${index}`} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className={`font-medium ${getSenderColor(message.sender)}`}>
                    {getSenderLabel(message.sender)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-100 whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            
            {/* Completion Message */}
            {conversationStatus === 'completed' && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Conversation Completed</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    Reached message limit ({messageLimit} messages)
                  </p>
                </div>
              </div>
            )}
            
            {conversationStatus === 'error' && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-red-600/20 text-red-400 px-4 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Conversation Error</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    An error occurred during the conversation
                  </p>
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