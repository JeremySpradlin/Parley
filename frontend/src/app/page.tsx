'use client';

import { useState } from 'react';
import { ConversationConfig } from './components/ConversationConfig';
import { ConversationView } from './components/ConversationView';

export default function Home() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleStartConversation = (id: string) => {
    setConversationId(id);
    setIsRunning(true);
  };

  const handleStopConversation = () => {
    setIsRunning(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-800 p-4">
        <h1 className="text-2xl font-bold">Parley - AI Conversation Tool</h1>
      </header>
      
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left sidebar */}
        <div className="w-96 border-r border-gray-800 p-6 overflow-y-auto">
          <ConversationConfig 
            onStart={handleStartConversation}
            isRunning={isRunning}
            conversationId={conversationId}
          />
        </div>
        
        {/* Main content */}
        <div className="flex-1 p-6">
          {conversationId ? (
            <ConversationView 
              conversationId={conversationId}
              onStop={handleStopConversation}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Configure and start a conversation to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}