import { aiService } from './aiService';
import apiService from './apiService';

interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified: number;
  content?: string;
  language?: string;
}

interface CodeStructure {
  functions: Array<{
    name: string;
    line: number;
    parameters: string[];
    returnType?: string;
    documentation?: string;
  }>;
  classes: Array<{
    name: string;
    line: number;
    methods: string[];
    properties: string[];
    documentation?: string;
  }>;
  imports: string[];
  exports: string[];
  dependencies: string[];
}

interface ProjectContext {
  rootPath: string;
  files: FileInfo[];
  structure: {
    directories: string[];
    configFiles: string[];
    sourceFiles: string[];
    testFiles: string[];
    documentation: string[];
  };
  technologies: string[];
  frameworks: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  recentChanges: Array<{
    file: string;
    type: 'added' | 'modified' | 'deleted';
    timestamp: number;
  }>;
}

interface CodeUnderstanding {
  purpose: string;
  complexity: 'low' | 'medium' | 'high';
  patterns: string[];
  potentialIssues: string[];
  suggestions: string[];
  relatedFiles: string[];
}

class ContextAwarenessService {
  private aiService: AIService;
  private contextCache: Map<string, ProjectContext> = new Map();
  private codeAnalysisCache: Map<string, CodeStructure> = new Map();
  private understandingCache: Map<string, CodeUnderstanding> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.aiService = aiService;
  }

  // Analyze entire project structure
  async analyzeProject(rootPath: string): Promise<ProjectContext> {
    try {
      // Check cache first
      const cached = this.contextCache.get(rootPath);
      if (cached && Date.now() - this.getCacheTimestamp(rootPath) < this.CACHE_TTL) {
        return cached;
      }

      // Get project structure from backend
      const projectData = await apiService.getProjectStructure(rootPath);
      
      // Analyze files and structure
      const context: ProjectContext = {
        rootPath,
        files: [],
        structure: {
          directories: [],
          configFiles: [],
          sourceFiles: [],
          testFiles: [],
          documentation: []
        },
        technologies: [],
        frameworks: [],
        dependencies: {},
        devDependencies: {},
        recentChanges: []
      };

      // Categorize files
      for (const file of projectData.files) {
        const fileInfo: FileInfo = {
          path: file.path,
          name: file.name,
          extension: this.getFileExtension(file.name),
          size: file.size,
          lastModified: file.lastModified,
          language: this.detectLanguage(file.name)
        };

        context.files.push(fileInfo);
        this.categorizeFile(fileInfo, context);
      }

      // Detect technologies and frameworks
      context.technologies = this.detectTechnologies(context);
      context.frameworks = this.detectFrameworks(context);

      // Parse package files
      await this.parsePackageFiles(context);

      // Cache the result
      this.contextCache.set(rootPath, context);
      this.setCacheTimestamp(rootPath);

      return context;
    } catch (error) {
      console.error('Failed to analyze project:', error);
      throw error;
    }
  }

  // Analyze individual file structure
  async analyzeFile(filePath: string, content?: string): Promise<CodeStructure> {
    try {
      // Check cache
      const cached = this.codeAnalysisCache.get(filePath);
      if (cached && Date.now() - this.getCacheTimestamp(filePath) < this.CACHE_TTL) {
        return cached;
      }

      // Get file content if not provided
      if (!content) {
        content = await apiService.readFile(filePath);
      }

      const structure = await this.parseCodeStructure(filePath, content);
      
      // Cache the result
      this.codeAnalysisCache.set(filePath, structure);
      this.setCacheTimestamp(filePath);

      return structure;
    } catch (error) {
      console.error('Failed to analyze file:', error);
      throw error;
    }
  }

  // Get AI understanding of code
  async understandCode(filePath: string, content?: string): Promise<CodeUnderstanding> {
    try {
      // Check cache
      const cached = this.understandingCache.get(filePath);
      if (cached && Date.now() - this.getCacheTimestamp(filePath) < this.CACHE_TTL) {
        return cached;
      }

      // Get file content if not provided
      if (!content) {
        content = await apiService.readFile(filePath);
      }

      // Get code structure
      const structure = await this.analyzeFile(filePath, content);

      // Use AI to understand the code
      const understanding = await this.generateCodeUnderstanding(filePath, content, structure);
      
      // Cache the result
      this.understandingCache.set(filePath, understanding);
      this.setCacheTimestamp(filePath);

      return understanding;
    } catch (error) {
      console.error('Failed to understand code:', error);
      throw error;
    }
  }

  // Find related files and dependencies
  async findRelatedFiles(filePath: string, projectContext: ProjectContext): Promise<string[]> {
    try {
      const fileContent = await apiService.readFile(filePath);
      const structure = await this.analyzeFile(filePath, fileContent);
      
      const relatedFiles: string[] = [];
      
      // Find files with similar imports
      for (const importPath of structure.imports) {
        const related = projectContext.files.filter(f => 
          f.path.includes(importPath) || 
          this.normalizePath(f.path).endsWith(this.normalizePath(importPath))
        );
        relatedFiles.push(...related.map(f => f.path));
      }

      // Find files with similar exports
      for (const exportName of structure.exports) {
        const related = projectContext.files.filter(f => {
          if (f.path === filePath) return false;
          // Simple heuristic: check if filename contains export name
          return f.name.toLowerCase().includes(exportName.toLowerCase());
        });
        relatedFiles.push(...related.map(f => f.path));
      }

      // Use AI to find semantically related files
      const aiRelatedFiles = await this.findAIRelatedFiles(filePath, fileContent, projectContext);
      relatedFiles.push(...aiRelatedFiles);

      // Remove duplicates and return
      return [...new Set(relatedFiles)];
    } catch (error) {
      console.error('Failed to find related files:', error);
      return [];
    }
  }

  // Generate code suggestions
  async generateSuggestions(filePath: string, content?: string): Promise<string[]> {
    try {
      if (!content) {
        content = await apiService.readFile(filePath);
      }

      const structure = await this.analyzeFile(filePath, content);
      const understanding = await this.understandCode(filePath, content);

      const prompt = `
        Analyze this code and provide specific improvement suggestions:
        
        File: ${filePath}
        Code: ${content.substring(0, 2000)}
        
        Structure: ${JSON.stringify(structure, null, 2)}
        Understanding: ${JSON.stringify(understanding, null, 2)}
        
        Provide 3-5 specific, actionable suggestions for:
        1. Code quality improvements
        2. Performance optimizations
        3. Security enhancements
        4. Best practices
        
        Format as a JSON array of strings.
      `;

      const response = await this.aiService.sendMessage(prompt, false);
      
      try {
        return JSON.parse(response.content);
      } catch (error) {
        // Fallback to simple parsing
        return response.content.split('\n').filter(line => line.trim()).slice(0, 5);
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return [];
    }
  }

  // Get recent changes in project
  async getRecentChanges(rootPath: string, limit: number = 10): Promise<ProjectContext['recentChanges']> {
    try {
      const context = await this.analyzeProject(rootPath);
      return context.recentChanges.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent changes:', error);
      return [];
    }
  }

  // Search for code patterns
  async searchCode(pattern: string, projectContext: ProjectContext): Promise<Array<{
    file: string;
    line: number;
    context: string;
    relevance: number;
  }>> {
    try {
      const results: any[] = [];
      
      for (const file of projectContext.files) {
        if (this.isCodeFile(file.name)) {
          try {
            const content = await apiService.readFile(file.path);
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.toLowerCase().includes(pattern.toLowerCase())) {
                const context = this.getLineContext(lines, i);
                results.push({
                  file: file.path,
                  line: i + 1,
                  context,
                  relevance: this.calculateRelevance(line, pattern)
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to search file ${file.path}:`, error);
          }
        }
      }
      
      return results.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      console.error('Failed to search code:', error);
      return [];
    }
  }

  // Private helper methods
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private detectLanguage(filename: string): string {
    const ext = this.getFileExtension(filename);
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
      'ps1': 'powershell',
      'sql': 'sql'
    };
    return languageMap[ext] || 'text';
  }

  private categorizeFile(file: FileInfo, context: ProjectContext): void {
    const name = file.name.toLowerCase();
    
    if (name.includes('test') || name.includes('spec')) {
      context.structure.testFiles.push(file.path);
    } else if (name.includes('config') || name.startsWith('.')) {
      context.structure.configFiles.push(file.path);
    } else if (name.includes('readme') || name.includes('doc')) {
      context.structure.documentation.push(file.path);
    } else if (this.isCodeFile(name)) {
      context.structure.sourceFiles.push(file.path);
    }
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs',
      'php', 'rb', 'swift', 'kt', 'scala', 'html', 'css', 'scss', 'json'
    ];
    return codeExtensions.includes(this.getFileExtension(filename));
  }

  private detectTechnologies(context: ProjectContext): string[] {
    const technologies: string[] = [];
    const files = context.files.map(f => f.name.toLowerCase());

    // Package managers
    if (files.includes('package.json')) technologies.push('npm');
    if (files.includes('yarn.lock')) technologies.push('yarn');
    if (files.includes('requirements.txt')) technologies.push('pip');
    if (files.includes('pom.xml')) technologies.push('maven');
    if (files.includes('build.gradle')) technologies.push('gradle');

    // Languages
    if (files.some(f => f.endsWith('.js') || f.endsWith('.ts'))) technologies.push('javascript');
    if (files.some(f => f.endsWith('.py'))) technologies.push('python');
    if (files.some(f => f.endsWith('.java'))) technologies.push('java');
    if (files.some(f => f.endsWith('.go'))) technologies.push('go');
    if (files.some(f => f.endsWith('.rs'))) technologies.push('rust');

    return [...new Set(technologies)];
  }

  private detectFrameworks(context: ProjectContext): string[] {
    const frameworks: string[] = [];
    
    // Check package.json for frameworks
    try {
      const packageJson = context.structure.configFiles.find(f => f.includes('package.json'));
      if (packageJson) {
        // This would need to be implemented to read and parse package.json
      }
    } catch (error) {
      console.warn('Failed to detect frameworks:', error);
    }

    return frameworks;
  }

  private async parsePackageFiles(context: ProjectContext): Promise<void> {
    // Parse package.json, requirements.txt, etc.
    // This would need implementation based on specific package managers
  }

  private async parseCodeStructure(filePath: string, content: string): Promise<CodeStructure> {
    const language = this.detectLanguage(filePath);
    const structure: CodeStructure = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: []
    };

    // Simple parsing based on language
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.parseJavaScript(content);
      case 'python':
        return this.parsePython(content);
      case 'java':
        return this.parseJava(content);
      default:
        return structure;
    }
  }

  private parseJavaScript(content: string): CodeStructure {
    const structure: CodeStructure = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: []
    };

    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Imports
      if (line.startsWith('import ') || line.startsWith('require(')) {
        structure.imports.push(line);
      }
      
      // Exports
      if (line.startsWith('export ') || line.includes('module.exports')) {
        structure.exports.push(line);
      }
      
      // Functions
      const functionMatch = line.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/);
      if (functionMatch) {
        const functionName = functionMatch[1] || functionMatch[2];
        structure.functions.push({
          name: functionName,
          line: i + 1,
          parameters: [],
          documentation: this.getDocumentation(lines, i)
        });
      }
      
      // Classes
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        structure.classes.push({
          name: classMatch[1],
          line: i + 1,
          methods: [],
          properties: [],
          documentation: this.getDocumentation(lines, i)
        });
      }
    }

    return structure;
  }

  private parsePython(content: string): CodeStructure {
    // Similar implementation for Python
    return {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: []
    };
  }

  private parseJava(content: string): CodeStructure {
    // Similar implementation for Java
    return {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: []
    };
  }

  private getDocumentation(lines: string[], lineIndex: number): string {
    let doc = '';
    let i = lineIndex - 1;
    
    while (i >= 0 && (lines[i].trim().startsWith('//') || lines[i].trim().startsWith('*') || lines[i].trim().startsWith('/*'))) {
      doc = lines[i] + '\n' + doc;
      i--;
    }
    
    return doc.trim();
  }

  private async generateCodeUnderstanding(filePath: string, content: string, structure: CodeStructure): Promise<CodeUnderstanding> {
    const prompt = `
      Analyze this code file and provide understanding:
      
      File: ${filePath}
      Code: ${content.substring(0, 1500)}
      Structure: ${JSON.stringify(structure, null, 2)}
      
      Provide analysis in this JSON format:
      {
        "purpose": "Brief description of what this code does",
        "complexity": "low|medium|high",
        "patterns": ["design patterns used"],
        "potentialIssues": ["potential problems or improvements"],
        "suggestions": ["specific improvement suggestions"],
        "relatedFiles": ["related file paths"]
      }
    `;

    try {
      const response = await this.aiService.sendMessage(prompt, false);
      return JSON.parse(response.content);
    } catch (error) {
      console.warn('AI understanding failed, using fallback:', error);
      return {
        purpose: 'Code file for analysis',
        complexity: 'medium',
        patterns: [],
        potentialIssues: [],
        suggestions: [],
        relatedFiles: []
      };
    }
  }

  private async findAIRelatedFiles(filePath: string, content: string, projectContext: ProjectContext): Promise<string[]> {
    const prompt = `
      Based on this file content, identify semantically related files in the project:
      
      Current file: ${filePath}
      Content: ${content.substring(0, 1000)}
      
      Available files: ${projectContext.files.map(f => f.path).join(', ')}
      
      Return only the file paths that are most likely related (max 5 files).
      Format as JSON array of strings.
    `;

    try {
      const response = await this.aiService.sendMessage(prompt, false);
      return JSON.parse(response.content);
    } catch (error) {
      return [];
    }
  }

  private getLineContext(lines: string[], lineIndex: number, contextLines: number = 2): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  private calculateRelevance(line: string, pattern: string): number {
    const lineLower = line.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    let score = 0;
    
    // Exact match
    if (lineLower.includes(patternLower)) {
      score += 10;
    }
    
    // Word boundary match
    const words = patternLower.split(/\s+/);
    for (const word of words) {
      if (lineLower.includes(word)) {
        score += 5;
      }
    }
    
    // Partial match
    for (let i = 0; i < patternLower.length - 3; i++) {
      const substring = patternLower.substring(i, i + 4);
      if (lineLower.includes(substring)) {
        score += 1;
      }
    }
    
    return score;
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').toLowerCase();
  }

  private getCacheTimestamp(key: string): number {
    const timestamp = localStorage.getItem(`cache_timestamp_${key}`);
    return timestamp ? parseInt(timestamp) : 0;
  }

  private setCacheTimestamp(key: string): void {
    localStorage.setItem(`cache_timestamp_${key}`, Date.now().toString());
  }

  // Clear all caches
  clearCache(): void {
    this.contextCache.clear();
    this.codeAnalysisCache.clear();
    this.understandingCache.clear();
    
    // Clear localStorage timestamps
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('cache_timestamp_')) {
        localStorage.removeItem(key);
      }
    }
  }
}

// Create singleton instance
const contextAwarenessService = new ContextAwarenessService();

export default contextAwarenessService;
export type { FileInfo, CodeStructure, ProjectContext, CodeUnderstanding };