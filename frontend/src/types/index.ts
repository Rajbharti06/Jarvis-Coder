/**
 * Core type definitions for Jarvis Coder IDE
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  files: FileNode[];
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
  isModified?: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  type?: 'text' | 'code' | 'error' | 'success';
  metadata?: {
    model?: string;
    tokens?: number;
    executionTime?: number;
    codeBlocks?: CodeBlock[];
  };
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'together' | 'ollama';
  type: 'chat' | 'completion' | 'embedding';
  maxTokens: number;
  costPer1kTokens?: number;
  isLocal?: boolean;
  isAvailable?: boolean;
}

export interface APIKey {
  id: string;
  provider: string;
  name: string;
  key: string; // This should be encrypted in real implementation
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface EditorTab {
  id: string;
  fileId: string;
  filename: string;
  path: string;
  content: string;
  language: string;
  isModified: boolean;
  isActive: boolean;
  cursorPosition?: {
    line: number;
    column: number;
  };
}

export interface Theme {
  name: string;
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoFormat: boolean;
  defaultModel: string;
  shortcuts: Record<string, string>;
}

export interface Command {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  category: 'file' | 'edit' | 'view' | 'ai' | 'terminal' | 'settings';
  action: () => void | Promise<void>;
  icon?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface AppState {
  user: User | null;
  currentProject: Project | null;
  projects: Project[];
  chatMessages: ChatMessage[];
  editorTabs: EditorTab[];
  activeTabId: string | null;
  selectedModel: AIModel | null;
  availableModels: AIModel[];
  apiKeys: APIKey[];
  settings: Settings;
  theme: Theme;
  isLoading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  aiAssistantModalOpen: boolean;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StreamingResponse {
  id: string;
  content: string;
  done: boolean;
  metadata?: Record<string, any>;
}

// Event types for WebSocket communication
export interface WebSocketEvent {
  type: 'chat' | 'file_change' | 'project_update' | 'model_status';
  payload: any;
  timestamp: Date;
}

// Drag and drop types
export interface DragItem {
  type: 'file' | 'tab' | 'folder';
  id: string;
  data: any;
}

export interface DropTarget {
  type: 'editor' | 'sidebar' | 'tab-bar';
  accepts: string[];
  onDrop: (item: DragItem) => void;
}

// AI patch proposal types (for secure, confirmation-based code edits)
export type PatchOperationType = 'replace' | 'insert' | 'delete';

export interface PatchLineRange {
  start_line: number;
  end_line: number;
}

export interface PatchOperation {
  type: PatchOperationType;
  range?: PatchLineRange | null;
  new_text?: string | null;
}

export interface FilePatch {
  file_path: string;
  description?: string;
  operations: PatchOperation[];
}