import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  isActive: boolean;
  history: CommandHistoryItem[];
  createdAt: number;
}

export interface CommandHistoryItem {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: number;
  executionTime: number;
  success: boolean;
}

export interface TerminalState {
  // Sessions
  sessions: TerminalSession[];
  activeSessionId: string | null;
  
  // Command execution
  isExecuting: boolean;
  currentCommand: string | null;
  
  // UI state
  isCommandPaletteOpen: boolean;
  isAIMode: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  
  // Settings
  fontSize: number;
  fontFamily: string;
  theme: 'dark' | 'light' | 'auto';
  
  // Actions
  createSession: (name?: string, cwd?: string) => string;
  removeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  updateSessionCwd: (sessionId: string, cwd: string) => void;
  
  addCommandToHistory: (sessionId: string, command: CommandHistoryItem) => void;
  clearHistory: (sessionId: string) => void;
  
  setExecuting: (isExecuting: boolean, command?: string) => void;
  
  toggleCommandPalette: (isOpen?: boolean) => void;
  toggleAIMode: (isAI?: boolean) => void;
  toggleSearch: (isOpen?: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  updateSettings: (settings: Partial<Pick<TerminalState, 'fontSize' | 'fontFamily' | 'theme'>>) => void;
  
  // Getters
  getActiveSession: () => TerminalSession | null;
  getSessionHistory: (sessionId: string) => CommandHistoryItem[];
}

export const useTerminalStore = create<TerminalState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sessions: [],
      activeSessionId: null,
      isExecuting: false,
      currentCommand: null,
      isCommandPaletteOpen: false,
      isAIMode: false,
      isSearchOpen: false,
      searchQuery: '',
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
      theme: 'dark',

      // Session management
      createSession: (name?: string, cwd?: string) => {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSession: TerminalSession = {
          id: sessionId,
          name: name || `Terminal ${get().sessions.length + 1}`,
          cwd: cwd || '~',
          isActive: false,
          history: [],
          createdAt: Date.now(),
        };

        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: state.activeSessionId || sessionId,
        }));

        // Update active status
        get().setActiveSession(sessionId);
        
        return sessionId;
      },

      removeSession: (sessionId: string) => {
        set((state) => {
          const newSessions = state.sessions.filter(s => s.id !== sessionId);
          const newActiveId = state.activeSessionId === sessionId 
            ? (newSessions.length > 0 ? newSessions[0].id : null)
            : state.activeSessionId;

          return {
            sessions: newSessions,
            activeSessionId: newActiveId,
          };
        });
      },

      setActiveSession: (sessionId: string) => {
        set((state) => ({
          sessions: state.sessions.map(session => ({
            ...session,
            isActive: session.id === sessionId,
          })),
          activeSessionId: sessionId,
        }));
      },

      updateSessionCwd: (sessionId: string, cwd: string) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId ? { ...session, cwd } : session
          ),
        }));
      },

      // Command history
      addCommandToHistory: (sessionId: string, command: CommandHistoryItem) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, history: [...session.history, command] }
              : session
          ),
        }));
      },

      clearHistory: (sessionId: string) => {
        set((state) => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId ? { ...session, history: [] } : session
          ),
        }));
      },

      // Command execution
      setExecuting: (isExecuting: boolean, command?: string) => {
        set({ isExecuting, currentCommand: command || null });
      },

      // UI state
      toggleCommandPalette: (isOpen?: boolean) => {
        set((state) => ({
          isCommandPaletteOpen: isOpen !== undefined ? isOpen : !state.isCommandPaletteOpen,
        }));
      },

      toggleAIMode: (isAI?: boolean) => {
        set((state) => ({
          isAIMode: isAI !== undefined ? isAI : !state.isAIMode,
        }));
      },

      toggleSearch: (isOpen?: boolean) => {
        set((state) => ({
          isSearchOpen: isOpen !== undefined ? isOpen : !state.isSearchOpen,
        }));
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      // Settings
      updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }));
      },

      // Getters
      getActiveSession: () => {
        const state = get();
        return state.sessions.find(s => s.id === state.activeSessionId) || null;
      },

      getSessionHistory: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        return session?.history || [];
      },
    }),
    {
      name: 'jarvis-terminal-store',
    }
  )
);

// Utility hooks
export const useActiveSession = () => {
  const activeSessionId = useTerminalStore(state => state.activeSessionId);
  const sessions = useTerminalStore(state => state.sessions);
  return sessions.find(s => s.id === activeSessionId) || null;
};

export const useSessionHistory = (sessionId?: string) => {
  const activeSessionId = useTerminalStore(state => state.activeSessionId);
  const getSessionHistory = useTerminalStore(state => state.getSessionHistory);
  const targetSessionId = sessionId || activeSessionId;
  return targetSessionId ? getSessionHistory(targetSessionId) : [];
};

export const useTerminalSettings = () => {
  return useTerminalStore(state => ({
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    theme: state.theme,
    updateSettings: state.updateSettings,
  }));
};