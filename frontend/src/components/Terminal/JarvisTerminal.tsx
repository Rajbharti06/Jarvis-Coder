import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CommandLineIcon, 
  SparklesIcon, 
  CogIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import '@xterm/xterm/css/xterm.css';

interface JarvisTerminalProps {
  onCommand?: (command: string) => void;
  onAICommand?: (command: string) => void;
  className?: string;
  promptPrefix?: string;
  soundEnabled?: boolean;
}

interface CommandHistory {
  command: string;
  output: string;
  timestamp: number;
  success: boolean;
}

export const JarvisTerminal: React.FC<JarvisTerminalProps> = ({
  onCommand,
  onAICommand,
  className = '',
  promptPrefix = '$',
  soundEnabled = false
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [isAIMode, setIsAIMode] = useState(false);
  const [currentPath, setCurrentPath] = useState('~/jarvis-terminal');
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputBuffer, setInputBuffer] = useState<string>('');
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  // Terminal theme - Warp-style glassmorphic
  const terminalTheme = {
    background: 'rgba(0, 0, 0, 0.1)',
    foreground: '#ffffff',
    cursor: '#00ff88',
    cursorAccent: '#00ff88',
    selection: 'rgba(0, 255, 136, 0.3)',
    black: '#000000',
    red: '#ff6b6b',
    green: '#00ff88',
    yellow: '#ffd93d',
    blue: '#6bcbff',
    magenta: '#ff6bff',
    cyan: '#6bffff',
    white: '#ffffff',
    brightBlack: '#666666',
    brightRed: '#ff8e8e',
    brightGreen: '#88ffaa',
    brightYellow: '#ffe066',
    brightBlue: '#88d4ff',
    brightMagenta: '#ff88ff',
    brightCyan: '#88ffff',
    brightWhite: '#ffffff'
  };

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    terminal.current = new Terminal({
      theme: terminalTheme,
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      minimumContrastRatio: 1,
      scrollback: 10000,
      convertEol: true,
    });

    // Add addons
    fitAddon.current = new FitAddon();
    searchAddon.current = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.current.loadAddon(fitAddon.current);
    terminal.current.loadAddon(searchAddon.current);
    terminal.current.loadAddon(webLinksAddon);

    // Open terminal
    terminal.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Welcome message
    terminal.current.writeln('\x1b[32m╭─────────────────────────────────────────────────────────╮\x1b[0m');
    terminal.current.writeln('\x1b[32m│\x1b[0m \x1b[1;36m🤖 Welcome to Jarvis Terminal\x1b[0m                      \x1b[32m│\x1b[0m');
    terminal.current.writeln('\x1b[32m│\x1b[0m \x1b[90mYour AI-powered development companion\x1b[0m              \x1b[32m│\x1b[0m');
    terminal.current.writeln('\x1b[32m│\x1b[0m                                                       \x1b[32m│\x1b[0m');
    terminal.current.writeln('\x1b[32m│\x1b[0m \x1b[33mCommands:\x1b[0m                                          \x1b[32m│\x1b[0m');
    terminal.current.writeln('\x1b[32m│\x1b[0m   \x1b[36mCtrl+Space\x1b[0m - Open command palette              \x1b[32m│\x1b[0m');
    terminal.current.writeln('\x1b[32m│\x1b[0m   \x1b[36mCtrl+K\x1b[0m     - AI assistant mode                 \x1b[32m│\x1b[0m');
    terminal.current.writeln('\x1b[32m│\x1b[0m   \x1b[36mCtrl+F\x1b[0m     - Search terminal                   \x1b[32m│\x1b[0m');
    terminal.current.writeln('\x1b[32m╰─────────────────────────────────────────────────────────╯\x1b[0m');
    terminal.current.writeln('');
    writePrompt();

    // Real-time input handling with echo
    terminal.current.onKey(({ key, domEvent }) => {
      const t = terminal.current!;
      // Ctrl+L clear
      if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') {
        domEvent.preventDefault();
        t.clear();
        setInputBuffer('');
        writePrompt();
        return;
      }
      // Ctrl+C interrupt
      if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
        domEvent.preventDefault();
        t.write('^C\r\n');
        setInputBuffer('');
        writePrompt();
        return;
      }
      // Handle Enter: submit command
      if (domEvent.key === 'Enter') {
        domEvent.preventDefault();
        t.write('\r\n');
        if (inputBuffer.trim()) {
          executeCommand(inputBuffer.trim());
          setCommandHistory(prev => [...prev, {
            command: inputBuffer.trim(),
            output: '',
            timestamp: Date.now(),
            success: true
          }]);
        } else {
          writePrompt();
        }
        setHistoryPointer(-1);
        setInputBuffer('');
        return;
      }
      // Handle Backspace
      if (domEvent.key === 'Backspace') {
        domEvent.preventDefault();
        if (inputBuffer.length > 0) {
          setInputBuffer(prev => prev.slice(0, -1));
          t.write('\b \b');
        }
        return;
      }
      // History navigation
      if (domEvent.key === 'ArrowUp' || domEvent.key === 'ArrowDown') {
        domEvent.preventDefault();
        const cmds = commandHistory.map(h => h.command);
        if (cmds.length === 0) return;
        let ptr = historyPointer;
        if (domEvent.key === 'ArrowUp') {
          ptr = ptr < 0 ? cmds.length - 1 : Math.max(0, ptr - 1);
        } else {
          ptr = ptr < 0 ? 0 : Math.min(cmds.length - 1, ptr + 1);
        }
        setHistoryPointer(ptr);
        // Erase current input from terminal line
        const currentLen = inputBuffer.length;
        for (let i = 0; i < currentLen; i++) t.write('\b \b');
        const newCmd = cmds[ptr] || '';
        setInputBuffer(newCmd);
        t.write(newCmd);
        return;
      }
      // Tab completion (basic)
      if (domEvent.key === 'Tab') {
        domEvent.preventDefault();
        const dictionary = [
          'clear','help','history','ls','dir','pwd','cd','echo',
          'git status','git commit -m','git checkout -b','npm run dev','npm test'
        ];
        const match = dictionary.find(d => d.startsWith(inputBuffer));
        if (match) {
          const suffix = match.slice(inputBuffer.length);
          setInputBuffer(match);
          terminal.current!.write(suffix);
        } else {
          // show quick hint
          terminal.current!.writeln('\r\n\x1b[90m(no completion)\x1b[0m');
          writePromptInline();
        }
        return;
      }
      // Printable characters
      if (key.length === 1 || key === ' ') {
        setInputBuffer(prev => prev + key);
        t.write(key);
        return;
      }
    });

    // Handle keyboard events
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setIsCommandMode(true);
      } else if (e.ctrlKey && e.code === 'KeyK') {
        e.preventDefault();
        setIsAIMode(true);
        setIsCommandMode(true);
      } else if (e.ctrlKey && e.code === 'KeyF') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', handleResize);
      if (terminal.current) {
        terminal.current.dispose();
      }
    };
  }, []);

  const writePrompt = useCallback(() => {
    if (!terminal.current) return;
    const prompt = `\x1b[1;32m┌─[\x1b[1;36mjarvis\x1b[1;32m@\x1b[1;35mterminal\x1b[1;32m]\x1b[0m \x1b[1;34m${currentPath}\x1b[0m\n\x1b[1;32m└─\x1b[1;36m${promptPrefix}\x1b[0m `;
    terminal.current.write(prompt);
  }, [currentPath]);

  const writePromptInline = useCallback(() => {
    if (!terminal.current) return;
    const prompt = `\x1b[1;32m└─\x1b[1;36m${promptPrefix}\x1b[0m `;
    terminal.current.write(prompt);
  }, []);

  const typewriter = useCallback(async (text: string, delay = 5) => {
    if (!terminal.current) return;
    for (let i = 0; i < text.length; i++) {
      terminal.current.write(text[i]);
      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, delay));
    }
    terminal.current.write('\r\n');
  }, []);

  const beep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 880;
      g.gain.value = 0.02;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => o.stop(), 60);
    } catch {}
  }, [soundEnabled]);

  const executeCommand = useCallback(async (command: string) => {
    if (!terminal.current) return;

    const timestamp = Date.now();
    
    try {
      // Add command to history
      terminal.current.writeln('');
      
      if (command.trim() === 'clear') {
        terminal.current.clear();
        writePrompt();
        return;
      }

      if (command.trim() === 'help') {
        terminal.current.writeln('\x1b[33mJarvis Terminal Commands:\x1b[0m');
        await typewriter('  clear       - Clear terminal');
        await typewriter('  help        - Show this help');
        await typewriter('  history     - Show command history');
        await typewriter('  ai <query>  - Ask AI assistant');
        terminal.current.writeln('');
        writePrompt();
        return;
      }

      if (command.trim() === 'history') {
        terminal.current.writeln('\x1b[33mCommand History:\x1b[0m');
        commandHistory.slice(-10).forEach((cmd, index) => {
          const status = cmd.success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
          terminal.current?.writeln(`  ${status} ${cmd.command}`);
        });
        terminal.current.writeln('');
        writePrompt();
        return;
      }

      if (command.trim().startsWith('ai ')) {
        const query = command.slice(3).trim();
        terminal.current.writeln(`\x1b[36m🤖 AI Assistant:\x1b[0m ${query}`);
        terminal.current.writeln('\x1b[90m⏳ Processing...\x1b[0m');
        
        if (onAICommand) {
          onAICommand(query);
        }
        
        // Simulate AI response
        setTimeout(() => {
          terminal.current?.writeln('\x1b[32m✨ AI Response: I understand your query. This is where the AI would respond.\x1b[0m');
          terminal.current?.writeln('');
          writePrompt();
        }, 1000);
        
        setCommandHistory(prev => [...prev, {
          command,
          output: 'AI query processed',
          timestamp,
          success: true
        }]);
        return;
      }

      // Execute regular command
      terminal.current.writeln(`\x1b[90m⚡ Executing: ${command}\x1b[0m`);
      
      if (onCommand) {
        onCommand(command);
      }

      // Simulate command execution
      setTimeout(() => {
        if (command.includes('ls') || command.includes('dir')) {
          typewriter('\x1b[34mfolder1/\x1b[0m  \x1b[32mfile1.txt\x1b[0m  \x1b[32mfile2.js\x1b[0m  \x1b[35mREADME.md\x1b[0m', 2);
        } else if (command.includes('pwd')) {
          typewriter(`\x1b[36m${currentPath}\x1b[0m`, 3);
        } else {
          typewriter(`\x1b[90mCommand executed: ${command}\x1b[0m`, 3);
        }
        terminal.current?.writeln('');
        writePrompt();
        beep();
      }, 500);

      setCommandHistory(prev => [...prev, {
        command,
        output: 'Command executed successfully',
        timestamp,
        success: true
      }]);

    } catch (error) {
      terminal.current.writeln(`\x1b[31m❌ Error: ${error}\x1b[0m`);
      terminal.current.writeln('');
      writePrompt();
      
      setCommandHistory(prev => [...prev, {
        command,
        output: `Error: ${error}`,
        timestamp,
        success: false
      }]);
    }
  }, [onCommand, onAICommand, currentPath, commandHistory, writePrompt, typewriter, beep]);

  const handleCommandSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (commandInput.trim()) {
      executeCommand(commandInput.trim());
      setCommandInput('');
    }
    setIsCommandMode(false);
    setIsAIMode(false);
  }, [commandInput, executeCommand]);

  const handleSearch = useCallback(() => {
    if (searchAddon.current && searchQuery.trim()) {
      searchAddon.current.findNext(searchQuery);
    }
  }, [searchQuery]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* Terminal Container */}
      <div className="h-full w-full relative">
        {/* Glassmorphic background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-lg" />
        
        {/* Terminal */}
        <div 
          ref={terminalRef} 
          className="relative h-full w-full p-4 overflow-hidden rounded-lg"
          style={{ background: 'transparent' }}
        />

        {/* Terminal Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 rounded-lg transition-all duration-200"
            title="Search (Ctrl+F)"
          >
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => setIsCommandMode(true)}
            className="p-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/50 rounded-lg transition-all duration-200"
            title="Command Palette (Ctrl+Space)"
          >
            <CommandLineIcon className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() => { setIsAIMode(true); setIsCommandMode(true); }}
            className="p-2 bg-purple-600/50 hover:bg-purple-500/50 border border-purple-500/50 rounded-lg transition-all duration-200"
            title="AI Assistant (Ctrl+K)"
          >
            <SparklesIcon className="w-4 h-4 text-purple-300" />
          </button>
        </div>
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {isCommandMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setIsCommandMode(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 w-full max-w-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                {isAIMode ? (
                  <SparklesIcon className="w-6 h-6 text-purple-400" />
                ) : (
                  <CommandLineIcon className="w-6 h-6 text-green-400" />
                )}
                <h3 className="text-lg font-semibold text-white">
                  {isAIMode ? 'AI Assistant' : 'Command Palette'}
                </h3>
              </div>
              
              <form onSubmit={handleCommandSubmit}>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  placeholder={isAIMode ? "Ask AI anything..." : "Enter command..."}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-400">
                    {isAIMode ? 'AI mode active' : 'Terminal command mode'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCommandMode(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                    >
                      Execute
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Panel */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 right-16 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg p-4 z-40"
          >
            <div className="flex items-center gap-3">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  } else if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  }
                }}
                placeholder="Search terminal..."
                className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSearch}
                className="px-3 py-1 bg-green-600/50 hover:bg-green-500/50 text-green-300 rounded text-sm transition-colors"
              >
                Find
              </button>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
