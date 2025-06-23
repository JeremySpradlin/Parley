'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ConversationContextType {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider = ({ children }: { children: ReactNode }) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  return (
    <ConversationContext.Provider value={{ conversationId, setConversationId, isRunning, setIsRunning }}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}; 