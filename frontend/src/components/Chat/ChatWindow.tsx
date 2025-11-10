import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardIcon, CheckIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../../stores/appStore';
import type { ChatMessage } from '../../types';

interface ChatWindowProps {
  className?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ className = '' }) => {
  const {
    chatMessages,
    chatInput,
    isStreaming,
    setChatInput,
    sendMessage,
    addToast
  } = useAppStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      addToast({
        id: Date.now().toString(),
        type: 'success',
        message: 'Code copied to clipboard!',
        duration: 2000
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message: 'Failed to copy code',
        duration: 3000
      });
    }
  };

  const handleSendMessage = async () => {
    if (chatInput.trim() === '' || isStreaming) return;
    await sendMessage(chatInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderCodeBlock = (content: string, language: string = 'javascript') => {
    return (
      <div className="relative group my-3">
        <div className="flex items-center justify-between bg-black/20 px-4 py-2 rounded-t-lg border-b border-white/10">
          <span className="text-xs text-white/60 font-mono uppercase tracking-wide">
            {language}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Create a new file with this code
                const fileName = `snippet.${language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'txt'}`;
                addToast({
                  id: Date.now().toString(),
                  type: 'info',
                  message: `Code snippet ready to be saved as ${fileName}`,
                  duration: 3000
                });
              }}
              className="glass-button p-1.5 text-white/50 hover:text-white/80 transition-colors"
              title="Create file from code"
            >
              <DocumentIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => copyToClipboard(content)}
              className="glass-button p-1.5 text-white/50 hover:text-white/80 transition-colors"
              title="Copy code"
            >
              {copiedCode === content ? (
                <CheckIcon className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <ClipboardIcon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 0.75rem 0.75rem',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            fontSize: '0.875rem',
            lineHeight: '1.5',
          }}
          showLineNumbers={content.split('\n').length > 5}
          wrapLines={true}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    // Simple code block detection - look for ```language blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: message.content.slice(lastIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'javascript',
        content: match[2].trim()
      });
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < message.content.length) {
      parts.push({
        type: 'text',
        content: message.content.slice(lastIndex)
      });
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[80%] ${isUser ? 'glass-card bg-blue-500/20' : 'glass-card bg-white/5'} p-4 rounded-2xl`}>
          {parts.length > 0 ? (
            parts.map((part, index) => (
              <div key={index}>
                {part.type === 'text' ? (
                  <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
                    {part.content}
                  </p>
                ) : (
                  <div className="mt-3 first:mt-0">
                    {renderCodeBlock(part.content, part.language)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-white/90 whitespace-pre-wrap leading-relaxed">
              {message.content || (isStreaming && !isUser ? '...' : '')}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`flex flex-col h-full glass-panel ${className}`}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-b border-white/10"
      >
        <h2 className="text-xl font-semibold text-white/90 font-mono">
          Jarvis AI Assistant
        </h2>
        <p className="text-sm text-white/60 mt-1">
          Chat with AI to generate, edit, and run code
        </p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {chatMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 glass-card rounded-full flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-lg font-medium text-white/80 mb-2">
                  Welcome to Jarvis Coder
                </h3>
                <p className="text-white/60 max-w-md">
                  Start a conversation with the AI assistant to generate code, 
                  ask questions, or get help with your project.
                </p>
              </div>
            </motion.div>
          ) : (
            chatMessages.map((message) => (
              <div key={message.id}>
                {renderMessage(message)}
              </div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 border-t border-white/10"
      >
        <div className="relative">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="glass-input w-full min-h-[60px] max-h-[200px] resize-none pr-12 font-mono"
            placeholder={isStreaming ? 'AI is responding...' : 'Ask Jarvis anything...'}
            disabled={isStreaming}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '60px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isStreaming || !chatInput.trim()}
            className="absolute right-3 bottom-3 glass-button p-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Send message (Enter)"
          >
            <PaperAirplaneIcon className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-white/50">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {isStreaming && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>AI is typing...</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
