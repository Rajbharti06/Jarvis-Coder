import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import offlineFirstService from './offlineFirstService';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface StreamingResponse {
  chunk: string;
  done: boolean;
  metadata?: any;
}

interface CommandRequest {
  command: string;
  workingDirectory?: string;
  timeout?: number;
  env?: Record<string, string>;
}

interface CommandResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'local' | 'api';
  enabled: boolean;
  capabilities: string[];
  contextWindow: number;
  maxTokens: number;
  cost?: {
    input: number;
    output: number;
  };
}

interface ContextRequest {
  path: string;
  includeSubdirs?: boolean;
  fileExtensions?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
}

interface ContextResponse {
  files: Array<{
    path: string;
    content: string;
    size: number;
    lastModified: number;
  }>;
  totalSize: number;
  fileCount: number;
}

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('jarvis_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('jarvis_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data?.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Chat endpoints
  async sendChatMessage(request: ChatRequest): Promise<ChatMessage> {
    try {
      const response = await this.client.post<ApiResponse<ChatMessage>>('/chat', request);
      
      // Update offline cache with successful response
      if (response.data.data && request.messages.length > 0) {
        const lastUserMsg = request.messages[request.messages.length - 1];
        offlineFirstService.sendOfflineMessage(
          lastUserMsg.content,
          'user',
          request.context
        ).then(() => {
          offlineFirstService.sendOfflineMessage(
            response.data.data!.content,
            'assistant',
            request.model
          );
        });
      }
      
      return response.data.data!;
    } catch (error) {
      // Fallback to offline mode if online request fails
      if (!offlineFirstService.isOnline() && request.messages.length > 0) {
        const lastUserMsg = request.messages[request.messages.length - 1];
        const offlineResponse = await offlineFirstService.sendOfflineMessage(
          lastUserMsg.content,
          'user',
          request.context
        );
        return {
          role: 'assistant',
          content: offlineResponse.content,
          timestamp: offlineResponse.timestamp
        };
      }
      console.error('Chat message failed:', error);
      throw error;
    }
  }

  async streamChatMessage(
    request: ChatRequest,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      const response = await this.client.post('/chat/stream', request, {
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          const chunk = progressEvent.event.target.responseText;
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              onChunk(data);
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      });
    } catch (error) {
      console.error('Streaming chat failed:', error);
      throw error;
    }
  }

  // Command execution endpoints
  async executeCommand(request: CommandRequest): Promise<CommandResponse> {
    try {
      const response = await this.client.post<ApiResponse<CommandResponse>>('/terminal/execute', request);
      
      // Update offline cache with command execution
      if (response.data.data) {
        offlineFirstService.executeOfflineCommand(
          request.command,
          request.workingDirectory
        );
      }
      
      return response.data.data!;
    } catch (error) {
      // Fallback to offline command execution if online request fails
      if (!offlineFirstService.isOnline()) {
        const output = await offlineFirstService.executeOfflineCommand(
          request.command,
          request.workingDirectory
        );
        return {
          stdout: output,
          stderr: '',
          exitCode: 0,
          executionTime: 0
        };
      }
      console.error('Command execution failed:', error);
      throw error;
    }
  }

  async streamCommand(
    request: CommandRequest,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      const response = await this.client.post('/terminal/stream', request, {
        responseType: 'stream',
        onDownloadProgress: (progressEvent) => {
          const chunk = progressEvent.event.target.responseText;
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              onChunk(data);
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      });
    } catch (error) {
      console.error('Streaming command failed:', error);
      throw error;
    }
  }

  // Model management endpoints
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<ApiResponse<ModelInfo[]>>('/models');
      
      // Update offline cache with models
      if (response.data.data) {
        offlineFirstService.updateOfflineModels(
          response.data.data.map(model => ({
            id: model.id,
            name: model.name,
            type: model.type,
            enabled: model.enabled
          }))
        );
      }
      
      return response.data.data || [];
    } catch (error) {
      // Fallback to offline models if online request fails
      if (!offlineFirstService.isOnline()) {
        const offlineModels = offlineFirstService.getOfflineModels();
        return offlineModels.map(model => ({
          id: model.id,
          name: model.name,
          provider: 'offline',
          type: model.type as 'local' | 'api',
          enabled: model.enabled,
          capabilities: ['text'],
          contextWindow: 4096,
          maxTokens: 2048
        }));
      }
      console.error('Failed to get models:', error);
      throw error;
    }
  }

  async addModel(model: Partial<ModelInfo>): Promise<ModelInfo> {
    try {
      const response = await this.client.post<ApiResponse<ModelInfo>>('/models', model);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to add model:', error);
      throw error;
    }
  }

  async updateModel(modelId: string, updates: Partial<ModelInfo>): Promise<ModelInfo> {
    try {
      const response = await this.client.put<ApiResponse<ModelInfo>>(`/models/${modelId}`, updates);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to update model:', error);
      throw error;
    }
  }

  async deleteModel(modelId: string): Promise<void> {
    try {
      await this.client.delete(`/models/${modelId}`);
    } catch (error) {
      console.error('Failed to delete model:', error);
      throw error;
    }
  }

  async toggleModel(modelId: string, enabled: boolean): Promise<void> {
    try {
      await this.client.patch(`/models/${modelId}/toggle`, { enabled });
    } catch (error) {
      console.error('Failed to toggle model:', error);
      throw error;
    }
  }

  // Context endpoints
  async getContext(request: ContextRequest): Promise<ContextResponse> {
    try {
      const response = await this.client.post<ApiResponse<ContextResponse>>('/context', request);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get context:', error);
      throw error;
    }
  }

  async getProjectStructure(path: string): Promise<any> {
    try {
      const response = await this.client.get<ApiResponse<any>>(`/context/structure/${encodeURIComponent(path)}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get project structure:', error);
      throw error;
    }
  }

  // File operations
  async readFile(path: string): Promise<string> {
    try {
      const response = await this.client.get<ApiResponse<string>>(`/files/read/${encodeURIComponent(path)}`);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      await this.client.post('/files/write', { path, content });
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  }

  async listDirectory(path: string): Promise<any[]> {
    try {
      const response = await this.client.get<ApiResponse<any[]>>(`/files/list/${encodeURIComponent(path)}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to list directory:', error);
      throw error;
    }
  }

  // Authentication
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    try {
      const response = await this.client.post<ApiResponse<{ token: string; user: any }>>('/auth/login', {
        username,
        password
      });
      
      const { token, user } = response.data.data!;
      localStorage.setItem('jarvis_token', token);
      return { token, user };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
      localStorage.removeItem('jarvis_token');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const response = await this.client.get<ApiResponse<any>>('/auth/me');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  // Settings
  async getSettings(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get<ApiResponse<Record<string, any>>>('/settings');
      return response.data.data || {};
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw error;
    }
  }

  async updateSettings(settings: Record<string, any>): Promise<void> {
    try {
      await this.client.put('/settings', settings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  // Offline sync
  async syncOfflineData(data: any): Promise<void> {
    try {
      await this.client.post('/sync/offline', data);
    } catch (error) {
      console.error('Failed to sync offline data:', error);
      throw error;
    }
  }

  async getOfflineData(): Promise<any> {
    try {
      const response = await this.client.get<ApiResponse<any>>('/sync/offline');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      throw error;
    }
  }

  // Utility methods
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  // Utility methods
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(`API Error: ${message}`);
    }
    return new Error(`Network Error: ${error.message}`);
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get<ApiResponse>('/health');
      return response.data.success;
    } catch (error) {
      return false;
    }
  }

  async checkBackendConnection(): Promise<boolean> {
    try {
      const isHealthy = await this.checkHealth();
      return isHealthy;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
export type {
  ApiResponse,
  StreamingResponse,
  CommandRequest,
  CommandResponse,
  ChatMessage,
  ChatRequest,
  ModelInfo,
  ContextRequest,
  ContextResponse
};