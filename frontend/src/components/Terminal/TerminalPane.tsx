import React, { useEffect, useRef } from 'react';
import { XTerm } from 'xterm-for-react';
import { FitAddon } from 'xterm-addon-fit';
import { useTheme } from '../../contexts/ThemeContext';

export const TerminalPane: React.FC = () => {
  const xtermRef = useRef<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fitAddon = new FitAddon();
    if (xtermRef.current && xtermRef.current.terminal) {
      xtermRef.current.terminal.loadAddon(fitAddon);
      fitAddon.fit();
    }

    const ws = new WebSocket('ws://127.0.0.1:8000/terminal/ws');

    ws.onopen = () => {
      if (xtermRef.current && xtermRef.current.terminal) {
        xtermRef.current.terminal.writeln('Terminal connected.');
      }
    };

    ws.onmessage = (event) => {
      if (xtermRef.current && xtermRef.current.terminal) {
        xtermRef.current.terminal.write(event.data);
      }
    };

    ws.onclose = () => {
      if (xtermRef.current && xtermRef.current.terminal) {
        xtermRef.current.terminal.writeln('\r\nTerminal disconnected.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      if (xtermRef.current && xtermRef.current.terminal) {
        xtermRef.current.terminal.writeln('\r\nAn error occurred with the terminal connection.');
      }
    };

    if (xtermRef.current && xtermRef.current.terminal) {
        xtermRef.current.terminal.onData((data: string) => {
            ws.send(data);
        });
    }

    const handleResize = () => {
        fitAddon.fit();
    }

    window.addEventListener('resize', handleResize);

    return () => {
      ws.close();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="h-full w-full p-2 bg-black">
        <XTerm
            ref={xtermRef}
            options={{
                cursorBlink: true,
                theme: theme === 'dark' ? {
                    background: '#000000',
                    foreground: '#ffffff'
                } : {
                    background: '#ffffff',
                    foreground: '#000000'
                }
            }}
        />
    </div>
  );
};
