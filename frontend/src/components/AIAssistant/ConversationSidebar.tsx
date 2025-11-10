import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Calendar,
  Filter,
  Download,
  Globe,
  Cpu
} from 'lucide-react';

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

interface SystemStatus {
  mode: 'online' | 'offline';
  current_provider: string;
  available_providers: string[];
  system_health: 'healthy' | 'degraded' | 'error';
  active_models: number;
  total_conversations: number;
  uptime: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  status: 'available' | 'unavailable' | 'loading';
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  systemStatus: SystemStatus | null;
  models: AIModel[];
  selectedModel: string;
  onNewConversation: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onSwitchMode: (mode: 'online' | 'offline') => void;
  onSwitchProvider: (provider: string) => void;
  onSelectModel: (modelId: string) => void;
  onExportConversations: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  currentConversation,
  systemStatus,
  models,
  selectedModel,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onSwitchMode,
  onSwitchProvider,
  onSelectModel,
  onExportConversations
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some(msg => 
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply time filter
    const now = new Date();
    switch (filterMode) {
      case 'today':
        filtered = filtered.filter(conv => {
          const convDate = new Date(conv.updated_at);
          return convDate.toDateString() === now.toDateString();
        });
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(conv => new Date(conv.updated_at) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(conv => new Date(conv.updated_at) >= monthAgo);
        break;
    }

    // Sort by updated_at descending
    return filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [conversations, searchQuery, filterMode]);

  const handleStartEdit = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameConversation(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewConversation}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl mb-4 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-3">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>

          <button
            onClick={onExportConversations}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Export conversations"
          >
            <Download className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* System Status */}
        {systemStatus && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 mb-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {systemStatus.mode === 'online' ? (
                  <Globe className="w-3 h-3 text-green-600" />
                ) : (
                  <Cpu className="w-3 h-3 text-orange-600" />
                )}
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
                  {systemStatus.mode}
                </span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                systemStatus.system_health === 'healthy' ? 'bg-green-500' :
                systemStatus.system_health === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>

            {/* Mode Toggle */}
            <div className="flex space-x-1 mb-2">
              <button
                onClick={() => onSwitchMode('online')}
                className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                  systemStatus.mode === 'online'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Online
              </button>
              <button
                onClick={() => onSwitchMode('offline')}
                className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                  systemStatus.mode === 'offline'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Offline
              </button>
            </div>

            {/* Model Selection */}
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversation?.id === conversation.id
                    ? 'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit();
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conversation.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {conversation.messages.length} messages • {formatRelativeTime(new Date(conversation.updated_at))}
                        </p>
                      </>
                    )}
                  </div>

                  {editingId !== conversation.id && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(conversation);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Rename"
                      >
                        <Edit3 className="w-3 h-3 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preview of last message */}
                {conversation.messages.length > 0 && editingId !== conversation.id && (
                  <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 truncate">
                    {conversation.messages[conversation.messages.length - 1].content.slice(0, 60)}
                    {conversation.messages[conversation.messages.length - 1].content.length > 60 && '...'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;