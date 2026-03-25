import React, { useEffect, useState, useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useStore } from '../../hooks/useStore';
import axios from 'axios';
import { X, Sparkles, Loader2, Command, FileCode2, Terminal as TerminalIcon, GitBranch, Settings, Combine } from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { TabBar } from './TabBar';

export const EditorPane: React.FC = () => {
  const monaco = useMonaco();
  const { activeFileId, openFiles, updateFileContent, selectedModel } = useStore();
  const activeFile = openFiles.find((f) => f.id === activeFileId);
  const [content, setContent] = useState('');
  const editorRef = useRef<any>(null);
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiInstruction, setAIInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInputPosition, setAIInputPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (activeFile) {
      setContent(activeFile.content);
    } else {
      setContent('');
    }
  }, [activeFileId, activeFile]);

  // Handle AI Inline Generation (Cmd+K)
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.addCommand(monaco?.KeyMod.CtrlCmd | monaco?.KeyCode.KeyK, () => {
        const selection = editorRef.current.getSelection();
        if (selection) {
          const coords = editorRef.current.getScrolledVisiblePosition(selection.getStartPosition());
          const domNode = editorRef.current.getDomNode();
          if (domNode && coords) {
             const rect = domNode.getBoundingClientRect();
             setAIInputPosition({ 
               top: coords.top + rect.top + 30, 
               left: coords.left + rect.left 
             });
             setShowAIInput(true);
          }
        }
      });
    }
  }, [monaco, activeFileId]);

  const handleAIInlineGenerate = async () => {
    if (!aiInstruction.trim() || !editorRef.current || isGenerating) return;
    
    const selection = editorRef.current.getSelection();
    if (!selection || !activeFile) return;

    const selectedText = editorRef.current.getModel().getValueInRange(selection);
    setIsGenerating(true);

    try {
      const response = await axios.post('http://localhost:8000/api/editor/generate-inline', {
        file_path: activeFile.path,
        selection: selectedText,
        instruction: aiInstruction,
        model: selectedModel
      });

      const newCode = response.data.code;
      if (newCode) {
        editorRef.current.executeEdits('ai-inline-gen', [{
          range: selection,
          text: newCode,
          forceMoveMarkers: true
        }]);
      }
      setShowAIInput(false);
      setAIInstruction('');
    } catch (error: any) {
      console.error('Error in inline generation:', error.message || error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Monaco Providers for Hovers and Diagnostics
  useEffect(() => {
    if (monaco) {
      // 1. Hover Provider
      const hoverProvider = monaco.languages.registerHoverProvider('*', {
        provideHover: async (_model: any, position: any) => {
          if (!activeFile) return null;
          try {
            const response = await axios.post('http://localhost:8000/api/editor/hover', {
              file_path: activeFile.path,
              line: position.lineNumber,
              column: position.column,
              model: selectedModel
            });
            return {
              contents: [{ value: response.data.info }]
            };
          } catch (e: any) {
            console.error('Hover error:', e.message || e);
            return null;
          }
        }
      });

      return () => {
        hoverProvider.dispose();
      };
    }
  }, [monaco, activeFileId, selectedModel]);

  // AI Error Analysis on Save/Change (throttled)
  useEffect(() => {
    if (!monaco || !activeFile || !content) return;

    const timer = setTimeout(async () => {
      try {
        const diagnostics = await axios.post('http://localhost:8000/api/editor/analyze', {
          file_path: activeFile.path,
          content: content,
          model: selectedModel
        });

        const markers = diagnostics.data.map((d: any) => ({
          startLineNumber: d.line,
          startColumn: 1,
          endLineNumber: d.line,
          endColumn: 100,
          message: d.message,
          severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning
        }));

        const model = editorRef.current?.getModel();
        if (model) {
          monaco.editor.setModelMarkers(model, 'ai-analysis', markers);
        }
      } catch (e: any) {
        console.error('Analysis error:', e.message || e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, activeFileId, selectedModel, monaco]);

  // Handle Monaco registration for autocomplete
  useEffect(() => {
    if (monaco) {
      const provider = monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: async (model: any, position: any) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          // Fetch suggestion from AI backend
          try {
            const response = await axios.post('http://localhost:8000/api/autocomplete/', {
              prompt: textUntilPosition,
              model: selectedModel,
              max_tokens: 50
            });

            const suggestion = response.data.suggestion;
            if (!suggestion) return { suggestions: [] };

            return {
              suggestions: [
                {
                  label: suggestion,
                  kind: monaco.languages.CompletionItemKind.Text,
                  insertText: suggestion,
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  },
                },
              ],
            };
          } catch (error: any) {
            console.error('Autocomplete error:', error.message || error);
            return { suggestions: [] };
          }
        },
      });

      return () => provider.dispose();
    }
  }, [monaco, selectedModel]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFileId) {
      setContent(value);
      updateFileContent(activeFileId, value);
    }
  };

  const handleSave = async () => {
    if (activeFile) {
      try {
        await axios.post('http://localhost:8000/api/files/save', {
          path: activeFile.path,
          content: content,
        });
        console.log('File saved successfully');
      } catch (error: any) {
        console.error('Error saving file:', error.message || error);
      }
    }
  };

  const handleRun = async () => {
    if (activeFile) {
      // First save the file
      await handleSave();
      
      // Determine run command based on language
      let command = '';
      if (activeFile.language === 'python' || activeFile.path.endsWith('.py')) {
        command = `python ${activeFile.path}`;
      } else if (activeFile.language === 'javascript' || activeFile.path.endsWith('.js')) {
        command = `node ${activeFile.path}`;
      } else {
        alert('Run command not configured for this language');
        return;
      }

      // Trigger command in terminal (this is a simplified implementation)
      // We'll need a way to communicate with the Terminal component.
      // For now, let's just trigger it via API.
      try {
        const response = await axios.post('http://localhost:8000/api/execute/run', {
          command: command
        });
        alert(`Output: \n${response.data.stdout || response.data.stderr}`);
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, content]);

  if (!activeFile && openFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-400 p-8">
        <div className="max-w-2xl w-full flex flex-col items-center justify-center fade-in">
          
          {/* Logo & Header */}
          <div className="relative mb-8 group">
             <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-full" />
             <div className="h-24 w-24 bg-gradient-to-br from-[#2a2d32] to-[#1a1b1e] border border-[#3e3e42] rounded-2xl flex items-center justify-center shadow-2xl relative z-10 mx-auto mb-6">
                <Sparkles size={40} className="text-blue-400" />
             </div>
             <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 tracking-tight text-center relative z-10">
               Jarvis Coder
             </h1>
             <p className="text-sm mt-3 text-center text-gray-500 font-medium">The Intelligent Offline-First Development Environment</p>
          </div>

          {/* Quick Shortcuts Grid */}
          <div className="grid grid-cols-2 gap-4 w-full mt-8 max-w-lg mx-auto">
             <div className="flex items-center gap-4 bg-[#252526] border border-[#3e3e42] p-4 rounded-xl hover:bg-[#2d2d30] hover:border-blue-500/50 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-[#333333] flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <FileCode2 size={20} className="text-blue-400" />
                </div>
                <div>
                   <h3 className="text-sm font-semibold text-gray-200">Open File/Folder</h3>
                   <div className="text-xs text-gray-500 mt-1 flex gap-1">
                      <span className="bg-[#333] px-1.5 py-0.5 rounded shadow-sm border border-[#444]">Ctrl</span> + <span className="bg-[#333] px-1.5 py-0.5 rounded shadow-sm border border-[#444]">O</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 bg-[#252526] border border-[#3e3e42] p-4 rounded-xl hover:bg-[#2d2d30] hover:border-purple-500/50 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-[#333333] flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Command size={20} className="text-purple-400" />
                </div>
                <div>
                   <h3 className="text-sm font-semibold text-gray-200">Command Palette</h3>
                   <div className="text-xs text-gray-500 mt-1 flex gap-1">
                      <span className="bg-[#333] px-1.5 py-0.5 rounded shadow-sm border border-[#444]">Ctrl</span> + <span className="bg-[#333] px-1.5 py-0.5 rounded shadow-sm border border-[#444]">Shift</span> + <span className="bg-[#333] px-1.5 py-0.5 rounded shadow-sm border border-[#444]">P</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 bg-[#252526] border border-[#3e3e42] p-4 rounded-xl hover:bg-[#2d2d30] hover:border-green-500/50 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-[#333333] flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <GitBranch size={20} className="text-green-400" />
                </div>
                <div>
                   <h3 className="text-sm font-semibold text-gray-200">Source Control</h3>
                   <p className="text-xs text-gray-500 mt-1">Manage git branches & commits</p>
                </div>
             </div>

             <div className="flex items-center gap-4 bg-[#252526] border border-[#3e3e42] p-4 rounded-xl hover:bg-[#2d2d30] hover:border-orange-500/50 transition-all cursor-pointer group">
                <div className="h-10 w-10 rounded-lg bg-[#333333] flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Combine size={20} className="text-orange-400" />
                </div>
                <div>
                   <h3 className="text-sm font-semibold text-gray-200">AI Agent Planner</h3>
                   <div className="text-xs text-gray-500 mt-1 flex gap-1">
                      <span className="bg-[#333] px-1.5 py-0.5 rounded shadow-sm border border-[#444]">Ctrl</span> + <span className="bg-[#333] px-1.5 py-0.5 rounded shadow-sm border border-[#444]">L</span>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="mt-12 flex gap-6 text-xs text-gray-600 font-medium">
             <span className="flex items-center gap-1 hover:text-gray-400 cursor-pointer transition-colors"><Settings size={14} /> Settings</span>
             <span className="flex items-center gap-1 hover:text-gray-400 cursor-pointer transition-colors"><TerminalIcon size={14} /> New Terminal</span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1e1e1e] relative">
      <TabBar />
      {activeFile && (
        <>
          <div className="bg-[#252526] px-4 py-2 text-sm text-gray-300 border-b border-[#3e3e42] flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-blue-400 font-mono text-xs">FILE:</span>
              <span className="font-mono text-xs">{activeFile.path}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleRun}
                className="px-2 py-1 hover:bg-[#3e3e42] rounded text-[10px] transition-colors border border-[#3e3e42] hover:border-green-500 font-mono text-green-500 mr-2"
              >
                RUN
              </button>
              <button 
                onClick={handleSave}
                className="px-2 py-1 hover:bg-[#3e3e42] rounded text-[10px] transition-colors border border-[#3e3e42] hover:border-blue-500 font-mono"
              >
                SAVE [CTRL+S]
              </button>
            </div>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              language={activeFile.language || 'typescript'}
              theme="vs-dark"
              value={content}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 10 },
                cursorSmoothCaretAnimation: "on",
                renderLineHighlight: "all",
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              }}
            />
            
            {showAIInput && (
              <div 
                className="absolute z-50 bg-[#252526] border border-blue-500 rounded shadow-2xl p-2 w-80"
                style={{ 
                  top: aiInputPosition.top - (editorRef.current?.getDomNode()?.getBoundingClientRect().top || 0), 
                  left: aiInputPosition.left - (editorRef.current?.getDomNode()?.getBoundingClientRect().left || 0) 
                }}
              >
                <div className="flex items-center mb-2">
                   <Sparkles size={14} className="text-blue-500 mr-2" />
                   <span className="text-[10px] text-gray-400 uppercase font-bold">AI Inline Generation</span>
                   <button onClick={() => setShowAIInput(false)} className="ml-auto text-gray-500 hover:text-white">
                     <X size={12} />
                   </button>
                </div>
                <div className="flex">
                  <input 
                    autoFocus
                    value={aiInstruction}
                    onChange={(e) => setAIInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAIInlineGenerate();
                      if (e.key === 'Escape') setShowAIInput(false);
                    }}
                    placeholder="Refactor this code or generate something..."
                    className="flex-1 bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={handleAIInlineGenerate}
                    disabled={isGenerating}
                    className="ml-2 bg-blue-600 hover:bg-blue-700 rounded px-2 text-xs disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : 'Apply'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <DiffViewer />
        </>
      )}
    </div>
  );
};
