import { create } from 'zustand';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export interface PendingEdit {
  path: string;
  search: string;
  replace: string;
  status: 'pending' | 'applied' | 'rejected';
}

export interface AgentState {
  isRunning: boolean;
  isStreaming: boolean;
  task: string;
  steps: { id: string, type: 'status' | 'log' | 'diff' | 'error', content: string }[];
  pendingEdits: PendingEdit[];
}

interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

interface AppState {
  chatMessages: ChatMessage[];
  openFiles: File[];
  activeFileId: string | null;
  selectedModel: string;
  apiKeys: Record<string, string>; // e.g., { openai: 'sk-...', claude: 'sk-...' }
  
  // Day 3 Agent & Diff State
  agentState: AgentState;
  showDiffViewer: boolean;
  activeDiff: { original: string, modified: string, path: string } | null;
  commandPaletteOpen: boolean;

  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  addOpenFile: (file: File) => void;
  removeOpenFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  updateFileContent: (fileId: string, newContent: string) => void;
  setSelectedModel: (model: string) => void;
  setApiKey: (provider: string, key: string) => void;
  
  // Agent Actions
  setAgentState: (state: Partial<AgentState>) => void;
  addAgentStep: (step: AgentState['steps'][0]) => void;
  addPendingEdit: (edit: PendingEdit) => void;
  updatePendingEdit: (path: string, status: PendingEdit['status']) => void;
  clearAgentState: () => void;
  
  // Diff Actions
  setShowDiffViewer: (show: boolean, diff?: { original: string, modified: string, path: string } | null) => void;
  
  // Command Actions
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  chatMessages: [],
  openFiles: [],
  activeFileId: null,
  selectedModel: 'gemini-pro', // Default model
  apiKeys: {},

  agentState: {
    isRunning: false,
    isStreaming: false,
    task: '',
    steps: [],
    pendingEdits: []
  },
  showDiffViewer: false,
  activeDiff: null,
  commandPaletteOpen: false,

  addChatMessage: (message) =>
    set((state) => {
      const updatedMessages = [...state.chatMessages, message];
      // Limit to 100 messages to prevent memory bloat on 8GB machines
      if (updatedMessages.length > 100) {
        return { chatMessages: updatedMessages.slice(updatedMessages.length - 100) };
      }
      return { chatMessages: updatedMessages };
    }),
  clearChat: () => set({ chatMessages: [] }),
  addOpenFile: (file) =>
    set((state) => {
      if (state.openFiles.find((f) => f.id === file.id)) {
        return { activeFileId: file.id }; // Already open, just activate
      }
      return { openFiles: [...state.openFiles, file], activeFileId: file.id };
    }),
  removeOpenFile: (fileId) =>
    set((state) => ({
      openFiles: state.openFiles.filter((file) => file.id !== fileId),
      activeFileId: state.activeFileId === fileId ? null : state.activeFileId,
    })),
  setActiveFile: (fileId) => set({ activeFileId: fileId }),
  updateFileContent: (fileId, newContent) =>
    set((state) => ({
      openFiles: state.openFiles.map((file) =>
        file.id === fileId ? { ...file, content: newContent } : file
      ),
    })),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setApiKey: (provider, key) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: key },
    })),
    
  setAgentState: (newState) => 
    set((state) => ({ agentState: { ...state.agentState, ...newState } })),
  
  addAgentStep: (step) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        steps: [...state.agentState.steps, step]
      }
    })),
    
  addPendingEdit: (edit) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        pendingEdits: [...state.agentState.pendingEdits, edit]
      }
    })),
    
  updatePendingEdit: (path, status) =>
    set((state) => ({
      agentState: {
        ...state.agentState,
        pendingEdits: state.agentState.pendingEdits.map((e) => 
          e.path === path ? { ...e, status } : e
        )
      }
    })),
    
  clearAgentState: () => 
    set({
      agentState: { isRunning: false, isStreaming: false, task: '', steps: [], pendingEdits: [] }
    }),
    
    
  setShowDiffViewer: (show, diff = null) =>
    set({ showDiffViewer: show, activeDiff: diff }),
    
  setCommandPaletteOpen: (open) =>
    set({ commandPaletteOpen: open }),
}));
