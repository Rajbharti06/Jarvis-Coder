/**
 * Warp Terminal Chat Component
 * Advanced terminal interface with AI integration
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { WarpTerminal } from '../Terminal/WarpTerminal';
import ModelSettings from '../Settings/ModelSettings';
import { cn } from '../../utils/cn';
import offlineFirstService from '../../services/offlineFirstService';
import { 
  ComputerDesktopIcon, 
  CommandLineIcon, 
  SparklesIcon,
  CogIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

interface WarpChatWindowProps {
  className?: string;
}

export const WarpChatWindow: React.FC<WarpChatWindowProps> = ({ className }) => {
  const { 
    currentModel, 
    isOffline, 
    setCurrentModel,
    addToast 
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'terminal' | 'ai'>('terminal');
  const [showSettings, setShowSettings] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const handleTerminalCommand = useCallback((command: string) => {
    console.log('Terminal command:', command);
  }, []);

  // Monitor offline-first status
  useEffect(() => {
    const updateConnectionStatus = () => {
      const syncStatus = offlineFirstService.getSyncStatus();
      setIsOnline(syncStatus.isOnline);
      setHasPendingSync(syncStatus.pendingSync);
    };

    updateConnectionStatus();
    const statusInterval = setInterval(updateConnectionStatus, 5000);

    return () => clearInterval(statusInterval);
  }, []);

  const handleAIResponse = useCallback((response: string) => {
    console.log('AI response:', response);
    addToast({
      id: Date.now().toString(),
      type: 'success',
      message: 'AI response received',
      duration: 2000
    });
  }, [addToast]);

  const toggleAIMode = () => {
    setAiMode(!aiMode);
    addToast({
      id: Date.now().toString(),
      type: 'info',
      message: aiMode ? 'AI mode disabled' : 'AI mode enabled',
      duration: 2000
    });
  };

  const toggleMode = () => {
    setActiveTab(activeTab === 'terminal' ? 'ai' : 'terminal');
  };

  return (
    <div className={cn(
      "flex flex-col h-full glass-panel relative overflow-hidden",
      className
    )}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-background/30 backdrop-blur-sm"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <CommandLineIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white/90 font-mono">
              Warp Terminal
              <span className={cn('connection-status', isOnline ? 'online' : 'offline')}>
                {isOnline ? '🟢' : '🔴'}
              </span>
              {hasPendingSync && <span className="sync-indicator">🔄</span>}
            </h2>
          </div>
          
          {/* Mode indicator */}
          <div className={cn(
            "flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border",
            activeTab === 'ai' 
              ? "bg-purple-500/20 border-purple-500/30 text-purple-300" 
              : "bg-green-500/20 border-green-500/30 text-green-300"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              activeTab === 'ai' ? "bg-purple-500" : "bg-green-500"
            )} />
            <span>{activeTab === 'ai' ? 'AI Mode' : 'Terminal Mode'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* AI Mode Toggle */}
          <button
            onClick={toggleAIMode}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 border",
              aiMode 
                ? "bg-purple-500/20 border-purple-500/30 text-purple-300" 
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            )}
            title="Toggle AI Integration"
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="text-xs font-medium">AI</span>
          </button>

          {/* Mode Toggle */}
          <button
            onClick={toggleMode}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all duration-200"
            title="Switch between Terminal and AI Chat"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" />
            <span className="text-xs font-medium">Switch</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all duration-200"
            title="Terminal Settings"
          >
            <CogIcon className="w-4 h-4" />
            <span className="text-xs font-medium">Settings</span>
          </button>

          {/* Model Status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isOffline ? "bg-blue-500" : "bg-green-500"
            )} />
            <span className="text-xs text-white/70">
              {currentModel || (isOffline ? "Local LLM" : "Online API")}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 relative">
          <AnimatePresence mode="wait">
          {activeTab === 'terminal' ? (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <WarpTerminal 
                onCommand={handleTerminalCommand}
                onAIResponse={handleAIResponse}
                className="h-full rounded-none border-0"
              />
            </motion.div>
          ) : (
            <motion.div
              key="ai-chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col"
            >
              {/* AI Chat Interface */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="text-center text-white/50 mb-8">
                  <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white/80 mb-2">AI Assistant Mode</h3>
                  <p className="text-sm">Ask me anything about coding, debugging, or development!</p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <button className="glass-card p-4 text-left hover:bg-white/5 transition-all duration-200 group">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <ComputerDesktopIcon className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="font-medium text-white/90">Explain Code</span>
                    </div>
                    <p className="text-sm text-white/60">Get detailed explanations for any code snippet</p>
                  </button>

                  <button className="glass-card p-4 text-left hover:bg-white/5 transition-all duration-200 group">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CommandLineIcon className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="font-medium text-white/90">Generate Code</span>
                    </div>
                    <p className="text-sm text-white/60">Create code from natural language descriptions</p>
                  </button>

                  <button className="glass-card p-4 text-left hover:bg-white/5 transition-all duration-200 group">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <SparklesIcon className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="font-medium text-white/90">Debug Help</span>
                    </div>
                    <p className="text-sm text-white/60">Get help debugging errors and issues</p>
                  </button>

                  <button className="glass-card p-4 text-left hover:bg-white/5 transition-all duration-200 group">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <CogIcon className="w-4 h-4 text-yellow-400" />
                      </div>
                      <span className="font-medium text-white/90">Optimize Code</span>
                    </div>
                    <p className="text-sm text-white/60">Improve performance and best practices</p>
                  </button>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-6 border-t border-white/10 bg-background/30 backdrop-blur-sm">
                <div className="max-w-2xl mx-auto">
                  <div className="relative">
                    <textarea
                      placeholder="Ask me anything... (e.g., 'How do I implement binary search in Python?')"
                      className="w-full min-h-[60px] max-h-[120px] resize-none glass-input pr-12"
                      rows={1}
                    />
                    <button className="absolute right-3 bottom-3 glass-button p-2">
                      <SparklesIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-white/50">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <span>Powered by {currentModel}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-lg border-t border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-white/90">Terminal Settings</h4>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/50 hover:text-white/80"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Default Shell</label>
                <select className="w-full glass-input">
                  <option>bash</option>
                  <option>zsh</option>
                  <option>powershell</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-white/70 mb-2">Theme</label>
                <select className="w-full glass-input">
                  <option>Dark</option>
                  <option>Light</option>
                  <option>Auto</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WarpChatWindow;