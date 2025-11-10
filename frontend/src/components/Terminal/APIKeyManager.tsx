/**
 * API Key Manager Component for Warp Terminal
 * Secure management of API keys for different AI providers
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  apiKey: string;
  isConfigured: boolean;
  isEncrypted: boolean;
  lastUsed?: string;
  usageCount?: number;
}

interface APIKeyManagerProps {
  providers: ProviderConfig[];
  onKeyUpdate: (providerId: string, apiKey: string) => void;
  onKeyRemove: (providerId: string) => void;
  onTestConnection: (providerId: string) => Promise<boolean>;
  className?: string;
}

export const APIKeyManager: React.FC<APIKeyManagerProps> = ({
  providers,
  onKeyUpdate,
  onKeyRemove,
  onTestConnection,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const handleKeyUpdate = (providerId: string) => {
    if (newApiKey.trim()) {
      onKeyUpdate(providerId, newApiKey.trim());
      setNewApiKey('');
      setEditingProvider(null);
    }
  };

  const handleKeyRemove = (providerId: string) => {
    if (confirm('Are you sure you want to remove this API key?')) {
      onKeyRemove(providerId);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const result = await onTestConnection(providerId);
      setTestResults(prev => ({ ...prev, [providerId]: result }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [providerId]: false }));
    } finally {
      setTestingProvider(null);
    }
  };

  const toggleKeyVisibility = (providerId: string) => {
    setShowKey(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const getStatusColor = (provider: ProviderConfig) => {
    if (!provider.isConfigured) return 'text-gray-400';
    if (testResults[provider.id] === false) return 'text-red-400';
    if (testResults[provider.id] === true) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getStatusText = (provider: ProviderConfig) => {
    if (!provider.isConfigured) return 'Not configured';
    if (testResults[provider.id] === false) return 'Connection failed';
    if (testResults[provider.id] === true) return 'Connected';
    return 'Not tested';
  };

  return (
    <div className={cn("relative", className)}>
      {/* API Keys Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          "bg-white/10 hover:bg-white/20 border border-white/20",
          "backdrop-blur-sm text-white/90"
        )}
      >
        <span className="text-lg">🔑</span>
        <span>API Keys</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-xs"
        >
          ▼
        </motion.span>
      </button>

      {/* API Keys Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden min-w-96">
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">API Key Manager</h3>
                <p className="text-sm text-white/60 mt-1">
                  Manage API keys for different AI providers
                </p>
              </div>

              {/* Provider List */}
              <div className="max-h-96 overflow-y-auto">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Provider Icon */}
                      <span className="text-2xl flex-shrink-0 mt-1">
                        {provider.icon}
                      </span>

                      {/* Provider Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white">{provider.name}</h4>
                          <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(provider))}>
                            {getStatusText(provider)}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 mb-2">{provider.description}</p>

                        {/* API Key Display */}
                        {provider.isConfigured ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-white/10 rounded-lg px-3 py-2 font-mono text-sm">
                              {showKey[provider.id] 
                                ? provider.apiKey 
                                : '•'.repeat(Math.min(provider.apiKey.length, 20))
                              }
                            </div>
                            <button
                              onClick={() => toggleKeyVisibility(provider.id)}
                              className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/70"
                            >
                              {showKey[provider.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-white/50 italic">
                            No API key configured
                          </div>
                        )}

                        {/* Usage Stats */}
                        {(provider.lastUsed || provider.usageCount) && (
                          <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                            {provider.lastUsed && (
                              <span>Last used: {provider.lastUsed}</span>
                            )}
                            {provider.usageCount && (
                              <span>Used {provider.usageCount} times</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {editingProvider === provider.id ? (
                          <div className="flex gap-2">
                            <input
                              type="password"
                              placeholder="Enter API key..."
                              value={newApiKey}
                              onChange={(e) => setNewApiKey(e.target.value)}
                              className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleKeyUpdate(provider.id)}
                              disabled={!newApiKey.trim()}
                              className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded text-green-400 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingProvider(null);
                                setNewApiKey('');
                              }}
                              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingProvider(provider.id)}
                              className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-400 text-xs"
                            >
                              {provider.isConfigured ? 'Update' : 'Add'}
                            </button>
                            {provider.isConfigured && (
                              <>
                                <button
                                  onClick={() => handleTestConnection(provider.id)}
                                  disabled={testingProvider === provider.id}
                                  className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-50 rounded text-yellow-400 text-xs"
                                >
                                  {testingProvider === provider.id ? 'Testing...' : 'Test'}
                                </button>
                                <button
                                  onClick={() => handleKeyRemove(provider.id)}
                                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 text-xs"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    Keys are encrypted and stored securely
                  </span>
                  <span>
                    {providers.filter(p => p.isConfigured).length} of {providers.length} configured
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

export default APIKeyManager;
