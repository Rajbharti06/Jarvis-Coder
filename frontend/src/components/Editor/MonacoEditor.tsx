import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, X, Copy, Save, Settings } from 'lucide-react';

interface MonacoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  filePath?: string;
  initialContent?: string;
  language?: string;
  onSave?: (content: string) => void;
  aiSuggestions?: boolean;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  isOpen,
  onClose,
  filePath,
  initialContent = '',
  language = 'javascript',
  onSave,
  aiSuggestions = true
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current && !editorRef.current) {
      // Configure Monaco editor
      monaco.editor.defineTheme('jarvis-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'keyword', foreground: '569CD6' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'function', foreground: 'DCDCAA' },
          { token: 'variable', foreground: '9CDCFE' },
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editor.lineHighlightBackground': '#2d2d2d',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41',
          'editorCursor.foreground': '#d4d4d4',
          'editorWhitespace.foreground': '#404040',
        }
      });

      monaco.editor.defineTheme('jarvis-light', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '008000', fontStyle: 'italic' },
          { token: 'keyword', foreground: '0000ff' },
          { token: 'string', foreground: 'a31515' },
          { token: 'number', foreground: '098658' },
          { token: 'function', foreground: '795e26' },
          { token: 'variable', foreground: '001080' },
        ],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#000000',
          'editor.lineHighlightBackground': '#f5f5f5',
          'editor.selectionBackground': '#add6ff',
          'editor.inactiveSelectionBackground': '#e5ebf1',
          'editorCursor.foreground': '#000000',
          'editorWhitespace.foreground': '#d3d3d3',
        }
      });

      editorRef.current = monaco.editor.create(containerRef.current, {
        value: content,
        language: language,
        theme: 'jarvis-dark',
        fontSize: 14,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: aiSuggestions,
        quickSuggestions: aiSuggestions,
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoIndent: 'full',
        tabSize: 2,
        insertSpaces: true,
        folding: true,
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        selectOnLineNumbers: true,
        selectionHighlight: true,
        bracketPairColorization: { enabled: true },
      });

      // AI-powered code completion
      if (aiSuggestions) {
        monaco.languages.registerCompletionItemProvider(language, {
          provideCompletionItems: (model, position) => {
            const textUntilPosition = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            });

            // Simple AI suggestions based on context
            const suggestions = [
              {
                label: 'console.log',
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'console.log(${1:message});',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Log a message to the console'
              },
              {
                label: 'function',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'function ${1:name}(${2:params}) {\n\t${3:// body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Create a new function'
              },
              {
                label: 'if',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'if (${1:condition}) {\n\t${2:// body}\n}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'If statement'
              }
            ];

            return { suggestions };
          }
        });
      }

      // Handle content changes
      editorRef.current.onDidChangeModelContent(() => {
        if (editorRef.current) {
          const newContent = editorRef.current.getValue();
          setContent(newContent);
        }
      });

      // Handle save (Ctrl+S)
      editorRef.current.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          if (onSave && editorRef.current) {
            onSave(editorRef.current.getValue());
          }
        }
      );

      // Handle format (Shift+Alt+F)
      editorRef.current.addCommand(
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
        () => {
          if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument')?.run();
          }
        }
      );
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [isOpen, language, aiSuggestions]);

  const handleSave = () => {
    if (onSave && editorRef.current) {
      onSave(editorRef.current.getValue());
    }
  };

  const handleCopy = () => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection) {
        const selectedText = editorRef.current.getModel()?.getValueInRange(selection);
        if (selectedText) {
          navigator.clipboard.writeText(selectedText);
        }
      }
    }
  };

  const toggleTheme = () => {
    if (editorRef.current) {
      const currentTheme = editorRef.current.getModel()?.getModeId();
      const newTheme = currentTheme === 'jarvis-dark' ? 'jarvis-light' : 'jarvis-dark';
      monaco.editor.setTheme(newTheme);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
        isMaximized ? '' : 'p-8'
      }`}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`glass-panel rounded-xl overflow-hidden ${
          isMaximized ? 'w-full h-full' : 'w-full max-w-6xl h-[80vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white border-opacity-10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-white font-medium ml-2">
              {filePath || 'Untitled'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Toggle Theme"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Copy Selection"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Save (Ctrl+S)"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title={isMaximized ? 'Minimize' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div ref={containerRef} className="flex-1 h-full" />

        {/* Status Bar */}
        <div className="flex items-center justify-between p-2 bg-black bg-opacity-20 text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>{language}</span>
            <span>UTF-8</span>
            <span>{content.split('\n').length} lines</span>
          </div>
          <div className="flex items-center gap-2">
            {aiSuggestions && (
              <span className="text-green-400">AI Suggestions On</span>
            )}
            <span>Spaces: 2</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MonacoEditor;