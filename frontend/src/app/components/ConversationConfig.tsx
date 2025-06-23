'use client';

import { useState } from 'react';

interface ConversationConfigProps {
  onStart: (conversationId: string) => void;
  isRunning: boolean;
  conversationId: string | null;
}

export function ConversationConfig({ onStart, isRunning, conversationId }: ConversationConfigProps) {
  const [config, setConfig] = useState({
    ai1Provider: 'anthropic',
    ai1Model: 'claude-3-5-sonnet-20241022',
    ai1Persona: '',
    ai2Provider: 'openai',
    ai2Model: 'gpt-4',
    ai2Persona: '',
    initialPrompt: "Let's have a conversation about technology",
    messageLimit: 10,
    messageDelay: 1000,
    maxTokens: 200
  });

  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const response = await fetch('http://localhost:8000/conversation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            ai1: {
              provider: config.ai1Provider,
              model: config.ai1Model,
              persona: config.ai1Persona
            },
            ai2: {
              provider: config.ai2Provider,
              model: config.ai2Model,
              persona: config.ai2Persona
            },
            initial_prompt: config.initialPrompt,
            message_limit: config.messageLimit,
            message_delay_ms: config.messageDelay,
            max_tokens_per_response: config.maxTokens
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        onStart(data.id);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!conversationId) return;
    
    try {
      await fetch(`http://localhost:8000/conversation/${conversationId}/stop`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <h2 className="text-lg font-semibold">Configuration</h2>
      </div>
      
      {/* AI 1 Settings */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 space-y-3 transition-all duration-200 hover:bg-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-white">1</span>
          </div>
          <h3 className="text-sm font-medium text-gray-200">AI 1 Settings</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Provider</label>
            <select 
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-gray-700/70"
              value={config.ai1Provider}
              onChange={e => setConfig({...config, ai1Provider: e.target.value})}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Model</label>
            <select 
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-gray-700/70"
              value={config.ai1Model}
              onChange={e => setConfig({...config, ai1Model: e.target.value})}
            >
              {config.ai1Provider === 'anthropic' ? (
                <>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                </>
              ) : (
                <>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Persona</label>
          <textarea 
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 h-16 resize-none text-sm transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:bg-gray-700/70"
            placeholder="Describe AI 1's personality and role..."
            value={config.ai1Persona}
            onChange={e => setConfig({...config, ai1Persona: e.target.value})}
          />
        </div>
      </div>

      {/* AI 2 Settings */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 space-y-3 transition-all duration-200 hover:bg-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-white">2</span>
          </div>
          <h3 className="text-sm font-medium text-gray-200">AI 2 Settings</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Provider</label>
            <select 
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 hover:bg-gray-700/70"
              value={config.ai2Provider}
              onChange={e => setConfig({...config, ai2Provider: e.target.value})}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Model</label>
            <select 
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 hover:bg-gray-700/70"
              value={config.ai2Model}
              onChange={e => setConfig({...config, ai2Model: e.target.value})}
            >
              {config.ai2Provider === 'anthropic' ? (
                <>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                </>
              ) : (
                <>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Persona</label>
          <textarea 
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 h-16 resize-none text-sm transition-all duration-200 focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 hover:bg-gray-700/70"
            placeholder="Describe AI 2's personality and role..."
            value={config.ai2Persona}
            onChange={e => setConfig({...config, ai2Persona: e.target.value})}
          />
        </div>
      </div>

      {/* Conversation Settings */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 space-y-3 transition-all duration-200 hover:bg-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-200">Conversation Settings</h3>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Initial Prompt</label>
          <textarea 
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 h-16 resize-none text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:bg-gray-700/70"
            placeholder="What should the AIs discuss?"
            value={config.initialPrompt}
            onChange={e => setConfig({...config, initialPrompt: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Messages</label>
            <input 
              type="number"
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:bg-gray-700/70"
              value={config.messageLimit}
              onChange={e => setConfig({...config, messageLimit: parseInt(e.target.value) || 0})}
              min="1"
              max="100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Delay (ms)</label>
            <input 
              type="number"
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:bg-gray-700/70"
              value={config.messageDelay}
              onChange={e => setConfig({...config, messageDelay: parseInt(e.target.value) || 0})}
              min="0"
              max="10000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Tokens</label>
            <input 
              type="number"
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 hover:bg-gray-700/70"
              value={config.maxTokens}
              onChange={e => setConfig({...config, maxTokens: parseInt(e.target.value) || 0})}
              min="50"
              max="4000"
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-3 pt-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Starting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Conversation
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
            </svg>
            Stop Conversation
          </button>
        )}
      </div>
    </div>
  );
}