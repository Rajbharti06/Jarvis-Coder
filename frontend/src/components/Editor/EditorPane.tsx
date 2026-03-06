import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor, { useMonaco } from '@monaco-editor/react';
import { 
  XMarkIcon, 
  DocumentIcon, 
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../stores/appStore';
import { useTheme } from '../../hooks/useTheme';
import { getFileLanguage, apiClient } from '../../utils/api';
import { aiService } from '../../services/aiService';

interface EditorPaneProps {
  className?: string;
}

/**
 * EditorPane component with Monaco Editor integration and tab support
 * Features:
 * - Multiple file tabs with close functionality
 * - Syntax highlighting based on file extension
 * - Auto-save functionality
 * - Glassmorphic design
 * - Keyboard shortcuts
 */
export const EditorPane: React.FC<EditorPaneProps> = ({ className = '' }) => {
  const {
    editorTabs,
    activeTabId,
    setActiveTab,
    closeTab,
    updateTabContent,
    addToast,
    currentProject
  } = useAppStore();

  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const completionProviderRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const changeBufferRef = useRef<{ ts: number } | null>(null);

  const activeTab = editorTabs.find(tab => tab.id === activeTabId);

  // Save file function using store state to avoid stale closures
  const saveFile = async () => {
    const state = useAppStore.getState();
    const currentTabId = state.activeTabId;
    const tab = state.editorTabs.find(t => t.id === currentTabId);
    const project = state.currentProject;

    if (!tab || !project) return;

    try {
      addToast({
        id: Date.now().toString(),
        type: 'info',
        message: `Saving ${tab.name}...`,
        duration: 1000
      });

      const response = await apiClient.saveFileContent(project.id, tab.fileId, tab.content);
      
      if (response.success) {
        addToast({
          id: Date.now().toString(),
          type: 'success',
          message: `Saved ${tab.name}`,
          duration: 2000
        });
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (error) {
      addToast({
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to save ${tab.name}`,
        duration: 3000
      });
    }
  };

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    
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

    // Define custom themes
    monaco.editor.defineTheme('jarvis-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
      ],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#E6EDF3',
        'editorLineNumber.foreground': '#7D8590',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorCursor.foreground': '#FFFFFF',
      }
    });

    monaco.editor.defineTheme('jarvis-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267F99' },
        { token: 'function', foreground: '795E26' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#237893',
        'editor.selectionBackground': '#ADD6FF',
        'editor.inactiveSelectionBackground': '#E5EBF1',
        'editorCursor.foreground': '#000000',
      }
    });

    // Set theme
    monaco.editor.setTheme(theme === 'dark' ? 'jarvis-dark' : 'jarvis-light');
    
    // Register AI Completion Provider
    // Dispose previous if exists
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }

    // Helper to register for multiple languages
    const registerAI = (lang: string) => {
      return monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: async (model: any, position: any) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          });

          // Only trigger if line is not empty
          if (!textUntilPosition.trim()) return { suggestions: [] };

          try {
            const suggestions = await aiService.getCodeSuggestions(
              textUntilPosition, 
              lang, 
              'completion'
            );
            
            return {
              suggestions: suggestions.map((s: string) => ({
                label: s,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: s,
                detail: 'AI Suggestion',
                range: {
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endColumn: position.column
                }
              }))
            };
          } catch (e) {
            return { suggestions: [] };
          }
        }
      });
    };

    // Register for common languages
    const disposables = [
      registerAI('typescript'),
      registerAI('javascript'),
      registerAI('python'),
      registerAI('html'),
      registerAI('css'),
      registerAI('json')
    ];
    
    // Store composite disposable
    completionProviderRef.current = {
      dispose: () => disposables.forEach(d => d.dispose())
    };

    // Add keyboard shortcuts
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        saveFile();
      }
    );

    // Add format document shortcut
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => {
        editor.getAction('editor.action.formatDocument')?.run();
      }
    );

    // Add close tab shortcut
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW,
      () => {
        const state = useAppStore.getState();
        if (state.activeTabId) {
          closeTab(state.activeTabId);
        }
      }
    );
  }, [theme, closeTab]); // Removed activeTab dependency to prevent re-registration loops

  // Handle editor content change
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (activeTab && value !== undefined) {
      updateTabContent(activeTab.id, value);
      // Broadcast collaborative file change events (debounced)
      const now = Date.now();
      if (!changeBufferRef.current || now - changeBufferRef.current.ts > 300) {
        changeBufferRef.current = { ts: now };
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && currentProject) {
          ws.send(JSON.stringify({
            type: 'file_change',
            payload: {
              project_id: currentProject.id,
              file_id: activeTab.fileId,
              tab_id: activeTab.id,
              timestamp: new Date().toISOString()
            }
          }));
        }
      }
    }
  }, [activeTab, updateTabContent]);

  // Setup WebSocket for collaboration
  useEffect(() => {
    const ws = apiClient.createWebSocket(
      (data) => {
        if (data?.type === 'presence') {
          // Optionally show presence updates via toast
          addToast({
            id: Date.now().toString(),
            type: 'info',
            message: `Collaborators online: ${data.payload?.connections ?? 1}`,
            duration: 1000
          });
        }
      },
      (err) => {
        console.error('WS error', err);
      }
    );
    wsRef.current = ws;
    return () => {
      try {
        ws.close();
      } catch {}
      wsRef.current = null;
    };
  }, [addToast]);

  // Handle tab close
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
  };


  // Scroll tabs container
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = tabsContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      tabsContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconClass = "w-4 h-4";
    
    switch (ext) {
      case 'js':
      case 'jsx':
        return <span className={`${iconClass} text-yellow-400`}>JS</span>;
      case 'ts':
      case 'tsx':
        return <span className={`${iconClass} text-blue-400`}>TS</span>;
      case 'py':
        return <span className={`${iconClass} text-green-400`}>PY</span>;
      case 'html':
        return <span className={`${iconClass} text-orange-400`}>HTML</span>;
      case 'css':
        return <span className={`${iconClass} text-blue-300`}>CSS</span>;
      case 'json':
        return <span className={`${iconClass} text-yellow-300`}>JSON</span>;
      default:
        return <DocumentIcon className={`${iconClass} text-white/60`} />;
    }
  };

  return (
    <div className={`flex flex-col h-full glass-panel ${className}`}>
      {/* Tab Bar */}
      <div className="flex-shrink-0 border-b border-white/10">
        <div className="flex items-center">
          {/* Scroll Left Button */}
          {editorTabs.length > 0 && (
            <button
              onClick={() => scrollTabs('left')}
              className="flex-shrink-0 p-2 text-white/60 hover:text-white/80 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}

          {/* Tabs Container */}
          <div 
            ref={tabsContainerRef}
            className="flex-1 flex overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <AnimatePresence>
              {editorTabs.map((tab) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`
                    flex-shrink-0 flex items-center space-x-2 px-4 py-3 border-r border-white/10 
                    cursor-pointer transition-all duration-200 min-w-[120px] max-w-[200px]
                    ${tab.id === activeTabId 
                      ? 'bg-white/10 text-white border-b-2 border-blue-400' 
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                    }
                  `}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {getFileIcon(tab.name)}
                  <span className="text-sm font-mono truncate flex-1">
                    {tab.name}
                  </span>
                  {tab.isDirty && (
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  )}
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Scroll Right Button */}
          {editorTabs.length > 0 && (
            <button
              onClick={() => scrollTabs('right')}
              className="flex-shrink-0 p-2 text-white/60 hover:text-white/80 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}

          {/* New Tab Button */}
          <button
            onClick={() => {
              // This would open a file picker or create new file dialog
              addToast({
                id: Date.now().toString(),
                type: 'info',
                message: 'File picker coming soon!',
                duration: 2000
              });
            }}
            className="flex-shrink-0 p-2 text-white/60 hover:text-white/80 transition-colors border-l border-white/10"
            title="New file"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative">
        {activeTab ? (
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            <Editor
              height="100%"
              language={getFileLanguage(activeTab.name)}
              value={activeTab.content}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                minimap: { enabled: true },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                glyphMargin: true,
                lineNumbersMinChars: 3,
                folding: true,
                renderIndicators: true,
                colorDecorators: true,
                contextmenu: true,
                mouseWheelZoom: true,
                suggestOnTriggerCharacters: true,
                hover: { enabled: true, delay: 300 },
                formatOnPaste: true,
                formatOnType: true,
                autoIndent: 'full',
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true
                },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderWhitespace: 'selection',
                showFoldingControls: 'always',
                foldingHighlight: true,
                unfoldOnClickAfterEndOfLine: true,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12
                }
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-full"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 glass-card rounded-full flex items-center justify-center">
                <DocumentIcon className="w-8 h-8 text-white/60" />
              </div>
              <h3 className="text-lg font-medium text-white/80 mb-2">
                No File Open
              </h3>
              <p className="text-white/60 max-w-md">
                Open a file from the sidebar or create a new file to start coding.
              </p>
              <button
                onClick={() => {
                  addToast({
                    id: Date.now().toString(),
                    type: 'info',
                    message: 'File picker coming soon!',
                    duration: 2000
                  });
                }}
                className="mt-4 glass-button px-4 py-2 text-white/80 hover:text-white"
              >
                Open File
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Status Bar */}
      {activeTab && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60"
        >
          <div className="flex items-center space-x-4">
            <span>{getFileLanguage(activeTab.name).toUpperCase()}</span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Ln 1, Col 1</span>
            <span>Spaces: 2</span>
            <span className="text-white/40">Ctrl+S to save</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
