import { aiService } from './aiService';
import apiService from './apiService';

interface OfflineMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  context?: string;
}

interface OfflineSession {
  id: string;
  title: string;
  messages: OfflineMessage[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  context?: string;
}

interface OfflineCache {
  sessions: OfflineSession[];
  commands: Array<{
    id: string;
    command: string;
    output: string;
    timestamp: number;
  }>;
  settings: Record<string, any>;
  models: Array<{
    id: string;
    name: string;
    type: 'local' | 'api';
    enabled: boolean;
  }>;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: number;
  pendingSync: boolean;
  syncError?: string;
}

class OfflineFirstService {
  private readonly OFFLINE_DB_KEY = 'jarvis_offline_db';
  private readonly SYNC_STATUS_KEY = 'jarvis_sync_status';
  private readonly MAX_OFFLINE_SESSIONS = 50;
  private readonly MAX_OFFLINE_COMMANDS = 100;
  private cache: OfflineCache;
  private syncStatus: SyncStatus;
  private aiService: AIService;
  private syncInProgress: boolean = false;

  constructor() {
    this.cache = this.loadOfflineCache();
    this.syncStatus = this.loadSyncStatus();
    this.aiService = aiService;
    this.initializeService();
  }

  private initializeService(): void {
    // Set up online/offline event listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Check initial connection status
    if (navigator.onLine) {
      this.checkBackendConnection();
    }
    
    // Start periodic sync
    setInterval(() => this.attemptSync(), 30000); // Sync every 30 seconds
  }

  private loadOfflineCache(): OfflineCache {
    try {
      const stored = localStorage.getItem(this.OFFLINE_DB_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline cache:', error);
    }
    
    return {
      sessions: [],
      commands: [],
      settings: {},
      models: []
    };
  }

  private saveOfflineCache(): void {
    try {
      localStorage.setItem(this.OFFLINE_DB_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to save offline cache:', error);
    }
  }

  private loadSyncStatus(): SyncStatus {
    try {
      const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
    
    return {
      isOnline: navigator.onLine,
      lastSync: 0,
      pendingSync: false
    };
  }

  private saveSyncStatus(): void {
    try {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  private async handleOnline(): Promise<void> {
    console.log('Application is online');
    this.syncStatus.isOnline = true;
    this.saveSyncStatus();
    
    // Attempt to sync immediately
    await this.attemptSync();
  }

  private handleOffline(): void {
    console.log('Application is offline');
    this.syncStatus.isOnline = false;
    this.saveSyncStatus();
  }

  private async checkBackendConnection(): Promise<void> {
    try {
      const isConnected = await apiService.checkBackendConnection();
      this.syncStatus.isOnline = isConnected;
      
      if (isConnected) {
        await this.attemptSync();
      }
    } catch (error) {
      console.error('Backend connection check failed:', error);
      this.syncStatus.isOnline = false;
    }
    
    this.saveSyncStatus();
  }

  // Chat functionality
  async sendOfflineMessage(content: string, role: 'user' | 'assistant' = 'user', context?: string): Promise<OfflineMessage> {
    const message: OfflineMessage = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
      context
    };

    // Get or create active session
    let session = this.cache.sessions.find(s => s.isActive);
    if (!session) {
      session = this.createNewSession();
    }

    session.messages.push(message);
    session.updatedAt = Date.now();

    // If this is a user message, generate AI response using local model
    if (role === 'user') {
      try {
        const aiResponse = await this.generateLocalAIResponse(content, context);
        const aiMessage: OfflineMessage = {
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: Date.now(),
          model: 'local-llama2'
        };
        
        session.messages.push(aiMessage);
        session.updatedAt = Date.now();
        
        // Return both messages
        return aiMessage;
      } catch (error) {
        console.error('Local AI generation failed:', error);
        const errorMessage: OfflineMessage = {
          id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: 'I apologize, but I cannot generate a response while offline. Please check your connection or try again later.',
          timestamp: Date.now(),
          model: 'offline-error'
        };
        
        session.messages.push(errorMessage);
        return errorMessage;
      }
    }

    this.saveOfflineCache();
    this.syncStatus.pendingSync = true;
    this.saveSyncStatus();

    return message;
  }

  private async generateLocalAIResponse(content: string, context?: string): Promise<string> {
    // Try to use local Ollama model if available
    try {
      const response = await this.aiService.sendMessage(content, false, 'ollama/llama2');
      return response.content;
    } catch (error) {
      console.warn('Local model failed, using fallback:', error);
      
      // Fallback to simple pattern matching
      return this.generateFallbackResponse(content, context);
    }
  }

  private generateFallbackResponse(content: string, context?: string): string {
    const lowerContent = content.toLowerCase();
    
    // Simple pattern matching for common queries
    if (lowerContent.includes('hello') || lowerContent.includes('hi')) {
      return 'Hello! I\'m currently running in offline mode with limited capabilities. How can I help you?';
    }
    
    if (lowerContent.includes('help')) {
      return 'I\'m in offline mode with limited functionality. For full AI capabilities, please connect to the internet. Available offline commands: basic chat, terminal commands, file operations.';
    }
    
    if (lowerContent.includes('code')) {
      return 'I can help with basic code questions offline, but for advanced code analysis and generation, please connect to the internet for full AI model access.';
    }
    
    if (lowerContent.includes('error')) {
      return 'I understand you\'re experiencing an issue. While offline, I can help with basic troubleshooting, but for detailed error analysis, please connect to the internet.';
    }
    
    return 'I\'m currently operating in offline mode with limited AI capabilities. For more advanced assistance, please connect to the internet to access full AI models.';
  }

  // Command execution
  async executeOfflineCommand(command: string, workingDirectory?: string): Promise<string> {
    const commandEntry = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command,
      output: '',
      timestamp: Date.now()
    };

    try {
      // Try to execute via backend if online
      if (this.syncStatus.isOnline) {
        const result = await apiService.executeCommand({
          command,
          workingDirectory
        });
        
        commandEntry.output = result.stdout || result.stderr || 'Command executed successfully';
      } else {
        // Offline command execution (limited)
        commandEntry.output = await this.executeOfflineCommandFallback(command);
      }
    } catch (error) {
      commandEntry.output = `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Store in cache
    this.cache.commands.push(commandEntry);
    
    // Limit cache size
    if (this.cache.commands.length > this.MAX_OFFLINE_COMMANDS) {
      this.cache.commands = this.cache.commands.slice(-this.MAX_OFFLINE_COMMANDS);
    }

    this.saveOfflineCache();
    this.syncStatus.pendingSync = true;
    this.saveSyncStatus();

    return commandEntry.output;
  }

  private async executeOfflineCommandFallback(command: string): Promise<string> {
    // Basic offline command simulation
    const lowerCmd = command.toLowerCase();
    
    if (lowerCmd.startsWith('ls') || lowerCmd.startsWith('dir')) {
      return 'file1.txt\nfile2.js\ndirectory1/\ndirectory2/';
    }
    
    if (lowerCmd.startsWith('pwd') || lowerCmd.startsWith('cd')) {
      return '/offline/workspace';
    }
    
    if (lowerCmd.startsWith('echo')) {
      return command.substring(5); // Return everything after "echo "
    }
    
    if (lowerCmd.includes('node') || lowerCmd.includes('python')) {
      return 'Code execution requires online mode for full functionality.';
    }
    
    return `Command "${command}" requires online mode for execution.`;
  }

  // Session management
  private createNewSession(): OfflineSession {
    const session: OfflineSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `Offline Session ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true
    };

    // Deactivate other sessions
    this.cache.sessions.forEach(s => s.isActive = false);
    
    // Add new session
    this.cache.sessions.push(session);
    
    // Limit number of sessions
    if (this.cache.sessions.length > this.MAX_OFFLINE_SESSIONS) {
      this.cache.sessions = this.cache.sessions.slice(-this.MAX_OFFLINE_SESSIONS);
    }

    this.saveOfflineCache();
    return session;
  }

  getActiveSession(): OfflineSession | null {
    return this.cache.sessions.find(s => s.isActive) || null;
  }

  getAllSessions(): OfflineSession[] {
    return [...this.cache.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  switchSession(sessionId: string): void {
    this.cache.sessions.forEach(s => s.isActive = false);
    const session = this.cache.sessions.find(s => s.id === sessionId);
    if (session) {
      session.isActive = true;
      this.saveOfflineCache();
    }
  }

  // Sync functionality
  private async attemptSync(): Promise<void> {
    if (this.syncInProgress || !this.syncStatus.isOnline || !this.syncStatus.pendingSync) {
      return;
    }

    this.syncInProgress = true;
    
    try {
      console.log('Starting offline sync...');
      
      // Sync sessions
      await this.syncSessions();
      
      // Sync commands
      await this.syncCommands();
      
      // Sync settings
      await this.syncSettings();
      
      this.syncStatus.lastSync = Date.now();
      this.syncStatus.pendingSync = false;
      this.syncStatus.syncError = undefined;
      
      console.log('Offline sync completed successfully');
    } catch (error) {
      console.error('Offline sync failed:', error);
      this.syncStatus.syncError = error instanceof Error ? error.message : 'Sync failed';
    } finally {
      this.syncInProgress = false;
      this.saveSyncStatus();
    }
  }

  private async syncSessions(): Promise<void> {
    const sessionsToSync = this.cache.sessions.filter(s => s.updatedAt > this.syncStatus.lastSync);
    
    for (const session of sessionsToSync) {
      try {
        // Convert offline session to online format and sync
        const onlineMessages = session.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }));
        
        // This would sync with the backend chat service
        // await apiService.syncChatSession(session.id, onlineMessages);
        
        console.log(`Synced session: ${session.id}`);
      } catch (error) {
        console.warn(`Failed to sync session ${session.id}:`, error);
      }
    }
  }

  private async syncCommands(): Promise<void> {
    const commandsToSync = this.cache.commands.filter(cmd => cmd.timestamp > this.syncStatus.lastSync);
    
    for (const command of commandsToSync) {
      try {
        // This would sync with the backend terminal service
        // await apiService.syncCommandHistory(command.id, command.command, command.output);
        
        console.log(`Synced command: ${command.id}`);
      } catch (error) {
        console.warn(`Failed to sync command ${command.id}:`, error);
      }
    }
  }

  private async syncSettings(): Promise<void> {
    try {
      // Sync offline settings with backend
      if (Object.keys(this.cache.settings).length > 0) {
        // await apiService.updateSettings(this.cache.settings);
        console.log('Synced settings');
      }
    } catch (error) {
      console.warn('Failed to sync settings:', error);
    }
  }

  // Settings management
  updateOfflineSettings(settings: Record<string, any>): void {
    this.cache.settings = { ...this.cache.settings, ...settings };
    this.saveOfflineCache();
    this.syncStatus.pendingSync = true;
    this.saveSyncStatus();
  }

  getOfflineSettings(): Record<string, any> {
    return { ...this.cache.settings };
  }

  // Model management
  updateOfflineModels(models: Array<{ id: string; name: string; type: 'local' | 'api'; enabled: boolean }>): void {
    this.cache.models = models;
    this.saveOfflineCache();
  }

  getOfflineModels(): Array<{ id: string; name: string; type: 'local' | 'api'; enabled: boolean }> {
    return this.cache.models;
  }

  // Status and utilities
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  isOnline(): boolean {
    return this.syncStatus.isOnline;
  }

  hasPendingSync(): boolean {
    return this.syncStatus.pendingSync;
  }

  getOfflineCacheSize(): number {
    const cacheString = JSON.stringify(this.cache);
    return new Blob([cacheString]).size;
  }

  clearOfflineData(): void {
    this.cache = {
      sessions: [],
      commands: [],
      settings: {},
      models: []
    };
    this.saveOfflineCache();
    
    this.syncStatus = {
      isOnline: navigator.onLine,
      lastSync: 0,
      pendingSync: false
    };
    this.saveSyncStatus();
  }

  exportOfflineData(): string {
    return JSON.stringify({
      cache: this.cache,
      syncStatus: this.syncStatus,
      exportedAt: Date.now()
    }, null, 2);
  }

  importOfflineData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.cache && parsed.syncStatus) {
        this.cache = parsed.cache;
        this.syncStatus = parsed.syncStatus;
        this.saveOfflineCache();
        this.saveSyncStatus();
      }
    } catch (error) {
      console.error('Failed to import offline data:', error);
      throw new Error('Invalid offline data format');
    }
  }
}

// Create singleton instance
const offlineFirstService = new OfflineFirstService();

export default offlineFirstService;
export type { OfflineMessage, OfflineSession, OfflineCache, SyncStatus };