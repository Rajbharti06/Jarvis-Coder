/**
 * Workspace Service for Jarvis Terminal
 * Handles workspace integration, file watching, and project context
 */

// Browser-compatible EventEmitter implementation
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
      return true;
    }
    return false;
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

export interface FileInfo {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: Date;
  content?: string;
  language?: string;
  isOpen?: boolean;
}

export interface ProjectInfo {
  name: string;
  path: string;
  type: 'javascript' | 'typescript' | 'python' | 'go' | 'rust' | 'java' | 'csharp' | 'php' | 'ruby' | 'other';
  dependencies: string[];
  gitStatus?: {
    branch: string;
    status: string;
    modified: string[];
    staged: string[];
    untracked: string[];
  };
  recentFiles: FileInfo[];
  lastActive: Date;
}

export interface WorkspaceContext {
  currentProject?: ProjectInfo;
  openFiles: FileInfo[];
  recentCommands: string[];
  gitStatus?: string;
  environment: 'development' | 'production' | 'test';
}

// Browser-compatible file watcher interface
interface FileWatcher {
  path: string;
  callback: (event: string, filename: string) => void;
}

class WorkspaceService extends EventEmitter {
  private currentWorkspace: string | null = null;
  private projectInfo: ProjectInfo | null = null;
  private openFiles: Map<string, FileInfo> = new Map();
  private recentCommands: string[] = [];
  private fileWatchers: Map<string, FileWatcher> = new Map();
  private isWatching = false;

  /**
   * Initialize workspace
   */
  async initializeWorkspace(workspacePath: string): Promise<void> {
    try {
      this.currentWorkspace = workspacePath;
      await this.scanProject();
      this.startWatching();
      this.emit('workspace:initialized', { path: workspacePath });
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
      throw error;
    }
  }

  /**
   * Get current workspace context
   */
  getWorkspaceContext(): WorkspaceContext {
    return {
      currentProject: this.projectInfo || undefined,
      openFiles: Array.from(this.openFiles.values()),
      recentCommands: this.recentCommands,
      gitStatus: this.projectInfo?.gitStatus?.status,
      environment: this.detectEnvironment()
    };
  }

  /**
   * Scan project for information
   */
  private async scanProject(): Promise<void> {
    if (!this.currentWorkspace) return;

    try {
      // Detect project type
      const projectType = await this.detectProjectType();
      
      // Get dependencies
      const dependencies = await this.getDependencies();
      
      // Get git status
      const gitStatus = await this.getGitStatus();
      
      // Get recent files
      const recentFiles = await this.getRecentFiles();

      this.projectInfo = {
        name: this.getProjectName(),
        path: this.currentWorkspace,
        type: projectType,
        dependencies,
        gitStatus,
        recentFiles,
        lastActive: new Date()
      };

      this.emit('project:scanned', this.projectInfo);
    } catch (error) {
      console.error('Failed to scan project:', error);
    }
  }

  /**
   * Detect project type based on files
   */
  private async detectProjectType(): Promise<ProjectInfo['type']> {
    if (!this.currentWorkspace) return 'other';

    const indicators = {
      'package.json': 'javascript',
      'tsconfig.json': 'typescript',
      'requirements.txt': 'python',
      'go.mod': 'go',
      'Cargo.toml': 'rust',
      'pom.xml': 'java',
      '*.csproj': 'csharp',
      'composer.json': 'php',
      'Gemfile': 'ruby'
    };

    for (const [file, type] of Object.entries(indicators)) {
      if (file.includes('*')) {
        // Handle glob patterns
        const pattern = file.replace('*', '');
        if (await this.fileExists(pattern)) {
          return type as ProjectInfo['type'];
        }
      } else {
        if (await this.fileExists(file)) {
          return type as ProjectInfo['type'];
        }
      }
    }

    return 'other';
  }

  /**
   * Get project dependencies
   */
  private async getDependencies(): Promise<string[]> {
    if (!this.currentWorkspace) return [];

    const dependencyFiles = {
      'package.json': 'dependencies',
      'requirements.txt': 'all',
      'go.mod': 'all',
      'Cargo.toml': 'dependencies',
      'pom.xml': 'dependencies',
      'composer.json': 'require'
    };

    for (const [file, key] of Object.entries(dependencyFiles)) {
      if (await this.fileExists(file)) {
        try {
          const content = await this.readFile(file);
          if (key === 'all') {
            return content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
          } else {
            const json = JSON.parse(content);
            const deps = json[key] || {};
            return Object.keys(deps);
          }
        } catch (error) {
          console.error(`Failed to parse ${file}:`, error);
        }
      }
    }

    return [];
  }

  /**
   * Get git status
   */
  private async getGitStatus(): Promise<ProjectInfo['gitStatus'] | undefined> {
    if (!this.currentWorkspace) return undefined;

    try {
      // This would typically use a git library or exec git commands
      // For now, return mock data
      return {
        branch: 'main',
        status: 'clean',
        modified: [],
        staged: [],
        untracked: []
      };
    } catch (error) {
      console.error('Failed to get git status:', error);
      return undefined;
    }
  }

  /**
   * Get recent files
   */
  private async getRecentFiles(): Promise<FileInfo[]> {
    if (!this.currentWorkspace) return [];

    try {
      // This would typically scan the workspace for recent files
      // For now, return mock data
      return [];
    } catch (error) {
      console.error('Failed to get recent files:', error);
      return [];
    }
  }

  /**
   * Get project name
   */
  private getProjectName(): string {
    if (!this.currentWorkspace) return 'Unknown';
    return this.currentWorkspace.split('/').pop() || 'Unknown';
  }

  /**
   * Detect environment
   */
  private detectEnvironment(): WorkspaceContext['environment'] {
    // Use import.meta.env for Vite environment variables
    if (import.meta.env.MODE === 'production') return 'production';
    if (import.meta.env.MODE === 'test') return 'test';
    return 'development';
  }

  /**
   * Start watching for file changes
   */
  private startWatching(): void {
    if (!this.currentWorkspace || this.isWatching) return;

    this.isWatching = true;
    this.emit('workspace:watching:started');
  }

  /**
   * Stop watching for file changes
   */
  private stopWatching(): void {
    this.isWatching = false;
    // In browser environment, we don't have actual file watchers to close
    this.fileWatchers.clear();
    this.emit('workspace:watching:stopped');
  }

  /**
   * Add command to recent commands
   */
  addRecentCommand(command: string): void {
    this.recentCommands.unshift(command);
    this.recentCommands = this.recentCommands.slice(0, 50); // Keep last 50 commands
    this.emit('command:added', command);
  }

  /**
   * Open a file
   */
  async openFile(filePath: string): Promise<FileInfo | null> {
    try {
      const fileInfo = await this.getFileInfo(filePath);
      if (fileInfo) {
        fileInfo.isOpen = true;
        this.openFiles.set(filePath, fileInfo);
        this.emit('file:opened', fileInfo);
      }
      return fileInfo;
    } catch (error) {
      console.error('Failed to open file:', error);
      return null;
    }
  }

  /**
   * Close a file
   */
  closeFile(filePath: string): void {
    const fileInfo = this.openFiles.get(filePath);
    if (fileInfo) {
      fileInfo.isOpen = false;
      this.openFiles.delete(filePath);
      this.emit('file:closed', fileInfo);
    }
  }

  /**
   * Get file information
   */
  private async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      // This would typically use the File System Access API or similar
      // For now, return mock data
      return {
        path: filePath,
        name: filePath.split('/').pop() || filePath,
        type: 'file',
        size: 0,
        lastModified: new Date(),
        language: this.detectLanguage(filePath)
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      return null;
    }
  }

  /**
   * Detect file language
   */
  private detectLanguage(filePath: string): string | undefined {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown'
    };
    return languageMap[ext || ''] || 'text';
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      // This would typically use the File System Access API
      // For now, return false
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Read file content
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      // This would typically use the File System Access API
      // For now, return empty string
      return '';
    } catch (error) {
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  /**
   * Get project suggestions based on context
   */
  getProjectSuggestions(): string[] {
    if (!this.projectInfo) return [];

    const suggestions: string[] = [];

    switch (this.projectInfo.type) {
      case 'javascript':
      case 'typescript':
        suggestions.push('npm install', 'npm run dev', 'npm test', 'npm build');
        break;
      case 'python':
        suggestions.push('pip install -r requirements.txt', 'python -m pytest', 'python main.py');
        break;
      case 'go':
        suggestions.push('go mod tidy', 'go run .', 'go test', 'go build');
        break;
      case 'rust':
        suggestions.push('cargo build', 'cargo run', 'cargo test', 'cargo check');
        break;
      default:
        suggestions.push('ls', 'pwd', 'git status', 'code .');
    }

    return suggestions;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopWatching();
    this.removeAllListeners();
    this.currentWorkspace = null;
    this.projectInfo = null;
    this.openFiles.clear();
    this.recentCommands = [];
  }
}

export const workspaceService = new WorkspaceService();
