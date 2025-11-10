import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JarvisTerminal } from './Terminal/JarvisTerminal';
import { AIChatPanel } from './AI/AIChatPanel';
import { useTerminalStore } from '../stores/terminalStore';
import {
  Cog6ToothIcon,
  SparklesIcon,
  CommandLineIcon,
  DocumentTextIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

interface JarvisTerminalAppProps {
  className?: string;
}

export const JarvisTerminalApp: React.FC<JarvisTerminalAppProps> = ({
  className = ''
}) => {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  
  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    isCommandPaletteOpen,
    toggleCommandPalette,
    toggleAIMode,
  } = useTerminalStore();

  // Initialize with a default session
  useEffect(() => {
    if (sessions.length === 0) {
      createSession('Main Terminal');
    }
  }, [sessions.length, createSession]);

  const handleCommand = useCallback(async (command: string) => {
    try {
      // Send command to backend
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          session_id: activeSessionId,
        }),
      });

      const result = await response.json();
      
      // Handle the result in the terminal
      console.log('Command result:', result);
      
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }, [activeSessionId]);

  const handleAICommand = useCallback((query: string) => {
    // Open AI chat panel and send the query
    setIsAIChatOpen(true);
    // The AI panel will handle the query
  }, []);

  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          toggleCommandPalette();
          break;
        case 'k':
          e.preventDefault();
          toggleAIMode(true);
          toggleCommandPalette(true);
          break;
        case 'j':
          e.preventDefault();
          setIsAIChatOpen(prev => !prev);
          break;
        case ',':
          e.preventDefault();
          setIsSettingsOpen(prev => !prev);
          break;
        case 'e':
          e.preventDefault();
          setIsFileExplorerOpen(prev => !prev);
          break;
      }
    }
  }, [toggleCommandPalette, toggleAIMode]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  return (
    <div className={`h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden ${className}`}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      
      {/* Main layout */}
      <div className="relative h-full flex">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-16 bg-gray-900/50 backdrop-blur-xl border-r border-gray-700/50 flex flex-col items-center py-4 gap-4"
        >
          {/* Logo */}
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => toggleCommandPalette()}
              className="p-3 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
              title="Command Palette (Ctrl+Space)"
            >
              <CommandLineIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setIsAIChatOpen(!isAIChatOpen)}
              className={`p-3 rounded-lg transition-all duration-200 ${
                isAIChatOpen 
                  ? 'text-purple-400 bg-purple-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
              title="AI Assistant (Ctrl+J)"
            >
              <SparklesIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)}
              className={`p-3 rounded-lg transition-all duration-200 ${
                isFileExplorerOpen 
                  ? 'text-blue-400 bg-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
              title="File Explorer (Ctrl+E)"
            >
              <FolderIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Settings at bottom */}
          <div className="mt-auto">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-3 rounded-lg transition-all duration-200 ${
                isSettingsOpen 
                  ? 'text-green-400 bg-green-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
              title="Settings (Ctrl+,)"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 flex">
          {/* File Explorer */}
          <AnimatePresence>
            {isFileExplorerOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="bg-gray-900/30 backdrop-blur-xl border-r border-gray-700/50 overflow-hidden"
              >
                <FileExplorer />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Terminal area */}
          <div className="flex-1 flex flex-col">
            {/* Session tabs */}
            {sessions.length > 1 && (
              <div className="flex items-center gap-2 p-2 bg-gray-900/30 backdrop-blur-xl border-b border-gray-700/50">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setActiveSession(session.id)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                      session.id === activeSessionId
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    {session.name}
                  </button>
                ))}
                <button
                  onClick={() => createSession()}
                  className="px-3 py-1 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg text-sm transition-all duration-200"
                >
                  +
                </button>
              </div>
            )}

            {/* Terminal */}
            <div className="flex-1 p-4">
              <JarvisTerminal
                onCommand={handleCommand}
                onAICommand={handleAICommand}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {isAIChatOpen && (
          <AIChatPanel
            isOpen={isAIChatOpen}
            onClose={() => setIsAIChatOpen(false)}
            onCommand={handleCommand}
          />
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// File Explorer Component
const FileExplorer: React.FC = () => {
  const [files] = useState([
    { name: 'src', type: 'folder', children: [
      { name: 'components', type: 'folder' },
      { name: 'utils', type: 'folder' },
      { name: 'App.tsx', type: 'file' },
      { name: 'main.tsx', type: 'file' },
    ]},
    { name: 'package.json', type: 'file' },
    { name: 'README.md', type: 'file' },
    { name: 'tsconfig.json', type: 'file' },
  ]);

  return (
    <div className="h-full p-4">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <FolderIcon className="w-5 h-5" />
        Explorer
      </h3>
      <div className="space-y-1">
        {files.map((file, index) => (
          <div key={index} className="flex items-center gap-2 p-2 text-gray-300 hover:bg-gray-800/50 rounded cursor-pointer">
            {file.type === 'folder' ? (
              <FolderIcon className="w-4 h-4 text-blue-400" />
            ) : (
              <DocumentTextIcon className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm">{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Settings Panel Component
const SettingsPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { fontSize, fontFamily, theme, updateSettings } = useTerminalStore(state => ({
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    theme: state.theme,
    updateSettings: state.updateSettings,
  }));

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-white mb-6">Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Font Size
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={fontSize}
              onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-sm text-gray-400">{fontSize}px</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Font Family
            </label>
            <select
              value={fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white"
            >
              <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
              <option value='"Fira Code", monospace'>Fira Code</option>
              <option value='"SF Mono", monospace'>SF Mono</option>
              <option value='Consolas, monospace'>Consolas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' | 'auto' })}
              className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};