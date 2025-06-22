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
}

export function ConversationView({ conversationId, onStop }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<string>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Live Conversation</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            Status: <span className={status === 'connected' ? 'text-green-400' : 'text-red-400'}>
              {status}
            </span>
          </span>
          <button
            onClick={handleStop}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-4 rounded transition-colors"
          >
            Stop
          </button>
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
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}