import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  StopIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  metadata?: {
    model?: string;
    tokens?: number;
    executionTime?: number;
  };
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand?: (command: string) => void;
  className?: string;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  isOpen,
  onClose,
  onCommand,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: '🤖 **Jarvis AI Assistant** is ready to help!\n\nI can:\n- Execute terminal commands\n- Analyze your code\n- Explain errors and suggest fixes\n- Help with development tasks\n- Answer technical questions\n\nJust ask me anything!',
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Available models
  const models = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', icon: '🧠' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', icon: '⚡' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', icon: '🎭' },
    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', icon: '💎' },
    { id: 'perplexity-sonar', name: 'Sonar Large', provider: 'Perplexity', icon: '🔍' },
    { id: 'ollama-llama2', name: 'Llama 2 (Local)', provider: 'Ollama', icon: '🦙' },
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      metadata: { model: selectedModel },
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Simulate streaming response
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(m => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  accumulatedContent += content;
                  
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ));
                }
              } catch (e) {
                // Ignore parsing errors for partial chunks
              }
            }
          }
        }
      }

      // Finalize the message
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessage.id
          ? { 
              ...msg, 
              isStreaming: false,
              metadata: {
                ...msg.metadata,
                tokens: accumulatedContent.length,
                executionTime: Date.now() - assistantMessage.timestamp,
              }
            }
          : msg
      ));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was cancelled
        setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id));
      } else {
        // Handle error
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessage.id
            ? { 
                ...msg, 
                content: `❌ **Error**: ${error.message}\n\nPlease check your connection and try again.`,
                isStreaming: false 
              }
            : msg
        ));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [input, isStreaming, selectedModel, messages]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  }, []);

  const executeCommand = useCallback((command: string) => {
    if (onCommand) {
      onCommand(command);
    }
  }, [onCommand]);

  const renderMessage = useCallback((message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          {/* Avatar */}
          <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isUser 
                ? 'bg-blue-600 text-white' 
                : isSystem
                ? 'bg-gray-600 text-white'
                : 'bg-purple-600 text-white'
            }`}>
              {isUser ? 'U' : isSystem ? 'S' : '🤖'}
            </div>
            <span className="text-xs text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {message.metadata?.model && (
              <span className="text-xs text-gray-500">
                {models.find(m => m.id === message.metadata?.model)?.name}
              </span>
            )}
          </div>

          {/* Message content */}
          <div className={`rounded-lg p-4 ${
            isUser 
              ? 'bg-blue-600/20 border border-blue-500/30' 
              : isSystem
              ? 'bg-gray-600/20 border border-gray-500/30'
              : 'bg-gray-800/50 border border-gray-700/50'
          }`}>
            <MessageContent 
              content={message.content} 
              isStreaming={message.isStreaming}
              onCopy={copyToClipboard}
              onExecute={executeCommand}
            />
          </div>

          {/* Message actions */}
          {!isUser && !isSystem && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => copyToClipboard(message.content)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Copy message"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
              {message.metadata?.executionTime && (
                <span className="text-xs text-gray-500">
                  {message.metadata.executionTime}ms
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }, [copyToClipboard, executeCommand, models]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`fixed right-4 top-4 bottom-4 w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-50 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-6 h-6 text-purple-400" />
          <div>
            <h3 className="font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-gray-400">
              {models.find(m => m.id === selectedModel)?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            {isMinimized ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Model selector */}
          <div className="p-3 border-b border-gray-700/50">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.icon} {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700/50">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask AI anything..."
                className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                rows={1}
                disabled={isStreaming}
              />
              <button
                onClick={isStreaming ? stopStreaming : sendMessage}
                disabled={!input.trim() && !isStreaming}
                className={`p-2 rounded-lg transition-colors ${
                  isStreaming
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white disabled:bg-gray-600 disabled:text-gray-400'
                }`}
              >
                {isStreaming ? (
                  <StopIcon className="w-5 h-5" />
                ) : (
                  <PaperAirplaneIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

// Message content renderer with syntax highlighting
const MessageContent: React.FC<{
  content: string;
  isStreaming?: boolean;
  onCopy: (text: string) => void;
  onExecute: (command: string) => void;
}> = ({ content, isStreaming, onCopy, onExecute }) => {
  const renderContent = () => {
    // Split content by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Code block
        const lines = part.slice(3, -3).split('\n');
        const language = lines[0].trim() || 'text';
        const code = lines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-3">
            <div className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-t-lg border-b border-gray-600">
              <span className="text-xs text-gray-400">{language}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => onCopy(code)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy code"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
                {language === 'bash' || language === 'shell' || language === 'powershell' ? (
                  <button
                    onClick={() => onExecute(code)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Execute command"
                  >
                    <CodeBracketIcon className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: '0 0 0.5rem 0.5rem',
                fontSize: '0.875rem',
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
      } else {
        // Regular text with markdown-like formatting
        return (
          <div key={index} className="whitespace-pre-wrap">
            {part.split('\n').map((line, lineIndex) => (
              <div key={lineIndex}>
                {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                     .replace(/\*(.*?)\*/g, '<em>$1</em>')
                     .split(/(<strong>.*?<\/strong>|<em>.*?<\/em>)/)
                     .map((segment, segIndex) => {
                       if (segment.startsWith('<strong>')) {
                         return <strong key={segIndex} className="font-semibold">{segment.slice(8, -9)}</strong>;
                       } else if (segment.startsWith('<em>')) {
                         return <em key={segIndex} className="italic">{segment.slice(4, -5)}</em>;
                       } else {
                         return segment;
                       }
                     })}
              </div>
            ))}
          </div>
        );
      }
    });
  };

  return (
    <div className="text-white">
      {renderContent()}
      {isStreaming && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-4 bg-purple-400 ml-1"
        />
      )}
    </div>
  );
};