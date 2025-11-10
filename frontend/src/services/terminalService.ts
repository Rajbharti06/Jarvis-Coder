/**
 * Terminal Service
 * Handles command execution, AI integration, and terminal management
 */

import { apiClient } from '../utils/api';
import { EventEmitter } from '../utils/EventEmitter';

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  executionTime?: number;
}

export interface TerminalOptions {
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
  shell?: string;
}

class TerminalService extends EventEmitter {
  private commandHistory: string[] = [];
  private maxHistorySize = 1000;
  private activeCommands = new Map<string, AbortController>();

  constructor() {
    super();
  }

  /**
   * Execute a shell command
   */
  async executeCommand(
    command: string, 
    options: TerminalOptions = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const commandId = this.generateCommandId();
    
    try {
      // Add to history
      this.addToHistory(command);

      // Create abort controller for this command
      const abortController = new AbortController();
      this.activeCommands.set(commandId, abortController);

      // Emit command started event
      this.emit('commandStarted', { commandId, command, options });

      // Execute via backend API
      const response = await apiClient.post('/terminal/execute', {
        command,
        options: {
          ...options,
          timeout: options.timeout || 30000, // 30 second default
        }
      }, {
        signal: abortController.signal
      });

      const executionTime = Date.now() - startTime;
      const result = response.data;

      // Emit command completed event
      this.emit('commandCompleted', { 
        commandId, 
        command, 
        result, 
        executionTime 
      });

      // Clean up
      this.activeCommands.delete(commandId);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Handle abort (user cancelled)
      if (error.name === 'AbortError') {
        this.emit('commandCancelled', { commandId, command });
        return {
          success: false,
          error: 'Command cancelled by user',
          exitCode: -1,
          executionTime
        };
      }

      // Handle other errors
      this.emit('commandFailed', { commandId, command, error });
      
      return {
        success: false,
        error: error.message || 'Command execution failed',
        exitCode: -1,
        executionTime
      };
    } finally {
      this.activeCommands.delete(commandId);
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeCommands(
    commands: string[],
    options: TerminalOptions = {}
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    for (const command of commands) {
      const result = await this.executeCommand(command, options);
      results.push(result);
      
      // Stop on first failure if not continuing on error
      if (!result.success && !options.continueOnError) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Cancel an active command
   */
  cancelCommand(commandId: string): boolean {
    const abortController = this.activeCommands.get(commandId);
    if (abortController) {
      abortController.abort();
      this.activeCommands.delete(commandId);
      this.emit('commandCancelled', { commandId });
      return true;
    }
    return false;
  }

  /**
   * Cancel all active commands
   */
  cancelAllCommands(): number {
    let cancelledCount = 0;
    for (const [commandId, abortController] of this.activeCommands) {
      abortController.abort();
      this.activeCommands.delete(commandId);
      cancelledCount++;
    }
    this.emit('allCommandsCancelled', { count: cancelledCount });
    return cancelledCount;
  }

  /**
   * Get command history
   */
  getCommandHistory(limit?: number): string[] {
    const history = [...this.commandHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
    this.emit('historyCleared');
  }

  /**
   * Get active commands
   */
  getActiveCommands(): string[] {
    return Array.from(this.activeCommands.keys());
  }

  /**
   * Test terminal connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.executeCommand('echo "test"', { timeout: 5000 });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<Record<string, any>> {
    try {
      const commands = [
        'uname -a',
        'echo $SHELL',
        'pwd',
        'whoami'
      ];

      const results = await this.executeCommands(commands);
      
      return {
        platform: results[0].output?.trim() || 'unknown',
        shell: results[1].output?.trim() || 'unknown',
        workingDirectory: results[2].output?.trim() || '/',
        user: results[3].output?.trim() || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get system info',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute AI-assisted command
   */
  async executeAICommand(
    naturalLanguage: string,
    options: TerminalOptions = {}
  ): Promise<CommandResult> {
    try {
      // Get AI to translate natural language to shell command
      const aiResponse = await apiClient.post('/ai/translate-command', {
        input: naturalLanguage,
        context: {
          workingDirectory: options.workingDirectory,
          environment: options.environment
        }
      });

      const { command, explanation } = aiResponse.data;
      
      // Emit AI translation event
      this.emit('aiCommandTranslated', { 
        naturalLanguage, 
        command, 
        explanation 
      });

      // Execute the translated command
      const result = await this.executeCommand(command, options);
      
      // Add AI context to result
      return {
        ...result,
        aiExplanation: explanation
      };

    } catch (error) {
      return {
        success: false,
        error: `AI command translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exitCode: -1
      };
    }
  }

  /**
   * Add command to history
   */
  private addToHistory(command: string): void {
    // Skip empty commands and duplicates
    if (!command.trim() || command === this.commandHistory[this.commandHistory.length - 1]) {
      return;
    }

    this.commandHistory.push(command);
    
    // Maintain history size limit
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
    }

    this.emit('historyUpdated', { command, historySize: this.commandHistory.length });
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
export const terminalService = new TerminalService();

export default terminalService;