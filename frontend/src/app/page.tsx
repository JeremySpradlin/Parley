'use client';

import { ConversationConfig } from './components/ConversationConfig';
import { ConversationView } from './components/ConversationView';
import { useConversation } from './context/ConversationContext';

export default function Home() {
  const { conversationId, setConversationId, isRunning, setIsRunning } = useConversation();

  const handleStartConversation = (id: string) => {
    setConversationId(id);
    setIsRunning(true);
  };

  const handleStopConversation = () => {
    setIsRunning(false);
  };

  const handleCompleteConversation = () => {
    setIsRunning(false);
    // Keep conversationId so user can still see the completed conversation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-gray-100">
      <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/80 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Parley
          </h1>
          <span className="text-sm text-gray-400 font-medium">AI Conversation Tool</span>
        </div>
      </header>
      
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left sidebar */}
        <div className="w-96 border-r border-gray-700/50 bg-gray-800/30 backdrop-blur-sm p-6 overflow-y-auto">
          <ConversationConfig 
            onStart={handleStartConversation}
            isRunning={isRunning}
            conversationId={conversationId}
          />
        </div>
        
        {/* Main content */}
        <div className="flex-1 p-6 bg-gray-800/10">
          {conversationId ? (
            <ConversationView 
              conversationId={conversationId}
              onStop={handleStopConversation}
              onComplete={handleCompleteConversation}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">Ready to Start</h3>
                <p className="text-gray-500">Configure your AI participants and initial prompt, then start a conversation to watch them interact in real-time.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}