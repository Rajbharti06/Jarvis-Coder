import React, { useState, useEffect, useRef } from 'react';

interface ChatWindowProps {
  projectId: string | null;
  onCodeGenerated: (code: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ projectId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Add a placeholder for the assistant's response
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const eventSource = new EventSource('http://127.0.0.1:8000/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: input, projectId }),
    });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setMessages((prev) => {
          const lastMsgIndex = prev.length - 1;
          const newMessages = [...prev];
          newMessages[lastMsgIndex].content = `Error: ${data.error}`;
          return newMessages;
        });
        setIsLoading(false);
        eventSource.close();
        return;
      }

      setMessages((prev) => {
        const lastMsgIndex = prev.length - 1;
        const newMessages = [...prev];
        newMessages[lastMsgIndex].content += data.content;
        return newMessages;
      });
    };

    eventSource.onerror = () => {
      // The stream closes naturally, which can sometimes trigger an error.
      // We only set loading to false here.
      setIsLoading(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  };

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-xl border-l border-white/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
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
            placeholder={isLoading ? 'Waiting for response...' : 'Ask the AI...'}
            disabled={isLoading}
          />
          <button onClick={handleSendMessage} className="p-2 bg-blue-600 text-white rounded-r-lg disabled:opacity-50" disabled={isLoading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
