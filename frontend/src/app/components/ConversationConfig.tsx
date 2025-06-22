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
    ai1Persona: 'You are a helpful assistant',
    ai2Provider: 'openai',
    ai2Model: 'gpt-4',
    ai2Persona: 'You are a curious questioner',
    initialPrompt: "Let's have a conversation about technology",
    messageLimit: 10,
    messageDelay: 1000,
    maxTokens: 200
  });

  const handleStart = async () => {
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
      <h2 className="text-xl font-semibold">Configuration</h2>
      
      {/* AI 1 Settings */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-300">AI 1 Settings</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Provider</label>
          <select 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
            value={config.ai1Provider}
            onChange={e => setConfig({...config, ai1Provider: e.target.value})}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Model</label>
          <select 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
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
        <div>
          <label className="block text-sm text-gray-400 mb-1">Persona</label>
          <textarea 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-20 resize-none"
            value={config.ai1Persona}
            onChange={e => setConfig({...config, ai1Persona: e.target.value})}
          />
        </div>
      </div>

      {/* AI 2 Settings */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-300">AI 2 Settings</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Provider</label>
          <select 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
            value={config.ai2Provider}
            onChange={e => setConfig({...config, ai2Provider: e.target.value})}
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Model</label>
          <select 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
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
        <div>
          <label className="block text-sm text-gray-400 mb-1">Persona</label>
          <textarea 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-20 resize-none"
            value={config.ai2Persona}
            onChange={e => setConfig({...config, ai2Persona: e.target.value})}
          />
        </div>
      </div>

      {/* Conversation Settings */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-300">Conversation Settings</h3>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Initial Prompt</label>
          <textarea 
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 h-20 resize-none"
            value={config.initialPrompt}
            onChange={e => setConfig({...config, initialPrompt: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Message Limit</label>
          <input 
            type="number"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
            value={config.messageLimit}
            onChange={e => setConfig({...config, messageLimit: parseInt(e.target.value) || 0})}
            min="1"
            max="100"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Message Delay (ms)</label>
          <input 
            type="number"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
            value={config.messageDelay}
            onChange={e => setConfig({...config, messageDelay: parseInt(e.target.value) || 0})}
            min="0"
            max="10000"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Tokens per Response</label>
          <input 
            type="number"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
            value={config.maxTokens}
            onChange={e => setConfig({...config, maxTokens: parseInt(e.target.value) || 0})}
            min="50"
            max="4000"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-2">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Start Conversation
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Stop Conversation
          </button>
        )}
      </div>
    </div>
  );
}