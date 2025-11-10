import React, { useState } from 'react';
import { Copy, Check, RotateCcw, Edit3, ThumbsUp, ThumbsDown, User, Bot } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
  feedback?: 'positive' | 'negative';
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onCopy?: (content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  isDarkMode?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  onCopy,
  onRegenerate,
  onEdit,
  onFeedback,
  isDarkMode = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      await navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    if (isEditing && onEdit) {
      onEdit(message.id, editContent);
    }
    setIsEditing(!isEditing);
  };

  const renderMarkdownContent = (content: string) => {
    // Simple markdown parsing for code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Handle code blocks
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index);
        parts.push(renderInlineMarkdown(textBefore, parts.length));
      }

      // Add code block
      const language = match[1] || 'text';
      const code = match[2].trim();
      parts.push(
        <div key={parts.length} className="my-3 relative group">
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              {language}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Copy code"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <SyntaxHighlighter
            language={language}
            style={isDarkMode ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              borderRadius: '0 0 0.5rem 0.5rem',
              fontSize: '0.875rem'
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      parts.push(renderInlineMarkdown(remainingText, parts.length));
    }

    return parts.length > 0 ? parts : renderInlineMarkdown(content, 0);
  };

  const renderInlineMarkdown = (text: string, key: number) => {
    // Handle inline code
    const inlineCodeRegex = /`([^`]+)`/g;
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    
    let result = text;
    
    // Replace inline code
    result = result.replace(inlineCodeRegex, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
    
    // Replace bold
    result = result.replace(boldRegex, '<strong>$1</strong>');
    
    // Replace italic (but not already processed bold)
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    return (
      <div 
        key={key}
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: result }}
      />
    );
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Message Bubble */}
          <div className={`relative px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
          } ${isStreaming ? 'animate-pulse' : ''}`}>
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={Math.max(3, editContent.split('\n').length)}
                  placeholder="Edit your message..."
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setEditContent(message.content);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={editContent.trim() === ''}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm leading-relaxed">
                {renderMarkdownContent(message.content)}
              </div>
            )}

            {/* Streaming indicator */}
            {isStreaming && (
              <div className="flex items-center mt-2 space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            )}
          </div>

          {/* Message Actions */}
          {!isStreaming && (
            <div className={`flex items-center mt-2 space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? 'flex-row-reverse' : 'flex-row'
            }`}>
              {/* Timestamp */}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Copy message"
                >
                  {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-500" />}
                </button>

                {message.role === 'user' && onEdit && (
                  <button
                    onClick={handleEdit}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title={isEditing ? "Save edit" : "Edit message"}
                  >
                    <Edit3 className="w-3 h-3 text-gray-500" />
                  </button>
                )}

                {message.role === 'assistant' && onRegenerate && (
                  <button
                    onClick={() => onRegenerate(message.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCcw className="w-3 h-3 text-gray-500" />
                  </button>
                )}

                {message.role === 'assistant' && onFeedback && (
                  <>
                    <button
                      onClick={() => onFeedback(message.id, 'positive')}
                      className={`p-1 rounded transition-colors ${
                        message.feedback === 'positive'
                          ? 'text-green-600 bg-green-100 dark:bg-green-900'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Good response"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onFeedback(message.id, 'negative')}
                      className={`p-1 rounded transition-colors ${
                        message.feedback === 'negative'
                          ? 'text-red-600 bg-red-100 dark:bg-red-900'
                          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Poor response"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Model info for assistant messages */}
          {message.role === 'assistant' && message.model && !isStreaming && (
            <div className="text-xs text-gray-400 mt-1">
              {message.model}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;