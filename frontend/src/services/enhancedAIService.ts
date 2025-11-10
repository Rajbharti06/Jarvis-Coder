/**
 * Enhanced AI Service for Warp-style Terminal
 * Provides intelligent AI responses with context awareness and streaming
 */

import { aiService } from './aiService';
import offlineFirstService from './offlineFirstService';

export interface AIResponse {
  content: string;
  stream?: AsyncGenerator<string, void, unknown>;
  model: string;
  tokens?: number;
  confidence?: number;
  suggestions?: string[];
  codeBlocks?: CodeBlock[];
  context?: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  startLine?: number;
  endLine?: number;
  file?: string;
}

export interface AIContext {
  currentFile?: string;
  workspace?: string;
  recentCommands?: string[];
  gitStatus?: string;
  projectType?: string;
  dependencies?: string[];
}

class EnhancedAIService {
  private context: AIContext = {};
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  /**
   * Set context for AI responses
   */
  setContext(context: Partial<AIContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get current context
   */
  getContext(): AIContext {
    return this.context;
  }

  /**
   * Add to conversation history
   */
  addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
    
    // Keep only last 20 messages to prevent context overflow
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Send message with enhanced context and streaming
   */
  async sendMessage(
    message: string, 
    options: {
      model?: string;
      stream?: boolean;
      context?: string;
      includeCodeContext?: boolean;
      includeGitContext?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const {
      model = 'gpt-4o',
      stream = true,
      context = '',
      includeCodeContext = true,
      includeGitContext = true
    } = options;

    // Build enhanced prompt with context
    const enhancedPrompt = this.buildEnhancedPrompt(message, {
      context,
      includeCodeContext,
      includeGitContext
    });

    try {
      // Add user message to history
      this.addToHistory('user', message);

      let response: AIResponse;

      if (stream) {
        // Get streaming response
        const streamResponse = await aiService.sendMessage(enhancedPrompt, {
          model,
          stream: true,
          context: 'terminal'
        });

        response = {
          content: '',
          stream: streamResponse.stream,
          model,
          context: this.buildContextSummary()
        };

        // Process stream and extract code blocks
        if (streamResponse.stream) {
          let fullContent = '';
          const codeBlocks: CodeBlock[] = [];
          let currentCodeBlock: CodeBlock | null = null;

          for await (const chunk of streamResponse.stream) {
            fullContent += chunk;
            
            // Extract code blocks from streaming content
            const extractedBlocks = this.extractCodeBlocks(fullContent);
            codeBlocks.push(...extractedBlocks);
          }

          response.content = fullContent;
          response.codeBlocks = codeBlocks;
          response.suggestions = this.extractSuggestions(fullContent);
        }
      } else {
        // Get non-streaming response
        const responseData = await aiService.sendMessage(enhancedPrompt, {
          model,
          stream: false,
          context: 'terminal'
        });

        response = {
          content: responseData.content,
          model,
          context: this.buildContextSummary(),
          codeBlocks: this.extractCodeBlocks(responseData.content),
          suggestions: this.extractSuggestions(responseData.content)
        };
      }

      // Add assistant response to history
      this.addToHistory('assistant', response.content);

      return response;
    } catch (error) {
      console.error('Enhanced AI Service error:', error);
      throw error;
    }
  }

  /**
   * Send offline message with enhanced context
   */
  async sendOfflineMessage(
    message: string,
    options: {
      includeCodeContext?: boolean;
      includeGitContext?: boolean;
    } = {}
  ): Promise<AIResponse> {
    const { includeCodeContext = true, includeGitContext = true } = options;

    const enhancedPrompt = this.buildEnhancedPrompt(message, {
      includeCodeContext,
      includeGitContext
    });

    try {
      this.addToHistory('user', message);

      const response = await offlineFirstService.sendOfflineMessage(enhancedPrompt, 'user');

      const aiResponse: AIResponse = {
        content: response,
        model: 'offline',
        context: this.buildContextSummary(),
        codeBlocks: this.extractCodeBlocks(response),
        suggestions: this.extractSuggestions(response)
      };

      this.addToHistory('assistant', response);

      return aiResponse;
    } catch (error) {
      console.error('Enhanced Offline AI Service error:', error);
      throw error;
    }
  }

  /**
   * Build enhanced prompt with context
   */
  private buildEnhancedPrompt(
    message: string,
    options: {
      context?: string;
      includeCodeContext?: boolean;
      includeGitContext?: boolean;
    }
  ): string {
    const { context = '', includeCodeContext = true, includeGitContext = true } = options;

    let enhancedPrompt = `You are Jarvis, an advanced AI coding assistant integrated into a Warp-style terminal IDE. You help developers with coding, debugging, and terminal operations.

Current Context:
- Terminal: Warp-style AI terminal with glassmorphic design
- Mode: ${this.context.workspace ? 'Project Mode' : 'General Mode'}
- Project: ${this.context.workspace || 'No active project'}`;

    if (this.context.currentFile) {
      enhancedPrompt += `\n- Current File: ${this.context.currentFile}`;
    }

    if (this.context.projectType) {
      enhancedPrompt += `\n- Project Type: ${this.context.projectType}`;
    }

    if (includeCodeContext && this.context.dependencies?.length) {
      enhancedPrompt += `\n- Dependencies: ${this.context.dependencies.join(', ')}`;
    }

    if (includeGitContext && this.context.gitStatus) {
      enhancedPrompt += `\n- Git Status: ${this.context.gitStatus}`;
    }

    if (this.context.recentCommands?.length) {
      enhancedPrompt += `\n- Recent Commands: ${this.context.recentCommands.slice(-5).join('; ')}`;
    }

    if (this.conversationHistory.length > 0) {
      enhancedPrompt += `\n\nRecent Conversation:`;
      this.conversationHistory.slice(-6).forEach(msg => {
        enhancedPrompt += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      });
    }

    if (context) {
      enhancedPrompt += `\n\nAdditional Context: ${context}`;
    }

    enhancedPrompt += `\n\nUser Request: ${message}

Please provide a helpful, accurate response. If you're suggesting code, make sure it's syntactically correct and follows best practices. If you're explaining commands, provide clear examples. Always be concise but thorough.`;

    return enhancedPrompt;
  }

  /**
   * Extract code blocks from content
   */
  private extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      codeBlocks.push({
        language,
        code,
        file: this.context.currentFile
      });
    }

    return codeBlocks;
  }

  /**
   * Extract suggestions from content
   */
  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    // Look for numbered lists or bullet points
    const listRegex = /(?:^|\n)(?:\d+\.|\*|\-)\s+(.+)/gm;
    let match;

    while ((match = listRegex.exec(content)) !== null) {
      const suggestion = match[1].trim();
      if (suggestion.length > 0 && suggestion.length < 100) {
        suggestions.push(suggestion);
      }
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Build context summary
   */
  private buildContextSummary(): string {
    const parts: string[] = [];
    
    if (this.context.workspace) {
      parts.push(`Workspace: ${this.context.workspace}`);
    }
    
    if (this.context.currentFile) {
      parts.push(`File: ${this.context.currentFile}`);
    }
    
    if (this.context.projectType) {
      parts.push(`Type: ${this.context.projectType}`);
    }

    return parts.join(' • ');
  }

  /**
   * Get AI suggestions for current context
   */
  async getContextualSuggestions(): Promise<string[]> {
    const suggestions: string[] = [];

    if (this.context.currentFile) {
      const fileExt = this.context.currentFile.split('.').pop()?.toLowerCase();
      
      switch (fileExt) {
        case 'js':
        case 'ts':
          suggestions.push('Run tests', 'Check linting', 'Build project', 'Start dev server');
          break;
        case 'py':
          suggestions.push('Run Python script', 'Install dependencies', 'Run tests', 'Check syntax');
          break;
        case 'go':
          suggestions.push('Build Go project', 'Run tests', 'Format code', 'Check modules');
          break;
        case 'rs':
          suggestions.push('Build Rust project', 'Run tests', 'Check code', 'Update dependencies');
          break;
        default:
          suggestions.push('Open file', 'Edit file', 'Run command', 'Check status');
      }
    } else {
      suggestions.push('Create new file', 'Open project', 'Check git status', 'Install dependencies');
    }

    return suggestions;
  }

  /**
   * Analyze command and provide suggestions
   */
  analyzeCommand(command: string): {
    type: 'safe' | 'warning' | 'dangerous';
    suggestions: string[];
    explanation: string;
  } {
    const dangerousCommands = ['rm -rf', 'sudo rm', 'dd if=', 'mkfs', 'fdisk', 'format'];
    const warningCommands = ['rm', 'del', 'chmod', 'chown', 'kill', 'shutdown'];
    
    const isDangerous = dangerousCommands.some(cmd => command.includes(cmd));
    const isWarning = warningCommands.some(cmd => command.includes(cmd));
    
    let type: 'safe' | 'warning' | 'dangerous' = 'safe';
    let suggestions: string[] = [];
    let explanation = '';

    if (isDangerous) {
      type = 'dangerous';
      explanation = 'This command could cause data loss or system damage.';
      suggestions = [
        'Double-check the command before running',
        'Consider using --dry-run flag if available',
        'Make sure you have backups',
        'Test on a non-production system first'
      ];
    } else if (isWarning) {
      type = 'warning';
      explanation = 'This command modifies files or system state.';
      suggestions = [
        'Review the command carefully',
        'Check what files will be affected',
        'Consider using -i flag for interactive mode'
      ];
    } else {
      explanation = 'This command appears safe to run.';
      suggestions = [
        'Command looks good to execute',
        'Consider adding verbose flags for more output',
        'Check the help documentation if needed'
      ];
    }

    return { type, suggestions, explanation };
  }
}

export const enhancedAIService = new EnhancedAIService();
