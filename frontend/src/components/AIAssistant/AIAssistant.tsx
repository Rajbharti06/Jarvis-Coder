import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Zap, 
  Globe, 
  WifiOff, 
  Send, 
  Trash2, 
  ThumbsUp, 
  ThumbsDown,
  BarChart3,
  RefreshCw,
  Cpu,
  Brain,
  Sparkles,
  Paperclip,
  Image,
  X,
  File
} from 'lucide-react';
import { apiClient } from '../../utils/api';
import { useAppStore } from '../../stores/appStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ConversationSidebar from './ConversationSidebar';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
  feedback?: 'positive' | 'negative';
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  status: 'available' | 'unavailable' | 'loading';
}

interface SystemStatus {
  mode: 'online' | 'offline';
  current_provider: string;
  available_providers: string[];
  system_health: 'healthy' | 'degraded' | 'error';
  active_models: number;
  total_conversations: number;
  uptime: string;
}

interface FileAttachment {
  id: string;
  file: File;
  type: 'image' | 'document';
  preview?: string;
}

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToast } = useAppStore();

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, streamingMessage, scrollToBottom]);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadSystemStatus();
      loadModels();
      loadConversations();
    }
  }, [isOpen]);

  const loadSystemStatus = async () => {
    try {
      const response = await apiClient.getBlackboxStatus();
      if (response.success) {
        setSystemStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await apiClient.getBlackboxModels();
      if (response.success) {
        setModels(response.data);
        if (response.data.length > 0 && !selectedModel) {
          setSelectedModel(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await apiClient.getBlackboxConversations();
      if (response.success) {
        setConversations(response.data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      created_at: new Date(),
      updated_at: new Date()
    };
    setCurrentConversation(newConversation);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      const attachment: FileAttachment = {
        id: `file_${Date.now()}_${Math.random()}`,
        file,
        type: file.type.startsWith('image/') ? 'image' : 'document'
      };

      if (attachment.type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => [...prev, { ...attachment, preview: e.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, attachment]);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };


  const switchMode = async (mode: 'online' | 'offline') => {
    try {
      const response = await apiClient.switchBlackboxMode(mode);
      if (response.success) {
        setSystemStatus(prev => prev ? { ...prev, mode } : null);
        addToast({
          id: `toast_${Date.now()}`,
          type: 'success',
          title: `Switched to ${mode} mode`,
          duration: 3000
        });
        loadModels(); // Reload models for the new mode
      }
    } catch (error) {
      addToast({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Failed to switch mode',
        duration: 5000
      });
    }
  };

  const switchProvider = async (provider: string) => {
    try {
      const response = await apiClient.switchBlackboxProvider(provider);
      if (response.success) {
        setSystemStatus(prev => prev ? { ...prev, current_provider: provider } : null);
        addToast({
          id: `toast_${Date.now()}`,
          type: 'success',
          title: `Switched to ${provider}`,
          duration: 3000
        });
        loadModels(); // Reload models for the new provider
      }
    } catch (error) {
      addToast({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Failed to switch provider',
        duration: 5000
      });
    }
  };

  const submitFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    if (!currentConversation) return;

    try {
      await apiClient.submitBlackboxFeedback(
        currentConversation.id,
        messageId,
        feedback
      );

      // Update message with feedback
      const updatedConversation = {
        ...currentConversation,
        messages: currentConversation.messages.map(msg =>
          msg.id === messageId ? { ...msg, feedback } : msg
        )
      };

      setCurrentConversation(updatedConversation);
      addToast({
        id: `toast_${Date.now()}`,
        type: 'success',
        title: 'Feedback submitted',
        duration: 3000
      });
    } catch (error) {
      addToast({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Failed to submit feedback',
        duration: 5000
      });
    }
  };







  const sendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: message.trim(),
      role: 'user',
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined
    };

    // Create new conversation if none exists
    if (!currentConversation) {
      createNewConversation();
    }

    const updatedConversation = {
      ...currentConversation!,
      messages: [...(currentConversation?.messages || []), userMessage],
      title: currentConversation?.title === 'New Conversation' 
        ? message.trim().slice(0, 50) + (message.trim().length > 50 ? '...' : '')
        : currentConversation?.title || 'New Conversation'
    };

    setCurrentConversation(updatedConversation);
    setMessage('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // Use streaming for better UX
      await apiClient.blackboxChatStream(
        message.trim(),
        {
          model: selectedModel,
          context: updatedConversation.messages.slice(-10), // Last 10 messages for context
          temperature: 0.7,
          max_tokens: 2000
        },
        (chunk: string) => {
          setStreamingMessage(prev => prev + chunk);
        },
        (error: string) => {
          addToast({
            id: `toast_${Date.now()}`,
            type: 'error',
            title: 'Error',
            message: error,
            duration: 5000
          });
          setIsLoading(false);
        },
        () => {
          // On completion, add the assistant message
          const assistantMessage: Message = {
            id: `msg_${Date.now()}_assistant`,
            content: streamingMessage,
            role: 'assistant',
            timestamp: new Date(),
            model: selectedModel
          };

          const finalConversation = {
            ...updatedConversation,
            messages: [...updatedConversation.messages, assistantMessage],
            updated_at: new Date()
          };

          setCurrentConversation(finalConversation);
          setStreamingMessage('');
          setIsLoading(false);

          // Update conversations list
          setConversations(prev => {
            const existing = prev.find(c => c.id === finalConversation.id);
            if (existing) {
              return prev.map(c => c.id === finalConversation.id ? finalConversation : c);
            } else {
              return [finalConversation, ...prev];
            }
          });
        }
      );
    } catch (error) {
      addToast({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Failed to send message',
        duration: 5000
      });
      setIsLoading(false);
      setStreamingMessage('');
    }
    
    // Clear attachments after sending
    setAttachments([]);
  };



  const regenerateFromMessage = async (fromIndex: number) => {
    if (!currentConversation || fromIndex < 0) return;

    try {
      setIsLoading(true);
      setStreamingMessage('');

      // Get messages up to the specified index
      const messagesToSend = currentConversation.messages.slice(0, fromIndex + 1);
      const lastUserMessage = messagesToSend[messagesToSend.length - 1];

      if (lastUserMessage.role !== 'user') return;

      // Remove any assistant messages after the user message
      const updatedConversation = {
        ...currentConversation,
        messages: messagesToSend,
        updated_at: new Date()
      };

      setCurrentConversation(updatedConversation);

      // Send the message to get a new response
      const response = await apiClient.streamChatMessage(
        lastUserMessage.content,
        currentConversation.id,
        selectedModel,
        systemStatus?.mode || 'online'
      );

      let fullResponse = '';
      const reader = response.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullResponse += data.content;
                setStreamingMessage(fullResponse);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      // Add the complete response as a new message
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        content: fullResponse,
        role: 'assistant',
        timestamp: new Date(),
        model: selectedModel
      };

      const finalConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, newMessage],
        updated_at: new Date()
      };

      setCurrentConversation(finalConversation);
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversation.id ? finalConversation : conv
        )
      );

      setStreamingMessage('');
    } catch (error) {
      console.error('Error regenerating message:', error);
      addToast({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Failed to regenerate response',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await apiClient.deleteBlackboxConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
      }
      
      addToast({
        id: `toast_${Date.now()}`,
        type: 'success',
        title: 'Conversation deleted',
        duration: 3000
      });
    } catch (error) {
      addToast({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Failed to delete conversation',
        duration: 5000
      });
    }
  };

  const triggerUpgrade = async () => {
    try {
      const response = await apiClient.triggerBlackboxUpgrade();
      if (response.success) {
        addToast({
          id: `toast_${Date.now()}`,
          type: 'success',
          title: 'System upgrade initiated',
          duration: 3000
        });
        loadSystemStatus();
      }
    } catch (error) {
      addToast({
        id: `toast_${Date.now()}`,
        type: 'error',
        title: 'Failed to trigger upgrade',
        duration: 5000
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50"
        title="Open AI Assistant"
      >
        <Brain className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Trae Cursor Blackbox
              </h2>
            </div>
            
            {systemStatus && (
              <div className="flex items-center space-x-2 text-sm">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
                  systemStatus.mode === 'online' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                }`}>
                  {systemStatus.mode === 'online' ? (
                    <Globe className="w-3 h-3" />
                  ) : (
                    <WifiOff className="w-3 h-3" />
                  )}
                  <span className="capitalize">{systemStatus.mode}</span>
                </div>
                
                <div className={`w-2 h-2 rounded-full ${
                  systemStatus.system_health === 'healthy' ? 'bg-green-500' :
                  systemStatus.system_health === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Analytics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={triggerUpgrade}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Trigger System Upgrade"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Enhanced Sidebar */}
          <ConversationSidebar
            conversations={conversations}
            currentConversation={currentConversation}
            systemStatus={systemStatus}
            models={models}
            selectedModel={selectedModel}
            onNewConversation={createNewConversation}
            onSelectConversation={setCurrentConversation}
            onDeleteConversation={deleteConversation}
            onRenameConversation={(conversationId, newTitle) => {
              // TODO: Implement conversation renaming
              console.log('Rename conversation:', conversationId, newTitle);
            }}
            onSwitchMode={switchMode}
            onSwitchProvider={switchProvider}
            onSelectModel={setSelectedModel}
            onExportConversations={() => {
              // TODO: Implement conversation export
              const dataStr = JSON.stringify(conversations, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'conversations.json';
              link.click();
              URL.revokeObjectURL(url);
            }}
          />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {currentConversation ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                  {currentConversation.messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onCopy={(content) => {
                        navigator.clipboard.writeText(content);
                        addToast({
                          id: `toast_${Date.now()}`,
                          type: 'success',
                          title: 'Copied to clipboard',
                          duration: 2000
                        });
                      }}
                      onRegenerate={(messageId) => regenerateMessage(messageId)}
                      onEdit={(messageId, newContent) => editMessage(messageId, newContent)}
                      onFeedback={submitFeedback}
                      isDarkMode={document.documentElement.classList.contains('dark')}
                    />
                  ))}

                  {/* Streaming Message */}
                  {streamingMessage && (
                    <MessageBubble
                      message={{
                        id: 'streaming',
                        content: streamingMessage,
                        role: 'assistant',
                        timestamp: new Date(),
                        model: selectedModel
                      }}
                      isStreaming={true}
                      isDarkMode={document.documentElement.classList.contains('dark')}
                    />
                  )}

                  {/* Typing Indicator */}
                  <TypingIndicator 
                    isVisible={isLoading && !streamingMessage} 
                  />

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                  {/* File Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachments.map(attachment => (
                        <div key={attachment.id} className="relative group">
                          {attachment.type === 'image' ? (
                            <div className="relative">
                              <img
                                src={attachment.preview}
                                alt={attachment.file.name}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                              />
                              <button
                                onClick={() => removeAttachment(attachment.id)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
                              <File className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-20">
                                {attachment.file.name}
                              </span>
                              <button
                                onClick={() => removeAttachment(attachment.id)}
                                className="w-4 h-4 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <div className="flex space-x-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = 'image/*';
                            fileInputRef.current.click();
                            fileInputRef.current.accept = 'image/*,.pdf,.doc,.docx,.txt,.md';
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Attach image"
                      >
                        <Image className="w-5 h-5" />
                      </button>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      disabled={isLoading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={(!message.trim() && attachments.length === 0) || isLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Welcome to Trae Cursor Blackbox
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Your intelligent AI assistant with dual-mode operation
                  </p>
                  <button
                    onClick={createNewConversation}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Start New Conversation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;