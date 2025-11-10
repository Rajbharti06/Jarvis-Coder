import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import { useTheme } from '../../hooks/useTheme';
import { useAppStore } from '../../stores/appStore';
import { getFileLanguage } from '../../utils/api';
import { AIModelSelector } from './AIModelSelector';
import { CodeSuggestionPanel } from './CodeSuggestionPanel';
import CommandPalette from '../CommandPalette/CommandPalette';
import { 
  LightBulbIcon, 
  CodeBracketIcon, 
  CpuChipIcon, 
  CloudIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

interface WarpEditorProps {
  className?: string;
  projectId?: string | null;
  filePath?: string | null;
  onFileChange?: (content: string) => void;
}

/**
 * WarpEditor - AI-powered code editor with dual-mode functionality
 * Features:
 * - Local LLM processing for offline code assistance
 * - Cloud API integration (ChatGPT, Gemini, Perplexity)
 * - Intelligent code completion
 * - Context-aware suggestions
 * - Terminal integration
 * - Advanced keyboard shortcuts
 */
export const WarpEditor: React.FC<WarpEditorProps> = ({ 
  className = '', 
  projectId = null, 
  filePath = null, 
  onFileChange 
}) => {
  const {
    editorTabs,
    activeTabId,
    setActiveTab,
    closeTab,
    updateTabContent,
    addToast
  } = useAppStore();
  
  const { theme } = useTheme();
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [aiMode, setAIMode] = useState<'local' | 'cloud'>('local');
  const [selectedModel, setSelectedModel] = useState('local-codellama');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  const activeTab = editorTabs.find(tab => tab.id === activeTabId);

  // Handle editor mount
  const handleEditorDidMount = (editor: monacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Configure editor with advanced options
    editor.updateOptions({
      formatOnPaste: true,
      formatOnType: true,
      autoIndent: 'full',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      parameterHints: { enabled: true },
      hover: { enabled: true },
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      unfoldOnClickAfterEndOfLine: true,
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: true,
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
    });
    
    // Set up AI-powered code completion
    setupAICodeCompletion(editor, monaco);
  };
  
  // Set up AI-powered code completion
  const setupAICodeCompletion = (editor: monacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    // Add custom completion provider
    monaco.languages.registerCompletionItemProvider('*', {
      provideCompletionItems: async (model, position) => {
        if (!isAIEnabled) return { suggestions: [] };

        const code = model.getValue();
        const filename = activeTab?.title || filePath || 'unknown.txt';
        const language = getFileLanguage(filename);

        try {
          const aiSuggestions = await (await import('../../services/aiService')).aiService.getCodeSuggestions(
            code,
            language,
            'completion'
          );

          const items = aiSuggestions.map((s) => ({
            label: `AI: ${s}`,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s,
            detail: 'AI code suggestion',
            documentation: s,
          }));

          return { suggestions: items };
        } catch (e) {
          console.error('AI completion failed', e);
          return { suggestions: [] };
        }
      }
    });
    
    // Add keyboard shortcut for AI suggestions
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space, () => {
      toggleSuggestionPanel();
    });
    
    // Add keyboard shortcut for command palette
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      // Command palette functionality
      console.log('Command palette shortcut triggered');
    });
  };
  
  // Toggle AI suggestion panel
  const toggleSuggestionPanel = () => {
    if (showSuggestions) {
      setShowSuggestions(false);
    } else {
      const run = async () => {
        try {
          const model = editorRef.current?.getModel();
          const code = model?.getValue() || '';
          const filename = activeTab?.title || filePath || 'unknown.txt';
          const language = getFileLanguage(filename);
          const aiSvc = (await import('../../services/aiService')).aiService;
          const sugg = await aiSvc.getCodeSuggestions(code, language, 'panel');
          setSuggestions(sugg);
        } catch (e) {
          console.error('Failed to fetch suggestions', e);
          setSuggestions([
            'Add error handling',
            'Refactor long functions',
            'Write unit tests',
          ]);
        } finally {
          setShowSuggestions(true);
        }
      };
      run();
    }
  };
  
  // Handle content change
  const handleContentChange = (value: string | undefined) => {
    if (activeTabId && value !== undefined) {
      updateTabContent(activeTabId, value);
      
      // Call the onFileChange callback if provided
      if (onFileChange) {
        onFileChange(value);
      }
    }
  };
  
  // Toggle AI mode between local and cloud
  const toggleAIMode = () => {
    const newMode = aiMode === 'local' ? 'cloud' : 'local';
    setAIMode(newMode);
    
    // Update selected model based on mode
    if (newMode === 'local') {
      setSelectedModel('local-codellama');
      addToast({
        title: 'Switched to Local AI Mode',
        message: 'Using offline LLM models for code assistance',
        type: 'info'
      });
    } else {
      setSelectedModel('gpt-4');
      addToast({
        title: 'Switched to Cloud AI Mode',
        message: 'Using cloud APIs for enhanced capabilities',
        type: 'info'
      });
    }
  };
  
  // Handle model selection
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    
    // Update AI mode based on model
    if (modelId.startsWith('local-')) {
      setAIMode('local');
    } else {
      setAIMode('cloud');
    }
    
    addToast({
      title: 'AI Model Changed',
      message: `Now using ${modelId} for code assistance`,
      type: 'info'
    });
  };
  
  return (
    <div className={`flex flex-col h-full w-full ${className}`}>
      {/* Editor toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAIEnabled(!isAIEnabled)}
            className={`p-1.5 rounded-md ${isAIEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
            title={isAIEnabled ? 'Disable AI features' : 'Enable AI features'}
          >
            <LightBulbIcon className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={toggleAIMode}
            className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600"
            title={`Switch to ${aiMode === 'local' ? 'cloud' : 'local'} AI mode`}
          >
            {aiMode === 'local' ? (
              <CpuChipIcon className="w-5 h-5 text-white" />
            ) : (
              <CloudIcon className="w-5 h-5 text-white" />
            )}
          </button>
          
          <AIModelSelector
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            mode={aiMode}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleSuggestionPanel}
            className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600"
            title="Get AI suggestions"
          >
            <CodeBracketIcon className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={() => console.log('Command palette clicked')}
            className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600"
            title="Open command palette (Ctrl+P)"
          >
            <CommandLineIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Main editor area with AI suggestion panel */}
      <div className="relative flex-grow">
        <Editor
          height="100%"
          language={activeTab ? getFileLanguage(activeTab.path) : 'javascript'}
          value={activeTab?.content || ''}
          theme={theme === 'dark' ? 'jarvis-dark' : 'jarvis-light'}
          onChange={handleContentChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: !activeTab,
            fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
            fontSize: 14,
            lineHeight: 1.5,
            wordWrap: 'on',
          }}
        />
        
        {/* AI Suggestion Panel */}
        {showSuggestions && (
          <CodeSuggestionPanel
            suggestions={suggestions}
            onClose={() => setShowSuggestions(false)}
            onSelectSuggestion={(suggestion) => {
              // Handle suggestion selection
              console.log('Selected suggestion:', suggestion);
              setShowSuggestions(false);
              
              // Mock implementation - will be replaced with actual AI integration
              if (editorRef.current && activeTab) {
                const position = editorRef.current.getPosition();
                if (position) {
                  const mockGeneratedCode = `\n// AI-generated code for: ${suggestion}\n// Implementation will be added here\n`;
                  editorRef.current.executeEdits('ai-suggestion', [{
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column
                    },
                    text: mockGeneratedCode
                  }]);
                }
              }
            }}
          />
        )}
      </div>
      
      {/* Command Palette will be implemented later */}
    </div>
  );
};

export default WarpEditor;