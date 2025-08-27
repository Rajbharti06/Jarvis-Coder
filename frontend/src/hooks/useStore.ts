import { create } from 'zustand';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: number;
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

  addChatMessage: (message: ChatMessage) => void;
  addOpenFile: (file: File) => void;
  removeOpenFile: (fileId: string) => void;
  setActiveFile: (fileId: string | null) => void;
  updateFileContent: (fileId: string, newContent: string) => void;
  setSelectedModel: (model: string) => void;
  setApiKey: (provider: string, key: string) => void;
}

export const useStore = create<AppState>((set) => ({
  chatMessages: [],
  openFiles: [],
  activeFileId: null,
  selectedModel: 'gemini-pro', // Default model
  apiKeys: {},

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
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
}));
