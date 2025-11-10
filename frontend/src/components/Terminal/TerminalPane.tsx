import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export const TerminalPane: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>(['Welcome to Jarvis Coder Terminal']);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = new WebSocket('ws://localhost:8000/terminal/ws');
    setWs(socket);

    socket.onmessage = (event) => {
      setOutput(prev => [...prev, event.data]);
    };

    socket.onerror = (error) => {
      setOutput(prev => [...prev, 'Connection error']);
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      setOutput(prev => [...prev, 'Connection closed']);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when output updates
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(input);
      setOutput(prev => [...prev, `$ ${input}`]);
      setInput('');
    } else {
      setOutput(prev => [...prev, 'Not connected to server']);
    }
  };

  return (
    <div className={`h-full w-full p-4 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      <div className="h-full flex flex-col">
        <div className="flex-grow overflow-y-auto mb-2 font-mono text-sm">
          {output.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div ref={outputEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex">
          <span className="mr-2">$</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`flex-grow bg-transparent outline-none resize-none ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}
            rows={1}
          />
        </form>
      </div>
    </div>
  );
};