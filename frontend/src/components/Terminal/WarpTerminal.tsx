/**
 * Warp-style Terminal Component
 * Advanced terminal interface with AI integration and glassmorphic design
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { WebglAddon } from 'xterm-addon-webgl';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../stores/appStore';
import { terminalService } from '../../services/terminalService';
import { aiService } from '../../services/aiService';
import offlineFirstService from '../../services/offlineFirstService';
import { enhancedAIService } from '../../services/enhancedAIService';
import { workspaceService } from '../../services/workspaceService';
import { cn } from '../../utils/cn';
import ModelSwitcher from './ModelSwitcher';
import APIKeyManager from './APIKeyManager';
import type { ModelInfo } from './ModelSwitcher';
import type { ProviderConfig } from './APIKeyManager';
import './WarpTerminal.css';

interface WarpTerminalProps {
  className?: string;
  onCommand?: (command: string) => void;
  onAIResponse?: (response: string) => void;
}

export const WarpTerminal: React.FC<WarpTerminalProps> = ({ 
  className, 
  onCommand,
  onAIResponse 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const webLinksAddon = useRef<WebLinksAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  const webglAddon = useRef<WebglAddon | null>(null);
  
  const { isDark } = useTheme();
  const { currentModel, isOffline } = useAppStore();
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCommand, setCurrentCommand] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [showAPIKeyManager, setShowAPIKeyManager] = useState(false);

  // Command suggestions database
  const commonCommands = [
    'ls', 'cd', 'pwd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'cat', 'grep',
    'find', 'chmod', 'chown', 'ps', 'kill', 'top', 'df', 'du', 'free',
    'git status', 'git add', 'git commit', 'git push', 'git pull', 'git branch',
    'npm install', 'npm run', 'npm start', 'npm test', 'npm build',
    'yarn install', 'yarn start', 'yarn build', 'yarn test',
    'python', 'node', 'java', 'javac', 'gcc', 'make',
    'docker run', 'docker build', 'docker ps', 'docker images',
    'kubectl get', 'kubectl apply', 'kubectl describe',
    '/help', '@ai', '/clear', '/history', '/explain'
  ];

  // Get command suggestions based on input
  const getCommandSuggestions = useCallback((input: string) => {
    if (!input.trim()) return [];
    
    const filtered = commonCommands.filter(cmd => 
      cmd.toLowerCase().startsWith(input.toLowerCase())
    );
    
    // Add workspace-specific suggestions
    const workspaceSuggestions = workspaceService.getProjectSuggestions().filter(cmd => 
      cmd.toLowerCase().startsWith(input.toLowerCase()) && 
      !filtered.includes(cmd)
    );
    
    // Add history suggestions
    const historyFiltered = commandHistory.filter(cmd => 
      cmd.toLowerCase().startsWith(input.toLowerCase()) && 
      !filtered.includes(cmd) &&
      !workspaceSuggestions.includes(cmd)
    );
    
    return [...filtered, ...workspaceSuggestions, ...historyFiltered].slice(0, 5);
  }, [commandHistory]);

  // Command explanations database
  const commandExplanations: Record<string, string> = {
    'ls': 'List directory contents',
    'cd': 'Change directory',
    'pwd': 'Print working directory',
    'mkdir': 'Create directories',
    'rmdir': 'Remove empty directories',
    'rm': 'Remove files and directories',
    'cp': 'Copy files or directories',
    'mv': 'Move/rename files or directories',
    'cat': 'Display file contents',
    'grep': 'Search text patterns in files',
    'find': 'Search for files and directories',
    'chmod': 'Change file permissions',
    'chown': 'Change file ownership',
    'ps': 'Display running processes',
    'kill': 'Terminate processes',
    'top': 'Display system processes',
    'df': 'Display filesystem disk space usage',
    'du': 'Display directory space usage',
    'free': 'Display memory usage',
    'git status': 'Show the working tree status',
    'git add': 'Add file contents to the index',
    'git commit': 'Record changes to the repository',
    'git push': 'Update remote refs along with associated objects',
    'git pull': 'Fetch from and integrate with another repository',
    'git branch': 'List, create, or delete branches',
    'npm install': 'Install package dependencies',
    'npm run': 'Run a script defined in package.json',
    'npm start': 'Start the application',
    'npm test': 'Run tests',
    'npm build': 'Build the application for production',
    'yarn install': 'Install dependencies using Yarn',
    'yarn start': 'Start the application with Yarn',
    'yarn build': 'Build the application with Yarn',
    'yarn test': 'Run tests with Yarn',
    'python': 'Run Python interpreter or script',
    'node': 'Run Node.js interpreter or script',
    'java': 'Run Java application',
    'javac': 'Compile Java source files',
    'gcc': 'GNU Compiler Collection',
    'make': 'Build automation tool',
    'docker run': 'Run a command in a new container',
    'docker build': 'Build an image from a Dockerfile',
    'docker ps': 'List containers',
    'docker images': 'List images',
    'kubectl get': 'Display one or many resources',
    'kubectl apply': 'Apply a configuration to a resource',
    'kubectl describe': 'Show details of a specific resource',
    '/help': 'Show terminal help and commands',
    '@ai': 'Toggle AI assistance mode',
    '/clear': 'Clear the terminal screen',
    '/history': 'Show command history'
  };

  // Get command explanation
  const getCommandExplanation = useCallback((command: string): string => {
    const baseCommand = command.split(' ')[0];
    return commandExplanations[command] || commandExplanations[baseCommand] || 'Command not recognized';
  }, []);

  // Load available models
  const loadModels = useCallback(async () => {
    try {
      const response = await fetch('/api/models');
      if (response.ok) {
        const models = await response.json();
        setAvailableModels(models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }, []);

  // Load providers
  const loadProviders = useCallback(async () => {
    try {
      const response = await fetch('/api/providers');
      if (response.ok) {
        const providers = await response.json();
        setProviders(providers);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, []);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    // Update the current model in the store
    // This would typically update the global state
    console.log('Model changed to:', modelId);
  }, []);

  // Handle API key update
  const handleKeyUpdate = useCallback(async (providerId: string, apiKey: string) => {
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, apiKey })
      });
      
      if (response.ok) {
        await loadProviders();
      }
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  }, [loadProviders]);

  // Handle API key removal
  const handleKeyRemove = useCallback(async (providerId: string) => {
    try {
      const response = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId })
      });
      
      if (response.ok) {
        await loadProviders();
      }
    } catch (error) {
      console.error('Failed to remove API key:', error);
    }
  }, [loadProviders]);

  // Test connection
  const handleTestConnection = useCallback(async (providerId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to test connection:', error);
      return false;
    }
  }, []);

  // Get terminal theme based on current theme - Warp-style
  const getTerminalTheme = useCallback(() => ({
    background: isDark ? 'rgba(10, 10, 10, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    foreground: isDark ? '#f0f0f0' : '#1a1a1a',
    cursor: isDark ? '#00ff88' : '#0066cc',
    cursorAccent: isDark ? '#0a0a0a' : '#ffffff',
    selection: isDark ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 102, 204, 0.2)',
    black: '#2e3436',
    red: '#ff6b6b',
    green: '#51cf66',
    yellow: '#ffd43b',
    blue: '#74c0fc',
    magenta: '#da77f2',
    cyan: '#22d3ee',
    white: '#f8f9fa',
    brightBlack: '#6c757d',
    brightRed: '#ff8787',
    brightGreen: '#69db7c',
    brightYellow: '#ffec99',
    brightBlue: '#91d5ff',
    brightMagenta: '#e599f7',
    brightCyan: '#67e8f9',
    brightWhite: '#ffffff',
  }), [isDark]);

  // Write prompt to terminal - Warp-style
  const writePrompt = useCallback((terminal: Terminal) => {
    const modelIndicator = isOffline ? '🔄' : '🌐';
    const aiIndicator = aiMode ? '\x1b[1;35m[AI]\x1b[0m ' : '';
    const timestamp = new Date().toLocaleTimeString();
    const statusColor = isOnline ? '\x1b[32m' : '\x1b[31m';
    
    // Warp-style prompt with timestamp and status
    terminal.write(`\r\n\x1b[90m${timestamp}\x1b[0m ${modelIndicator} ${aiIndicator}\x1b[1;36mjarvis\x1b[0m:\x1b[1;34m~\x1b[0m${statusColor}$\x1b[0m `);
  }, [isOffline, aiMode, isOnline]);

  // Handle AI command with enhanced context
  const handleAICommand = useCallback(async (command: string, terminal: Terminal) => {
    terminal.writeln(`\x1b[1;35m🤖 Thinking...\x1b[0m`);
    setIsTyping(true);
    
    try {
      let response;
      
      if (isOffline) {
        response = await enhancedAIService.sendOfflineMessage(command, {
          includeCodeContext: true,
          includeGitContext: true
        });
        terminal.write('\x1b[1;36mAI (Offline): \x1b[0m');
      } else {
        response = await enhancedAIService.sendMessage(command, {
          model: currentModel,
          stream: true,
          includeCodeContext: true,
          includeGitContext: true
        });
        terminal.write('\x1b[1;36mAI: \x1b[0m');
      }

      if (response.stream && !isOffline) {
        for await (const chunk of response.stream) {
          terminal.write(chunk);
        }
      } else {
        terminal.write(response.content);
      }
      
      // Show code blocks if any
      if (response.codeBlocks && response.codeBlocks.length > 0) {
        terminal.writeln('\x1b[1;33m📝 Code blocks detected:\x1b[0m');
        response.codeBlocks.forEach((block, index) => {
          terminal.writeln(`\x1b[90m${index + 1}. ${block.language} (${block.file || 'inline'})\x1b[0m`);
        });
      }
      
      // Show suggestions if any
      if (response.suggestions && response.suggestions.length > 0) {
        terminal.writeln('\x1b[1;32m💡 Suggestions:\x1b[0m');
        response.suggestions.forEach(suggestion => {
          terminal.writeln(`  • ${suggestion}`);
        });
      }
      
      terminal.writeln('');
      
      if (onAIResponse) {
        onAIResponse(response.content);
      }
    } catch (error) {
      terminal.writeln(`\x1b[1;31mAI Error: ${error}\x1b[0m`);
    } finally {
      setIsTyping(false);
    }
  }, [isOffline, currentModel, onAIResponse]);

  // Show help in terminal
  const showTerminalHelp = useCallback((terminal: Terminal) => {
    terminal.writeln('');
    terminal.writeln('\x1b[1;36m🚀 Jarvis Terminal Commands\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[1;33mAI Commands:\x1b[0m');
    terminal.writeln('  \x1b[1;35m@ai\x1b[0m         - Toggle AI mode');
    terminal.writeln('  \x1b[1;35m/help\x1b[0m       - Show this help');
    terminal.writeln('  \x1b[1;35m/clear\x1b[0m      - Clear terminal');
    terminal.writeln('  \x1b[1;35m/history\x1b[0m    - Show command history');
    terminal.writeln('  \x1b[1;35m/explain\x1b[0m    - Explain a command (e.g., /explain ls)');
    terminal.writeln('');
    terminal.writeln('\x1b[1;33mTerminal Features:\x1b[0m');
    terminal.writeln('  \x1b[1;32mCtrl+L\x1b[0m      - Clear terminal');
    terminal.writeln('  \x1b[1;32mCtrl+F\x1b[0m      - Search in terminal');
    terminal.writeln('  \x1b[1;32m↑/↓\x1b[0m         - Command history');
    terminal.writeln('  \x1b[1;32mTab\x1b[0m         - Autocomplete');
    terminal.writeln('');
    terminal.writeln('\x1b[1;33mStatus Indicators:\x1b[0m');
    terminal.writeln('  \x1b[1;32m🌐\x1b[0m          - Online mode (API)');
    terminal.writeln('  \x1b[1;34m🔄\x1b[0m          - Offline mode (Local LLM)');
    terminal.writeln('  \x1b[1;35m[AI]\x1b[0m        - AI mode active');
    terminal.writeln('');
  }, []);

  // Execute command
  const executeCommand = useCallback(async (command: string, terminal: Terminal) => {
    if (command.trim() === '') {
      writePrompt(terminal);
      return;
    }

    // Add to history
    setCommandHistory(prev => [...prev.slice(-99), command]);
    setHistoryIndex(-1);

    // Handle special commands
    if (command === '@ai') {
      setAiMode(!aiMode);
      terminal.writeln(aiMode ? 'AI mode disabled' : 'AI mode enabled - ask me anything!');
      writePrompt(terminal);
      return;
    }

    if (command === 'help' || command === '/help') {
      showTerminalHelp(terminal);
      writePrompt(terminal);
      return;
    }

    if (command === 'clear' || command === '/clear') {
      terminal.clear();
      terminal.writeln('🚀 Welcome to Jarvis Terminal');
      terminal.writeln('Type \x1b[1;36m/help\x1b[0m for commands or \x1b[1;35m@ai\x1b[0m to start AI mode');
      writePrompt(terminal);
      return;
    }

    if (command === 'history' || command === '/history') {
      terminal.writeln('\x1b[1;33mCommand History:\x1b[0m');
      commandHistory.slice(-10).forEach((cmd, index) => {
        terminal.writeln(`  ${index + 1}. ${cmd}`);
      });
      writePrompt(terminal);
      return;
    }

    if (command.startsWith('explain ') || command.startsWith('/explain ')) {
      const targetCommand = command.replace(/^(\/)?explain /, '');
      const explanation = getCommandExplanation(targetCommand);
      terminal.writeln(`\x1b[1;36m💡 Command Explanation:\x1b[0m`);
      terminal.writeln(`\x1b[1;33m${targetCommand}\x1b[0m - ${explanation}`);
      
      // If AI mode is on, provide more detailed explanation
      if (aiMode) {
        terminal.writeln(`\x1b[1;35m🤖 Getting detailed explanation...\x1b[0m`);
        await handleAICommand(`Explain the command "${targetCommand}" in detail, including usage examples and common options.`, terminal);
      }
      
      writePrompt(terminal);
      return;
    }

    // Handle AI commands
    if (aiMode && !command.startsWith('/')) {
      await handleAICommand(command, terminal);
      writePrompt(terminal);
      return;
    }

    // Analyze command for safety
    const analysis = enhancedAIService.analyzeCommand(command);
    
    if (analysis.type === 'dangerous') {
      terminal.writeln(`\x1b[1;31m⚠️  DANGEROUS COMMAND DETECTED!\x1b[0m`);
      terminal.writeln(`\x1b[1;33m${analysis.explanation}\x1b[0m`);
      terminal.writeln('\x1b[1;32mSuggestions:\x1b[0m');
      analysis.suggestions.forEach(suggestion => {
        terminal.writeln(`  • ${suggestion}`);
      });
      terminal.writeln('\x1b[1;36mType the command again to confirm execution.\x1b[0m');
      writePrompt(terminal);
      return;
    } else if (analysis.type === 'warning') {
      terminal.writeln(`\x1b[1;33m⚠️  ${analysis.explanation}\x1b[0m`);
      terminal.writeln('\x1b[1;32mSuggestions:\x1b[0m');
      analysis.suggestions.forEach(suggestion => {
        terminal.writeln(`  • ${suggestion}`);
      });
    }

    // Add command to workspace history
    workspaceService.addRecentCommand(command);
    
    // Execute shell command
    try {
      const result = await terminalService.executeCommand(command);
      
      if (result.success) {
        if (result.output) {
          terminal.writeln(result.output);
        }
      } else {
        terminal.writeln(`\x1b[1;31mError: ${result.error}\x1b[0m`);
      }
    } catch (error) {
      terminal.writeln(`\x1b[1;31mCommand execution failed: ${error}\x1b[0m`);
    }

    writePrompt(terminal);
  }, [aiMode, commandHistory, writePrompt, handleAICommand, showTerminalHelp, getCommandExplanation]);

  // Set up command handling
  const setupCommandHandling = useCallback((terminal: Terminal) => {
    let currentLine = '';
    let cursorPosition = 0;
    let currentSuggestions: string[] = [];

    // Update suggestions based on current input
    const updateSuggestions = (input: string) => {
      currentSuggestions = getCommandSuggestions(input);
      setShowSuggestions(currentSuggestions.length > 0);
      setSuggestions(currentSuggestions);
      setSelectedSuggestion(0);
    };

    // Handle keyboard input
    terminal.onData((data) => {
      const code = data.charCodeAt(0);
      
      // Handle special keys
      if (code === 13) { // Enter
        if (showSuggestions && currentSuggestions.length > 0) {
          // Accept selected suggestion
          const suggestion = currentSuggestions[selectedSuggestion];
          const remainingText = suggestion.slice(currentLine.length);
          terminal.write(remainingText);
          currentLine = suggestion;
          cursorPosition = suggestion.length;
          setShowSuggestions(false);
          return;
        }
        
        terminal.writeln('');
        executeCommand(currentLine, terminal);
        currentLine = '';
        cursorPosition = 0;
        setShowSuggestions(false);
      } else if (code === 127) { // Backspace
        if (cursorPosition > 0) {
          currentLine = currentLine.slice(0, -1);
          cursorPosition--;
          terminal.write('\b \b');
          updateSuggestions(currentLine);
        }
      } else if (code === 27) { // Escape sequences
        const key = data.slice(1);
        if (!key) { // Pure escape key
          if (showSuggestions) {
            setShowSuggestions(false);
          }
        } else if (key === '[A') { // Up arrow
          if (showSuggestions && currentSuggestions.length > 0) {
            // Navigate suggestions
            const newIndex = selectedSuggestion > 0 ? selectedSuggestion - 1 : currentSuggestions.length - 1;
            setSelectedSuggestion(newIndex);
          } else if (commandHistory.length > 0) {
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            if (newIndex !== historyIndex) {
              setHistoryIndex(newIndex);
              const historyCommand = commandHistory[commandHistory.length - 1 - newIndex];
              // Clear current line and rewrite with history command
              terminal.write('\r');
              writePrompt(terminal);
              terminal.write(historyCommand);
              currentLine = historyCommand;
              cursorPosition = historyCommand.length;
              updateSuggestions(currentLine);
            }
          }
        } else if (key === '[B') { // Down arrow
          if (showSuggestions && currentSuggestions.length > 0) {
            // Navigate suggestions
            const newIndex = selectedSuggestion < currentSuggestions.length - 1 ? selectedSuggestion + 1 : 0;
            setSelectedSuggestion(newIndex);
          } else if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const historyCommand = commandHistory[commandHistory.length - 1 - newIndex];
            terminal.write('\r');
            writePrompt(terminal);
            terminal.write(historyCommand);
            currentLine = historyCommand;
            cursorPosition = historyCommand.length;
            updateSuggestions(currentLine);
          } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            terminal.write('\r');
            writePrompt(terminal);
            currentLine = '';
            cursorPosition = 0;
            setShowSuggestions(false);
          }
        } else if (key === '[C') { // Right arrow
          if (showSuggestions && currentSuggestions.length > 0) {
            // Accept current suggestion
            const suggestion = currentSuggestions[selectedSuggestion];
            const remainingText = suggestion.slice(currentLine.length);
            terminal.write(remainingText);
            currentLine = suggestion;
            cursorPosition = suggestion.length;
            setShowSuggestions(false);
          }
        }
      } else if (code === 9) { // Tab
        if (showSuggestions && currentSuggestions.length > 0) {
          // Accept current suggestion
          const suggestion = currentSuggestions[selectedSuggestion];
          const remainingText = suggestion.slice(currentLine.length);
          terminal.write(remainingText);
          currentLine = suggestion;
          cursorPosition = suggestion.length;
          setShowSuggestions(false);
        } else {
          // Trigger suggestions or add spaces
          if (currentLine.trim()) {
            updateSuggestions(currentLine);
          } else {
            terminal.write('    ');
            currentLine += '    ';
            cursorPosition += 4;
          }
        }
      } else if (code === 32) { // Space
        currentLine += data;
        cursorPosition++;
        terminal.write(data);
        setShowSuggestions(false); // Hide suggestions on space
      } else if (code >= 32 && code <= 126) { // Printable characters
        currentLine += data;
        cursorPosition++;
        terminal.write(data);
        updateSuggestions(currentLine);
      }

      if (onCommand) {
        onCommand(currentLine);
      }
    });

    // Add keyboard shortcuts
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.ctrlKey && event.key === 'l') {
        terminal.clear();
        terminal.writeln('🚀 Welcome to Jarvis Terminal');
        terminal.writeln('Type \x1b[1;36m/help\x1b[0m for commands or \x1b[1;35m@ai\x1b[0m to start AI mode');
        writePrompt(terminal);
        return false;
      }
      if (event.ctrlKey && event.key === 'r') {
        setAiMode(prev => !prev);
        return false;
      }
      return true;
    });
  }, [executeCommand, commandHistory, historyIndex, writePrompt, onCommand, getCommandSuggestions, showSuggestions, selectedSuggestion]);

  // Initialize terminal
  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current || terminalInstance.current) return;

    // Ensure container has proper dimensions
    const container = terminalRef.current;
    if (!container.offsetWidth || !container.offsetHeight) {
      // Set minimum dimensions if container is not properly sized
      container.style.width = container.style.width || '100%';
      container.style.height = container.style.height || '400px';
      container.style.minHeight = '300px';
    }

    try {
        // Create addons
        // fitAddon.current = new FitAddon(); // Temporarily disabled
        webLinksAddon.current = new WebLinksAddon();
        searchAddon.current = new SearchAddon();

        // Create terminal instance with Warp-like settings
        const terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Fira Code, Monaco, Menlo, monospace',
        fontWeight: '400',
        fontWeightBold: '600',
        theme: getTerminalTheme(),
        allowTransparency: true,
        cols: 120,
        rows: 30,
        scrollback: 10000,
        tabStopWidth: 4,
        allowProposedApi: true,
        bellStyle: 'none',
        disableStdin: false,
        macOptionIsMeta: true,
        rightClickSelectsWord: true,
        wordSeparator: ' ()[]{}\'"`<>',
        fastScrollModifier: 'shift',
        fastScrollSensitivity: 5,
        scrollSensitivity: 1,
        smoothScrollDuration: 0,
        linkHandler: {
          activate: (event, uri) => {
            window.open(uri, '_blank');
          }
        }
      });

      // Load addons
      // terminal.loadAddon(fitAddon.current); // Temporarily disabled
      terminal.loadAddon(webLinksAddon.current);
      terminal.loadAddon(searchAddon.current);

      // Skip WebGL addon for now to avoid dimension issues
      // try {
      //   webglAddon.current = new WebglAddon();
      //   terminal.loadAddon(webglAddon.current);
      // } catch (e) {
      //   console.warn('WebGL addon not supported, falling back to canvas');
      // }

      // Open terminal in container
      terminal.open(terminalRef.current);
      
      // Store instance first
      terminalInstance.current = terminal;

      // Set up command handling
      setupCommandHandling(terminal);

      // Use setTimeout to ensure DOM is ready and fit properly
      setTimeout(() => {
        try {
          // Fit terminal to container after DOM is ready
          // if (fitAddon.current && terminalRef.current && terminalRef.current.offsetWidth > 0) {
          //   fitAddon.current.fit();
          // }

          setIsTerminalReady(true);

          // Welcome message
          terminal.writeln('🚀 Welcome to Jarvis Terminal');
          terminal.writeln('Type \x1b[1;36m/help\x1b[0m for commands or \x1b[1;35m@ai\x1b[0m to start AI mode');
          terminal.writeln('');
          writePrompt(terminal);
        } catch (error) {
          console.error('Error during terminal setup:', error);
          // Fallback: still show prompt even if fit fails
          terminal.writeln('🚀 Welcome to Jarvis Terminal');
          terminal.writeln('Type \x1b[1;36m/help\x1b[0m for commands or \x1b[1;35m@ai\x1b[0m to start AI mode');
          terminal.writeln('');
          writePrompt(terminal);
          setIsTerminalReady(true);
         }
       }, 300);

      return terminal;
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      setIsTerminalReady(false);
      return null;
    }
  }, [getTerminalTheme, setupCommandHandling, writePrompt]);

  // Handle terminal resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddon.current && terminalInstance.current) {
        fitAddon.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize terminal on mount
  useEffect(() => {
    const terminal = initializeTerminal();
    
    // Load models and providers
    loadModels();
    loadProviders();
    
    // Initialize workspace
    workspaceService.initializeWorkspace('/workspace').catch(console.error);
    
    // Set up workspace context for AI
    const workspaceContext = workspaceService.getWorkspaceContext();
    enhancedAIService.setContext({
      workspace: workspaceContext.currentProject?.path,
      currentFile: workspaceContext.openFiles[0]?.path,
      projectType: workspaceContext.currentProject?.type,
      dependencies: workspaceContext.currentProject?.dependencies,
      gitStatus: workspaceContext.gitStatus
    });
    
    // Set up offline-first status monitoring
    const updateConnectionStatus = () => {
      const syncStatus = offlineFirstService.getSyncStatus();
      setIsOnline(syncStatus.isOnline);
      setHasPendingSync(syncStatus.pendingSync);
    };

    updateConnectionStatus();
    const statusInterval = setInterval(updateConnectionStatus, 5000);
    
    return () => {
      try {
        // Clear the interval first
        clearInterval(statusInterval);
        
        // Dispose terminal safely
        if (terminal) {
          // Remove event listeners to prevent memory leaks
          terminal.onData(() => {});
          terminal.onKey(() => {});
          terminal.dispose();
        }
        
        // Dispose addons safely with error handling
        try {
          if (fitAddon.current) {
            fitAddon.current.dispose();
          }
        } catch (e) {
          console.warn('Error disposing fit addon:', e);
        }
        
        try {
          if (webLinksAddon.current) {
            webLinksAddon.current.dispose();
          }
        } catch (e) {
          console.warn('Error disposing weblinks addon:', e);
        }
        
        try {
          if (searchAddon.current) {
            searchAddon.current.dispose();
          }
        } catch (e) {
          console.warn('Error disposing search addon:', e);
        }
        
        try {
          if (webglAddon.current) {
            webglAddon.current.dispose();
          }
        } catch (e) {
          console.warn('Error disposing webgl addon:', e);
        }
        
        // Clear references
        terminalInstance.current = null;
        fitAddon.current = null;
        webLinksAddon.current = null;
        searchAddon.current = null;
        webglAddon.current = null;
        
        setIsTerminalReady(false);
      } catch (error) {
        console.warn('Error during terminal cleanup:', error);
      }
    };
  }, [initializeTerminal]);

  // Handle theme changes
  useEffect(() => {
    if (terminalInstance.current) {
      terminalInstance.current.options.theme = getTerminalTheme();
    }
  }, [getTerminalTheme]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (terminalInstance.current && fitAddon.current && isTerminalReady && terminalRef.current && terminalRef.current.offsetWidth > 0) {
        try {
          fitAddon.current.fit();
        } catch (error) {
          console.warn('Error fitting terminal on resize:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Also handle container resize with ResizeObserver if available
    let resizeObserver: ResizeObserver | null = null;
    if (terminalRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isTerminalReady]);

  return (
    <div className={cn("warp-terminal-container", className)}>
      <div className="warp-terminal-header">
        <div className="warp-terminal-title">
          <span className="warp-terminal-icon">⚡</span>
          Jarvis Terminal
          <span className={cn('connection-status', isOnline ? 'online' : 'offline')}>
            {isOnline ? '🟢' : '🔴'}
          </span>
          {hasPendingSync && <span className="sync-indicator">🔄</span>}
        </div>
        <div className="warp-terminal-controls">
          <ModelSwitcher
            currentModel={currentModel}
            models={availableModels}
            onModelChange={handleModelChange}
            isOffline={isOffline}
            className="mr-2"
          />
          <APIKeyManager
            providers={providers}
            onKeyUpdate={handleKeyUpdate}
            onKeyRemove={handleKeyRemove}
            onTestConnection={handleTestConnection}
            className="mr-2"
          />
          <button
            className={cn('warp-terminal-control', aiMode && 'active')}
            onClick={() => setAiMode(!aiMode)}
            title="Toggle AI Mode"
          >
            🤖 AI
          </button>
          <button
            className="warp-terminal-control"
            onClick={() => setShowHelp(!showHelp)}
            title="Toggle Help"
          >
            ?
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            className="warp-terminal-help"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3>Terminal Commands</h3>
            <div className="help-grid">
              <div className="help-section">
                <h4>AI Commands</h4>
                <ul>
                  <li><code>@ai</code> - Toggle AI mode</li>
                  <li><code>/help</code> - Show help</li>
                  <li><code>/clear</code> - Clear terminal</li>
                  <li><code>/history</code> - Command history</li>
                  <li><code>/explain</code> - Explain commands</li>
                </ul>
              </div>
              <div className="help-section">
                <h4>Shortcuts</h4>
                <ul>
                  <li><kbd>Ctrl+L</kbd> - Clear terminal</li>
                  <li><kbd>Ctrl+R</kbd> - Toggle AI mode</li>
                  <li><kbd>↑/↓</kbd> - Command history</li>
                  <li><kbd>Tab</kbd> - Autocomplete</li>
                </ul>
              </div>
            </div>
            <div className="offline-info">
              <strong>Offline Mode:</strong> Basic AI responses and commands available offline.
              Full functionality restored when online.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="warp-terminal-content">
        <div ref={terminalRef} className="warp-terminal" />
        
        {/* Command Suggestions */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div 
              className="command-suggestions"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="suggestions-header">
                <span className="suggestions-icon">💡</span>
                Command Suggestions
              </div>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion}
                    className={cn(
                      'suggestion-item',
                      index === selectedSuggestion && 'selected'
                    )}
                  >
                    <span className="suggestion-command">{suggestion}</span>
                    {index === selectedSuggestion && (
                      <span className="suggestion-hint">
                        Press <kbd>Tab</kbd> or <kbd>→</kbd> to accept
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="suggestions-footer">
                Use <kbd>↑</kbd>/<kbd>↓</kbd> to navigate • <kbd>Esc</kbd> to dismiss
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="warp-terminal-footer">
        <div className="warp-terminal-status">
          {isTyping && (
            <motion.span 
              className="typing-indicator"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              AI is thinking...
            </motion.span>
          )}
          {!isOnline && <span className="offline-indicator">Offline Mode</span>}
          {hasPendingSync && <span className="sync-indicator">Sync pending...</span>}
        </div>
      </div>
    </div>
  );
};

export default WarpTerminal;