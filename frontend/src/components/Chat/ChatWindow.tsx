import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Send, User, Bot, Loader2, Paperclip, Eraser, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AgentPanel } from './AgentPanel';
import { CommandPalette } from './CommandPalette';

export const ChatWindow: React.FC = () => {
  const { chatMessages, addChatMessage, activeFileId, selectedModel, clearChat, setCommandPaletteOpen } = useStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [agentProgress, setAgentProgress] = useState<{status: string, logs: string[], diffs: any[]}>({
    status: 'Idle',
    logs: [],
    diffs: []
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, agentProgress]);

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

  const handleSend = async (messageOverride?: string | React.MouseEvent) => {
    const textOverride = typeof messageOverride === 'string' ? messageOverride : undefined;
    const messageToSend = textOverride || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user' as const,
      content: messageToSend,
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    if (!textOverride) setInput('');
    setIsLoading(true);

    if (isAgentMode) {
      startAgentTask(messageToSend);
      return;
    }

    // Standard Chat (SSE)
    try {
      const response = await fetch('http://localhost:8000/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          model: selectedModel,
          stream: true,
          active_file_path: activeFileId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseContent = '';
      const aiMessageId = (Date.now() + 1).toString();

      addChatMessage({ id: aiMessageId, sender: 'ai', content: '', timestamp: Date.now() });

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                aiResponseContent += data.content;
                useStore.setState((state) => ({
                  chatMessages: state.chatMessages.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, content: aiResponseContent } : msg
                  ),
                }));
              } catch (e) {}
            }
          }
        }
      }
    } catch (error: any) {
      addChatMessage({
        id: Date.now().toString(),
        sender: 'ai',
        content: `**Error:** ${error.message}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startAgentTask = (task: string) => {
    setAgentProgress({ status: 'Connecting...', logs: [], diffs: [] });
    
    const ws = new WebSocket('ws://localhost:8000/api/agent/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        task: task,
        active_file_path: activeFileId,
        max_iterations: 3
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'status':
          setAgentProgress(prev => ({ ...prev, status: data.payload }));
          break;
        case 'log':
          setAgentProgress(prev => ({ ...prev, logs: [...prev.logs, data.payload] }));
          break;
        case 'diff':
          setAgentProgress(prev => ({ ...prev, diffs: [...prev.diffs, data.payload] }));
          break;
        case 'result':
          addChatMessage({
            id: Date.now().toString(),
            sender: 'ai',
            content: `### Agent Task Completed\n**Status:** ${data.payload.status}\n\nApplied ${data.payload.edits.length} edits. Check the progress panel for details.`,
            timestamp: Date.now()
          });
          setIsLoading(false);
          ws.close();
          break;
        case 'error':
          setAgentProgress(prev => ({ ...prev, status: 'Error' }));
          addChatMessage({
            id: Date.now().toString(),
            sender: 'ai',
            content: `**Agent Error:** ${data.message}`,
            timestamp: Date.now()
          });
          setIsLoading(false);
          ws.close();
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setIsLoading(false);
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#3e3e42] relative">
      <CommandPalette onExecute={(cmd) => handleSend(cmd)} />
      
      {/* Header */}
      <div className="p-3 border-b border-[#3e3e42] bg-[#252526] flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
           <Sparkles size={16} className={isAgentMode ? "text-purple-400 animate-pulse" : "text-blue-400"} />
           <h2 className="text-xs font-bold text-gray-300 uppercase tracking-widest">{isAgentMode ? 'Jarvis Agent' : 'Jarvis Chat'}</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsAgentMode(!isAgentMode)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
              isAgentMode ? 'bg-purple-900/50 border-purple-500 text-purple-200' : 'bg-[#3e3e42] border-[#4e4e52] text-gray-400 hover:text-white'
            }`}
          >
            {isAgentMode ? 'AGENT: ON' : 'AGENT: OFF'}
          </button>
          <span className="text-[10px] font-mono bg-[#3e3e42] px-2 py-0.5 rounded text-blue-300 border border-[#4e4e52]">{selectedModel || 'default'}</span>
          <button 
            onClick={clearChat}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Clear Chat"
          >
            <Eraser size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#1e1e1e]">
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <div className="w-16 h-16 bg-[#252526] rounded-2xl flex items-center justify-center mb-4 border border-[#3e3e42]">
               <Bot size={32} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">How can I help you today?</h3>
            <p className="text-gray-400 text-xs max-w-xs leading-relaxed">
              I can help you refactor code, fix bugs, or explain complex logic.
            </p>
          </div>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[95%] flex space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${msg.sender === 'user' ? 'bg-blue-600' : 'bg-[#252526] border border-[#3e3e42]'}`}>
                {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} className="text-blue-400" />}
              </div>
              <div className={`p-4 rounded-xl text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-blue-700/20 border border-blue-500/30 text-gray-200' : 'bg-[#252526] border border-[#3e3e42] text-gray-300'}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="my-4 rounded-lg overflow-hidden border border-[#3e3e42]">
                           <div className="bg-[#1e1e1e] px-4 py-1 text-[10px] text-gray-500 border-b border-[#3e3e42] flex justify-between items-center">
                              <span>{match[1].toUpperCase()}</span>
                              <button className="hover:text-white" onClick={() => navigator.clipboard.writeText(String(children))}>Copy</button>
                           </div>
                           <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, padding: '1rem', fontSize: '12px', background: '#1e1e1e' }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-[#1e1e1e] px-1.5 py-0.5 rounded text-blue-300 font-mono text-[13px]" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Agent Progress Panel */}
      {isAgentMode && (agentProgress.logs.length > 0 || agentProgress.status !== 'Idle') && (
        <AgentPanel logs={agentProgress.logs} status={agentProgress.status} diffs={agentProgress.diffs} />
      )}

      {/* Input */}
      <div className="p-4 bg-[#252526] border-t border-[#3e3e42] shadow-2xl">
        <div className="relative flex flex-col space-y-2">
          <div className="flex items-center space-x-2 px-1">
             <button className="p-1 text-gray-500 hover:text-blue-400 transition-colors" title="Attach Context">
                <Paperclip size={16} />
             </button>
             <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Context: {activeFileId ? activeFileId.split('/').pop() : 'Workspace'}</span>
          </div>
          <div className="relative flex items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isAgentMode ? "Give the agent a task..." : "Ask anything..."}
              className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-xl py-3 pl-4 pr-12 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 shadow-inner resize-none max-h-48 min-h-[50px] transition-all"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-lg transition-all shadow-lg ${
                isAgentMode ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'
              } text-white disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
