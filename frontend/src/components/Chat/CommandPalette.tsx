import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../hooks/useStore';
import { Search, Command, Wrench, RefreshCw, Zap, Play, SearchCode, Database, GitBranch, Check, Undo } from 'lucide-react';

interface CommandItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: (args?: string) => void;
  requiresArgs?: boolean;
}

interface CommandPaletteProps {
  onExecute: (cmd: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onExecute }) => {
  const { commandPaletteOpen, setCommandPaletteOpen } = useStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    if (commandPaletteOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  // Define commands
  const commands: CommandItem[] = [
    {
      id: 'fix',
      name: '/fix',
      description: 'Find and fix bugs in current file',
      icon: <Wrench size={16} className="text-blue-400" />,
      action: () => onExecute('/fix')
    },
    {
      id: 'refactor',
      name: '/refactor',
      description: 'Refactor code for better structure',
      icon: <RefreshCw size={16} className="text-green-400" />,
      action: () => onExecute('/refactor')
    },
    {
      id: 'optimize',
      name: '/optimize',
      description: 'Optimize performance of current code',
      icon: <Zap size={16} className="text-yellow-400" />,
      action: () => onExecute('/optimize')
    },
    {
      id: 'test',
      name: '/test',
      description: 'Run tests for current file or workspace',
      icon: <Play size={16} className="text-red-400" />,
      action: () => onExecute('/test')
    },
    {
      id: 'search',
      name: '/search',
      description: 'Semantic search across codebase',
      icon: <SearchCode size={16} className="text-purple-400" />,
      requiresArgs: true,
      action: (args) => onExecute(`/search ${args}`)
    },
    {
      id: 'apply',
      name: '/apply',
      description: 'Apply the latest code suggestion from AI',
      icon: <Check size={16} className="text-emerald-400" />,
      action: () => onExecute('/apply')
    },
    {
      id: 'undo',
      name: '/undo',
      description: 'Undo the last AI code edit on active file',
      icon: <Undo size={16} className="text-orange-400" />,
      action: () => onExecute('/undo')
    },
    {
      id: 'index',
      name: '/index',
      description: 'Rebuild the semantic search index locally',
      icon: <Database size={16} className="text-gray-400" />,
      action: () => onExecute('/index')
    },
    {
      id: 'git',
      name: '/git status',
      description: 'Check git status',
      icon: <GitBranch size={16} className="text-orange-500" />,
      action: () => onExecute('/git status')
    },
  ];

  // Filter commands
  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(query.toLowerCase()) || 
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        const cmd = filteredCommands[selectedIndex];
        if (cmd.requiresArgs) {
          // Keep it open or just auto append
          setQuery(cmd.name + ' ');
        } else {
          cmd.action();
          setCommandPaletteOpen(false);
        }
      } else if (query.startsWith('/')) {
        onExecute(query);
        setCommandPaletteOpen(false);
      }
    }
  };

  const handleSelect = (cmd: CommandItem) => {
    if (cmd.requiresArgs) {
      setQuery(cmd.name + ' ');
      inputRef.current?.focus();
    } else {
      cmd.action();
      setCommandPaletteOpen(false);
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-xl bg-[#1e1e1e] border border-[#3e3e42] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input area */}
        <div className="flex items-center px-4 py-3 border-b border-[#3e3e42]">
          <Command size={18} className="text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-gray-100 text-lg placeholder-gray-500"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="text-xs text-gray-500 flex gap-1">
            <span className="bg-[#2d2d2d] px-1.5 py-0.5 rounded">↑↓</span> to navigate
            <span className="bg-[#2d2d2d] px-1.5 py-0.5 rounded ml-1">↵</span> to select
          </div>
        </div>

        {/* Command List */}
        <div className="max-h-[60vh] overflow-y-auto w-full custom-scrollbar">
          {filteredCommands.length > 0 ? (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase mix-blend-screen">Available Commands</div>
              {filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${
                    idx === selectedIndex ? 'bg-[#2a2d2e] text-white' : 'text-gray-300 hover:bg-[#252526]'
                  }`}
                >
                  <div className="mr-3 w-6 h-6 flex items-center justify-center bg-[#252526] rounded">
                    {cmd.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-sm font-medium">{cmd.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{cmd.description}</div>
                  </div>
                  {cmd.requiresArgs && idx === selectedIndex && (
                    <div className="text-xs text-blue-400 font-mono italic">requires arguments...</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400">
              <Search size={24} className="mx-auto mb-2 opacity-30" />
              <p>No matching commands found.</p>
              <p className="text-sm mt-1 text-gray-500 font-mono">{query.startsWith('/') ? 'Press Enter to run as raw command' : ''}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close map to outer div */}
      <div className="absolute inset-0 -z-10" onClick={() => setCommandPaletteOpen(false)}></div>
    </div>
  );
};
