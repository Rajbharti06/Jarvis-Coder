/**
 * API utility functions for Jarvis Coder
 * Handles communication with FastAPI backend
 */

import type { APIResponse, ChatMessage, Project, FileNode } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIClient {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Chat endpoints
  async sendChatMessage(
    message: string,
    model: string,
    projectId?: string
  ): Promise<APIResponse<ChatMessage>> {
    return this.request<ChatMessage>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        model,
        project_id: projectId,
      }),
    });
  }

  async streamChatMessage(
    message: string,
    model: string,
    projectId?: string,
    onChunk?: (chunk: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/chat/stream`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          message,
          model,
          project_id: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content && onChunk) {
                onChunk(parsed.content);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming failed:', error);
      throw error;
    }
  }

  // Project endpoints
  async getProjects(): Promise<APIResponse<Project[]>> {
    return this.request<Project[]>('/projects');
  }

  async createProject(
    name: string,
    description?: string,
    template?: string
  ): Promise<APIResponse<Project>> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, template }),
    });
  }

  async getProject(projectId: string): Promise<APIResponse<Project>> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async updateProject(
    projectId: string,
    updates: { name?: string; description?: string }
  ): Promise<APIResponse<Project>> {
    return this.request<Project>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(projectId: string): Promise<APIResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async getProjectFiles(projectId: string): Promise<APIResponse<{ files: FileNode[] }>> {
    return this.request<{ files: FileNode[] }>(`/projects/${projectId}/files`);
  }

  // File endpoints
  async getFileContent(
    projectId: string,
    filePath: string
  ): Promise<APIResponse<{ content: string }>> {
    return this.request<{ content: string }>(
      `/files/content?project_id=${projectId}&path=${encodeURIComponent(filePath)}`
    );
  }

  async saveFileContent(
    projectId: string,
    filePath: string,
    content: string
  ): Promise<APIResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/files/content`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, path: filePath, content }),
    });
  }

  async listDirectoryContents(
    projectId: string,
    dirPath: string = ""
  ): Promise<APIResponse<FileNode[]>> {
    return this.request<FileNode[]>(
      `/files/list?project_id=${projectId}&path=${encodeURIComponent(dirPath)}`
    );
  }

  async createFile(
    projectId: string,
    filePath: string
  ): Promise<APIResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/files/create`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, path: filePath }),
    });
  }

  async createFolder(
    projectId: string,
    folderPath: string
  ): Promise<APIResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/files/folder`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, path: folderPath }),
    });
  }

  async deleteFile(
    projectId: string,
    filePath: string
  ): Promise<APIResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/files/delete`, {
      method: 'DELETE',
      body: JSON.stringify({ project_id: projectId, path: filePath }),
    });
  }

  async deleteFolder(
    projectId: string,
    folderPath: string
  ): Promise<APIResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/files/folder`, {
      method: 'DELETE',
      body: JSON.stringify({ project_id: projectId, path: folderPath }),
    });
  }

  // Model endpoints
  async getAvailableModels(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/api/models');
  }

  async validateAPIKey(
    provider: string,
    apiKey: string
  ): Promise<APIResponse<boolean>> {
    return this.request<boolean>('/api/models/validate-key', {
      method: 'POST',
      body: JSON.stringify({ provider, api_key: apiKey }),
    });
  }

  // Execution endpoints
  async executeCode(
    code: string,
    language: string,
    projectId?: string
  ): Promise<APIResponse<{ output: string; error?: string }>> {
    return this.request<{ output: string; error?: string }>('/api/execute', {
      method: 'POST',
      body: JSON.stringify({ code, language, project_id: projectId }),
    });
  }

  // WebSocket connection for real-time updates
  createWebSocket(
    onMessage?: (data: any) => void,
    onError?: (error: Event) => void
  ): WebSocket {
    const wsURL = this.baseURL.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsURL);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    return ws;
  }

  // Trae Cursor Blackbox AI Assistant endpoints
  async getBlackboxStatus(): Promise<APIResponse<any>> {
    return this.request<any>('/api/blackbox/status');
  }

  async getBlackboxModels(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/api/blackbox/models');
  }

  async blackboxChat(
    message: string,
    options?: {
      model?: string;
      stream?: boolean;
      context?: any[];
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<APIResponse<any>> {
    return this.request<any>('/api/blackbox/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        ...options
      }),
    });
  }

  async blackboxChatStream(
    message: string,
    options?: {
      model?: string;
      context?: any[];
      temperature?: number;
      max_tokens?: number;
    },
    onChunk?: (chunk: string) => void,
    onError?: (error: string) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/api/blackbox/chat/stream`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          message,
          stream: true,
          ...options
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete?.();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk?.(parsed.content);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async switchBlackboxMode(mode: 'online' | 'offline'): Promise<APIResponse<any>> {
    return this.request<any>('/api/blackbox/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  async switchBlackboxProvider(provider: string): Promise<APIResponse<any>> {
    return this.request<any>('/api/blackbox/provider', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  }

  async getBlackboxConversations(): Promise<APIResponse<any[]>> {
    return this.request<any[]>('/api/blackbox/conversations');
  }

  async getBlackboxConversation(conversationId: string): Promise<APIResponse<any>> {
    return this.request<any>(`/api/blackbox/conversations/${conversationId}`);
  }

  async deleteBlackboxConversation(conversationId: string): Promise<APIResponse<any>> {
    return this.request<any>(`/api/blackbox/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async submitBlackboxFeedback(
    conversationId: string,
    messageId: string,
    feedback: 'positive' | 'negative',
    comment?: string
  ): Promise<APIResponse<any>> {
    return this.request<any>('/api/blackbox/feedback', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        message_id: messageId,
        feedback,
        comment
      }),
    });
  }

  async getBlackboxAnalytics(): Promise<APIResponse<any>> {
    return this.request<any>('/api/blackbox/analytics');
  }

  async triggerBlackboxUpgrade(): Promise<APIResponse<any>> {
    return this.request<any>('/api/blackbox/upgrade', {
      method: 'POST',
    });
  }

  // Set authorization header
  setAuthToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  // Remove authorization header
  clearAuthToken() {
    delete this.headers['Authorization'];
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export utility functions
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const getFileLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    fish: 'shell',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  };
  return languageMap[ext || ''] || 'plaintext';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};