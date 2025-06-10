'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useEpisodes, useMessages, useSendMessage } from '@/lib/hooks';
import { MessageBubble } from '@/components/message-bubble';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InteractiveTray } from '@/components/interactive-tray';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use our hooks to interact with Dexie
  const { episodes, createEpisode } = useEpisodes();
  const currentEpisodeId = episodes?.[0]?.id;
  const { messages } = useMessages(currentEpisodeId);
  const { sendMessage, isLoading } = useSendMessage();
  
  // Create an episode if one doesn't exist
  useEffect(() => {
    if (!episodes || episodes.length === 0) {
      createEpisode({ title: 'New Consultation' });
    }
  }, [episodes, createEpisode]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!input.trim() || isProcessing || !currentEpisodeId) return;
    
    setInput('');
    setIsProcessing(true);
    
    try {
      await sendMessage(currentEpisodeId, input);
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow p-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">EasyGP Health Assistant</h1>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages && messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role === 'system' ? 'assistant' : message.role}
            content={message.content}
            timestamp={message.timestamp}
            isLoading={false}
          />
        ))}
        {isLoading && (
          <MessageBubble
            role="assistant"
            content=""
            isLoading={true}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <InteractiveTray />
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex max-w-3xl mx-auto">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your symptoms or questions..."
            className="flex-1 rounded-l-lg dark:bg-gray-700 dark:text-gray-100"
            disabled={isLoading || isProcessing}
          />
          <Button
            type="submit"
            className="rounded-l-none"
            disabled={isLoading || isProcessing}
          >
            {isLoading || isProcessing ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
