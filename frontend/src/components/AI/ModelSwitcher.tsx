import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  CpuChipIcon,
  CloudIcon,
  WifiIcon,
  SignalSlashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Model {
  id: string;
  name: string;
  provider: string;
  type: 'online' | 'offline';
  capabilities: string[];
  status: 'available' | 'unavailable' | 'loading';
  description?: string;
}

interface ModelSwitcherProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  selectedModel,
  onModelChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);

  // Default models configuration
  const defaultModels: Model[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'OpenAI',
      type: 'online',
      capabilities: ['chat', 'code', 'analysis'],
      status: 'available',
      description: 'Most capable model for complex tasks'
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      type: 'online',
      capabilities: ['chat', 'code'],
      status: 'available',
      description: 'Fast and efficient for most tasks'
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'Anthropic',
      type: 'online',
      capabilities: ['chat', 'code', 'analysis', 'reasoning'],
      status: 'available',
      description: 'Excellent for complex reasoning and analysis'
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'Anthropic',
      type: 'online',
      capabilities: ['chat', 'code'],
      status: 'available',
      description: 'Balanced performance and speed'
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'Google',
      type: 'online',
      capabilities: ['chat', 'code', 'multimodal'],
      status: 'available',
      description: 'Google\'s most capable model'
    },
    {
      id: 'perplexity-sonar',
      name: 'Perplexity Sonar',
      provider: 'Perplexity',
      type: 'online',
      capabilities: ['chat', 'search', 'research'],
      status: 'available',
      description: 'Real-time web search and research'
    },
    {
      id: 'groq-mixtral',
      name: 'Mixtral 8x7B',
      provider: 'Groq',
      type: 'online',
      capabilities: ['chat', 'code'],
      status: 'available',
      description: 'Ultra-fast inference speed'
    },
    {
      id: 'ollama-llama2',
      name: 'Llama 2 7B',
      provider: 'Ollama',
      type: 'offline',
      capabilities: ['chat', 'code'],
      status: 'unavailable',
      description: 'Local model for privacy'
    },
    {
      id: 'ollama-codellama',
      name: 'Code Llama 7B',
      provider: 'Ollama',
      type: 'offline',
      capabilities: ['code'],
      status: 'unavailable',
      description: 'Specialized for code generation'
    },
    {
      id: 'ollama-mistral',
      name: 'Mistral 7B',
      provider: 'Ollama',
      type: 'offline',
      capabilities: ['chat', 'code'],
      status: 'unavailable',
      description: 'Efficient local model'
    }
  ];

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        // Try to fetch available models from backend
        const response = await fetch('/api/models/available');
        if (response.ok) {
          const availableModels = await response.json();
          setModels(availableModels);
        } else {
          // Fallback to default models
          setModels(defaultModels);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        setModels(defaultModels);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const selectedModelData = models.find(m => m.id === selectedModel);
  const availableModels = models.filter(m => 
    m.status === 'available' && (isOnline || m.type === 'offline')
  );

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'ollama':
        return <CpuChipIcon className="w-4 h-4" />;
      default:
        return <CloudIcon className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (model: Model) => {
    if (model.type === 'offline' && model.status === 'unavailable') {
      return <SignalSlashIcon className="w-4 h-4 text-gray-500" />;
    }
    if (model.type === 'online' && !isOnline) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
    }
    if (model.status === 'available') {
      return <CheckIcon className="w-4 h-4 text-green-500" />;
    }
    return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 backdrop-blur-xl border border-gray-600/50 rounded-lg hover:bg-gray-700/50 transition-all duration-200 min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
          {selectedModelData && getProviderIcon(selectedModelData.provider)}
          <div className="flex flex-col items-start">
            <span className="text-white text-sm font-medium">
              {selectedModelData?.name || 'Select Model'}
            </span>
            <span className="text-gray-400 text-xs">
              {selectedModelData?.provider}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isOnline && (
            <SignalSlashIcon className="w-4 h-4 text-red-400" title="Offline" />
          )}
          {isOnline && (
            <WifiIcon className="w-4 h-4 text-green-400" title="Online" />
          )}
          <ChevronDownIcon 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-xl border border-gray-600/50 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 text-center text-gray-400">
                Loading models...
              </div>
            ) : (
              <div className="p-2">
                {/* Online Models */}
                {isOnline && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Online Models
                    </div>
                    {models
                      .filter(m => m.type === 'online')
                      .map((model) => (
                        <ModelOption
                          key={model.id}
                          model={model}
                          isSelected={model.id === selectedModel}
                          isAvailable={isOnline && model.status === 'available'}
                          onClick={() => {
                            if (isOnline && model.status === 'available') {
                              onModelChange(model.id);
                              setIsOpen(false);
                            }
                          }}
                        />
                      ))}
                  </>
                )}

                {/* Offline Models */}
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">
                  Offline Models
                </div>
                {models
                  .filter(m => m.type === 'offline')
                  .map((model) => (
                    <ModelOption
                      key={model.id}
                      model={model}
                      isSelected={model.id === selectedModel}
                      isAvailable={model.status === 'available'}
                      onClick={() => {
                        if (model.status === 'available') {
                          onModelChange(model.id);
                          setIsOpen(false);
                        }
                      }}
                    />
                  ))}

                {availableModels.length === 0 && (
                  <div className="p-4 text-center text-gray-400">
                    No models available
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ModelOptionProps {
  model: Model;
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
}

const ModelOption: React.FC<ModelOptionProps> = ({
  model,
  isSelected,
  isAvailable,
  onClick
}) => {
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'ollama':
        return <CpuChipIcon className="w-4 h-4" />;
      default:
        return <CloudIcon className="w-4 h-4" />;
    }
  };

  const getStatusIcon = () => {
    if (!isAvailable) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
    }
    return <CheckIcon className="w-4 h-4 text-green-400" />;
  };

  return (
    <button
      onClick={onClick}
      disabled={!isAvailable}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
        isSelected
          ? 'bg-purple-500/20 border border-purple-500/30'
          : isAvailable
          ? 'hover:bg-gray-800/50'
          : 'opacity-50 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-2">
        {getProviderIcon(model.provider)}
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            isSelected ? 'text-purple-300' : 'text-white'
          }`}>
            {model.name}
          </span>
          <span className="text-xs text-gray-400">
            {model.provider}
          </span>
        </div>
        {model.description && (
          <p className="text-xs text-gray-400 mt-1">
            {model.description}
          </p>
        )}
        <div className="flex gap-1 mt-1">
          {model.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-xs px-1.5 py-0.5 bg-gray-700/50 text-gray-300 rounded"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {isSelected && (
        <CheckIcon className="w-4 h-4 text-purple-400" />
      )}
    </button>
  );
};