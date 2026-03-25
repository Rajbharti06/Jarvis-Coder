import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import axios from 'axios';
import { useStore } from '../../hooks/useStore';
import { Terminal as TerminalIcon, Sparkles } from 'lucide-react';

export const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [lastError, setLastError] = useState('');
  const { activeFileId, addChatMessage } = useStore();

  const handleAnalyzeError = async () => {
    if (!lastError) return;
    try {
      const response = await axios.post('http://localhost:8000/api/execute/analyze-error', {
        error_message: lastError,
        context: activeFileId
      });
      
      const suggestion = response.data.suggestion;
      // Send to chat
      addChatMessage({
        id: Date.now().toString(),
        sender: 'ai',
        content: `### Terminal Error Analysis\nI noticed an error in your terminal:\n\n\`\`\`\n${lastError}\n\`\`\`\n\n**Suggestion:**\n${JSON.stringify(suggestion)}`,
        timestamp: Date.now()
      });
    } catch (e: any) {
      console.error('Error analyzing terminal error:', e.message || e);
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      allowProposedApi: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#007acc',
        selectionBackground: '#333333',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
      },
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      allowTransparency: true,
      rows: 15,
    });

    // Addons
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const unicode11Addon = new Unicode11Addon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';

    term.open(terminalRef.current);
    
    // GPU Acceleration (Warp-like)
    try {
        const webglAddon = new WebglAddon();
        term.loadAddon(webglAddon);
    } catch (e) {
        console.warn('WebGL not supported, falling back to canvas');
    }

    fitAddon.fit();

    term.writeln('\x1b[1;36m┌──────────────────────────────────────────────────┐\x1b[0m');
    term.writeln('\x1b[1;36m│\x1b[0m \x1b[1;32mJARVIS AI TERMINAL v2.0 (Warp-inspired)\x1b[0m          \x1b[1;36m│\x1b[0m');
    term.writeln('\x1b[1;36m└──────────────────────────────────────────────────┘\x1b[0m');
    term.write('\r\n\x1b[1;34m➜\x1b[0m \x1b[1;32mworkspace\x1b[0m \x1b[1;33m$\x1b[0m ');

    let currentCommand = '';

    term.onData(async (data) => {
      const code = data.charCodeAt(0);
      
      if (code === 13) { // Enter
        term.write('\r\n');
        if (currentCommand.trim()) {
          try {
            setLastError('');
            const response = await axios.post('http://localhost:8000/api/execute/run', {
              command: currentCommand
            });
            
            if (response.data.stdout) {
              term.write(response.data.stdout.replace(/\n/g, '\r\n'));
            }
            if (response.data.stderr) {
              const stderr = response.data.stderr;
              term.write('\x1b[31m' + stderr.replace(/\n/g, '\r\n') + '\x1b[0m');
              setLastError(stderr);
            }
          } catch (error: any) {
            const errMsg = error.response?.data?.detail || error.message;
            term.write('\x1b[31mError: ' + errMsg + '\x1b[0m');
            setLastError(errMsg);
          }
        }
        currentCommand = '';
        setSuggestion('');
        term.write('\r\n\x1b[1;34m➜\x1b[0m \x1b[1;32mworkspace\x1b[0m \x1b[1;33m$\x1b[0m ');
      } else if (code === 127) { // Backspace
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          term.write('\b \b');
          fetchSuggestion(currentCommand);
        }
      } else if (code === 9) { // Tab (Autocomplete)
        if (suggestion) {
           term.write(suggestion);
           currentCommand += suggestion;
           setSuggestion('');
        }
      } else {
        currentCommand += data;
        term.write(data);
        fetchSuggestion(currentCommand);
      }
    });

    const fetchSuggestion = async (cmd: string) => {
       if (cmd.length < 2) {
          setSuggestion('');
          return;
       }
       try {
          const res = await axios.post('http://localhost:8000/api/autocomplete/', {
            prompt: `Suggest the rest of this shell command: ${cmd}`,
            max_tokens: 10
          });
          const sug = res.data.suggestion.replace(/^"|"$/g, '').trim();
          setSuggestion(sug);
       } catch (e) {}
    };

    xtermRef.current = term;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      term.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, [activeFileId]);

  return (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col border-t border-[#3e3e42]">
      <div className="flex items-center px-4 py-1 bg-[#252526] border-b border-[#3e3e42] text-[10px] text-gray-400 space-x-2">
         <TerminalIcon size={12} />
         <span className="font-bold uppercase tracking-wider">High-Performance Terminal</span>
         {suggestion && (
           <div className="ml-auto flex items-center text-blue-400 animate-pulse">
             <Sparkles size={10} className="mr-1" />
             <span>Suggestion: {suggestion} (Tab to apply)</span>
           </div>
         )}
         {lastError && (
           <button 
             onClick={handleAnalyzeError}
             className="ml-auto flex items-center bg-red-900/50 hover:bg-red-900 px-2 py-0.5 rounded border border-red-500/50 text-red-200 transition-colors"
           >
             <Sparkles size={10} className="mr-1" />
             <span>Analyze Error</span>
           </button>
         )}
      </div>
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
};
