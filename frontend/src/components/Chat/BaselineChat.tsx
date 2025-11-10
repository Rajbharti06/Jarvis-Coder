import React, { useState, useEffect, useRef } from 'react';

interface BaselineChatProps {
  onClose?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const BaselineChat: React.FC<BaselineChatProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with a welcome message
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your Baseline Safety Assistant. Ask me anything about web features, browser compatibility, or how to make your code Baseline-compliant.'
      }
    ]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/baseline/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Baseline Safety Assistant</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-prose p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300'}`}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content || '...'}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-white/10">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 p-2 rounded-l-lg bg-gray-800 text-white border border-white/20 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder={isLoading ? 'Waiting for response...' : 'Ask about Baseline safety...'}
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage} 
            className="p-2 bg-blue-600 text-white rounded-r-lg disabled:opacity-50" 
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};