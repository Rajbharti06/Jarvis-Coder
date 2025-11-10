/**
 * Model Switcher Component for Warp Terminal
 * Allows users to switch between different AI models with performance metrics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  maxTokens: number;
  costPerToken: number;
  avgResponseTime: number;
  supportsStreaming: boolean;
  contextWindow: number;
  status: 'available' | 'unavailable' | 'loading';
  errorRate?: number;
  usageCount?: number;
}

interface ModelSwitcherProps {
  currentModel: string;
  models: ModelInfo[];
  onModelChange: (modelId: string) => void;
  isOffline: boolean;
  className?: string;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  currentModel,
  models,
  onModelChange,
  isOffline,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter models based on search query and offline status
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const isCompatible = isOffline ? model.provider === 'ollama' : true;
    return matchesSearch && isCompatible && model.status === 'available';
  });

  const currentModelInfo = models.find(m => m.id === currentModel);

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai': return '🤖';
      case 'anthropic': return '🧠';
      case 'google': return '🔍';
      case 'perplexity': return '🔮';
      case 'groq': return '⚡';
      case 'mistral': return '🌪️';
      case 'ollama': return '🔄';
      default: return '🤖';
    }
  };

  const getStatusColor = (model: ModelInfo) => {
    if (model.status !== 'available') return 'text-red-400';
    if (model.errorRate && model.errorRate > 0.1) return 'text-yellow-400';
    if (model.avgResponseTime > 5) return 'text-orange-400';
    return 'text-green-400';
  };

  const formatResponseTime = (time: number) => {
    if (time < 1) return `${(time * 1000).toFixed(0)}ms`;
    return `${time.toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    return `$${cost.toFixed(6)}/token`;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Model Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          "bg-white/10 hover:bg-white/20 border border-white/20",
          "backdrop-blur-sm text-white/90"
        )}
      >
        <span className="text-lg">
          {currentModelInfo ? getProviderIcon(currentModelInfo.provider) : '🤖'}
        </span>
        <span className="truncate max-w-32">
          {currentModelInfo?.name || 'Select Model'}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs"
        >
          ▼
        </motion.span>
      </button>

      {/* Model Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 border-b border-white/10">
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* Model List */}
              <div className="max-h-80 overflow-y-auto">
                {filteredModels.length === 0 ? (
                  <div className="p-4 text-center text-white/60 text-sm">
                    {searchQuery ? 'No models found' : 'No models available'}
                  </div>
                ) : (
                  filteredModels.map((model) => (
                    <motion.button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left hover:bg-white/10 transition-colors",
                        currentModel === model.id && "bg-blue-500/20"
                      )}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                      {/* Provider Icon */}
                      <span className="text-xl flex-shrink-0">
                        {getProviderIcon(model.provider)}
                      </span>

                      {/* Model Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {model.name}
                          </span>
                          <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(model))}>
                            {model.status}
                          </span>
                        </div>
                        <div className="text-xs text-white/60 mt-1">
                          {model.provider} • {formatResponseTime(model.avgResponseTime)} • {formatCost(model.costPerToken)}
                        </div>
                        {model.capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {model.capabilities.slice(0, 3).map((capability) => (
                              <span
                                key={capability}
                                className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/70"
                              >
                                {capability}
                              </span>
                            ))}
                            {model.capabilities.length > 3 && (
                              <span className="text-xs text-white/50">
                                +{model.capabilities.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Performance Metrics */}
                      <div className="flex flex-col items-end text-xs text-white/60 space-y-1">
                        {model.errorRate !== undefined && (
                          <div className={cn(
                            "px-2 py-1 rounded",
                            model.errorRate > 0.1 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                          )}>
                            {model.errorRate > 0 ? `${(model.errorRate * 100).toFixed(1)}% error` : 'No errors'}
                          </div>
                        )}
                        {model.usageCount !== undefined && (
                          <div className="text-white/50">
                            {model.usageCount} uses
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    {isOffline ? 'Offline Mode - Local models only' : 'Online Mode - All models available'}
                  </span>
                  <span>
                    {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} available
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ModelSwitcher;
