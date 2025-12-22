/**
 * AI Service
 * Handles AI model communication and streaming responses
 */

import { apiClient } from '../utils/api';
import { EventEmitter } from '../utils/EventEmitter';

export interface AIRequest {
  message: string;
  model?: string;
  stream?: boolean;
  context?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  stream?: AsyncGenerator<string, void, unknown>;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  maxTokens: number;
  costPerToken: number;
  supportsStreaming: boolean;
  status: 'available' | 'unavailable' | 'rate_limited';
}

export class AIService extends EventEmitter {
  private activeStreams = new Map<string, AbortController>();
  private modelCache: AIModel[] = [];
  private lastModelUpdate = 0;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
  }

  /**
   * Send message to AI and get response
   */
  async sendMessage(
    message: string, 
    options: Partial<AIRequest> = {}
  ): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.emit('requestStarted', { requestId, message, options });

      const request: AIRequest = {
        message,
        stream: options.stream ?? true,
        context: options.context || 'general',
        model: options.model || 'auto',
        systemPrompt: options.systemPrompt,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
        tools: options.tools
      };

      if (request.stream) {
        return await this.sendStreamingRequest(requestId, request);
      } else {
        return await this.sendRegularRequest(requestId, request);
      }

    } catch (error) {
      this.emit('requestFailed', { requestId, error });
      throw error;
    }
  }

  /**
   * Send streaming request
   */
  private async sendStreamingRequest(
    requestId: string,
    request: AIRequest
  ): Promise<AIResponse> {
    const abortController = new AbortController();
    this.activeStreams.set(requestId, abortController);

    try {
      const response = await apiClient.post('/chat/stream', request, {
        signal: abortController.signal,
        responseType: 'stream'
      });

      const stream = this.createStreamProcessor(response.data, requestId);
      
      this.emit('streamStarted', { requestId });

      return {
        content: '', // Will be built from stream
        model: request.model || 'unknown',
        stream
      };

    } catch (error) {
      this.activeStreams.delete(requestId);
      throw error;
    }
  }

  /**
   * Send regular (non-streaming) request
   */
  private async sendRegularRequest(
    requestId: string,
    request: AIRequest
  ): Promise<AIResponse> {
    try {
      const response = await apiClient.post('/chat', request);
      
      const aiResponse: AIResponse = {
        content: response.data.content,
        model: response.data.model || request.model || 'unknown',
        usage: response.data.usage
      };

      this.emit('requestCompleted', { requestId, response: aiResponse });
      return aiResponse;

    } catch (error) {
      this.emit('requestFailed', { requestId, error });
      throw error;
    }
  }

  /**
   * Create stream processor for streaming responses
   */
  private async* createStreamProcessor(
    streamData: any,
    requestId: string
  ): AsyncGenerator<string, void, unknown> {
    let fullContent = '';
    
    try {
      // Process stream data (this is a simplified version)
      // In a real implementation, you'd parse the streaming response properly
      const reader = streamData.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                this.emit('streamChunk', { requestId, chunk: data.content });
                yield data.content;
              }
            } catch (e) {
              // Ignore parsing errors for malformed chunks
            }
          }
        }
      }

      this.emit('streamCompleted', { requestId, fullContent });
      
    } catch (error) {
      this.emit('streamError', { requestId, error });
      throw error;
    } finally {
      this.activeStreams.delete(requestId);
    }
  }

  /**
   * Cancel active stream
   */
  cancelStream(requestId: string): boolean {
    const abortController = this.activeStreams.get(requestId);
    if (abortController) {
      abortController.abort();
      this.activeStreams.delete(requestId);
      this.emit('streamCancelled', { requestId });
      return true;
    }
    return false;
  }

  /**
   * Cancel all active streams
   */
  cancelAllStreams(): number {
    let cancelledCount = 0;
    for (const [requestId, abortController] of this.activeStreams) {
      abortController.abort();
      this.activeStreams.delete(requestId);
      cancelledCount++;
    }
    this.emit('allStreamsCancelled', { count: cancelledCount });
    return cancelledCount;
  }

  /**
   * Get available models
   */
  async getModels(refresh = false): Promise<AIModel[]> {
    const now = Date.now();
    
    // Use cache if available and not expired
    if (!refresh && this.modelCache.length > 0 && 
        (now - this.lastModelUpdate) < this.cacheTimeout) {
      return this.modelCache;
    }

    try {
      const response = await apiClient.get('/models');
      this.modelCache = response.data.models;
      this.lastModelUpdate = now;
      
      this.emit('modelsUpdated', { models: this.modelCache });
      return this.modelCache;
      
    } catch (error) {
      this.emit('modelsFetchFailed', { error });
      // Return cached models if available, otherwise throw
      if (this.modelCache.length > 0) {
        return this.modelCache;
      }
      throw error;
    }
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string): Promise<AIModel | null> {
    const models = await this.getModels();
    return models.find(model => model.id === modelId) || null;
  }

  /**
   * Test model availability
   */
  async testModel(modelId: string): Promise<boolean> {
    try {
      const response = await apiClient.post('/models/test', { modelId });
      return response.data.available;
    } catch {
      return false;
    }
  }

  /**
   * Get model recommendations for a task
   */
  async getModelRecommendations(
    task: string,
    requirements: {
      speed?: boolean;
      quality?: boolean;
      cost?: boolean;
      offline?: boolean;
    } = {}
  ): Promise<AIModel[]> {
    try {
      const response = await apiClient.post('/models/recommendations', {
        task,
        requirements
      });
      return response.data.recommendations;
    } catch (error) {
      // Fallback to simple filtering
      const models = await this.getModels();
      return models.filter(model => {
        if (requirements.offline && model.provider !== 'ollama') return false;
        if (requirements.speed && !model.capabilities.includes('fast_response')) return false;
        return model.status === 'available';
      });
    }
  }

  /**
   * Get AI suggestions for code completion
   */
  async getCodeSuggestions(
    code: string,
    language: string,
    context?: string
  ): Promise<string[]> {
    const lang = language || 'code';
    const ctx = context || 'general';
    const prompt =
      `You are an expert ${lang} assistant. Given the following code, ` +
      `suggest practical next steps for completion, refactoring, and error handling. ` +
      `Respond ONLY with 3-7 succinct suggestions. Use the format:\n` +
      `- SUGGESTION: <one-line actionable suggestion>\n` +
      `If providing code, keep it short and focused.\n\n` +
      `Context: ${ctx}\n\n` +
      `${lang} code:\n` +
      `\`\`\`${lang}\n${code}\n\`\`\`\n`;

    try {
      const resp = await this.sendMessage(prompt, {
        stream: true,
        context: 'code_suggestions'
      });

      const suggestions: string[] = [];

      if (resp.stream) {
        let buffer = '';
        for await (const chunk of resp.stream) {
          buffer += chunk;
          const extracted = this.extractSuggestions(buffer);
          for (const s of extracted) {
            if (!suggestions.includes(s)) {
              suggestions.push(s);
              this.emit('codeSuggestion', { suggestion: s });
            }
          }
          if (suggestions.length >= 7) break;
        }
        return suggestions.slice(0, 7);
      }

      return this.extractSuggestions(resp.content).slice(0, 7);
    } catch (streamError) {
      try {
        const response = await apiClient.post('/api/ai/code-suggestions', {
          code,
          language,
          context
        });
        return (response.data?.suggestions ?? []).slice(0, 7);
      } catch (error) {
        console.error('Failed to get code suggestions:', error);
        return [];
      }
    }
  }

  private extractSuggestions(text: string): string[] {
    const out: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*-\s*SUGGESTION:\s*(.+)\s*$/i);
      if (m && m[1]) {
        const s = m[1].trim();
        if (s && !out.includes(s)) out.push(s);
      }
    }
    if (out.length === 0) {
      const alt: string[] = [];
      for (const line of lines) {
        const m = line.match(/^\s*[-*]\s+(.+)\s*$/);
        if (m && m[1]) {
          const s = m[1].trim();
          if (s && !alt.includes(s)) alt.push(s);
        }
      }
      return alt;
    }
    return out;
  }

  /**
   * Explain code using AI
   */
  async explainCode(
    code: string,
    language: string,
    options: Partial<AIRequest> = {}
  ): Promise<AIResponse> {
    const systemPrompt = `You are an expert programmer. Explain the following ${language} code in a clear and concise way. Focus on:
1. What the code does
2. Key concepts and patterns used
3. Potential improvements or considerations

Code to explain:
\`\`\`${language}
${code}
\`\`\``;

    return this.sendMessage('Explain this code', {
      ...options,
      systemPrompt,
      context: 'code_explanation'
    });
  }

  /**
   * Generate code using AI
   */
  async generateCode(
    description: string,
    language: string,
    options: Partial<AIRequest> = {}
  ): Promise<AIResponse> {
    const systemPrompt = `You are an expert programmer. Generate clean, well-commented ${language} code based on the following description. 
Follow best practices and include error handling where appropriate.

Description: ${description}`;

    return this.sendMessage(`Generate ${language} code`, {
      ...options,
      systemPrompt,
      context: 'code_generation'
    });
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const response = await apiClient.get('/api/ai/usage', {
        params: { timeframe }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }

  /**
   * Clear model cache
   */
  clearModelCache(): void {
    this.modelCache = [];
    this.lastModelUpdate = 0;
    this.emit('modelCacheCleared');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
export const aiService = new AIService();

export default aiService;
