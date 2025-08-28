import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';

interface EditorPaneProps {
  projectId: string | null;
  filePath: string | null;
  onFileChange: (content: string) => void;
}

const getLanguageFromPath = (path: string | null): string => {
  if (!path) return 'plaintext';
  const extension = path.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'cs':
      return 'csharp';
    case 'cpp':
    case 'hpp':
      return 'cpp';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
};

export const EditorPane: React.FC<EditorPaneProps> = ({ projectId, filePath, onFileChange }) => {
  const [code, setCode] = useState('// Select a file to view its content');
  const [language, setLanguage] = useState('plaintext');
  const { theme } = useTheme();

  useEffect(() => {
    if (filePath && projectId) {
      const loadFileContent = async () => {
        try {
          // Note: The backend endpoint for this does not exist yet.
          const response = await axios.get(`http://127.0.0.1:8000/files/content/${projectId}/${filePath}`);
          setCode(response.data.content);
          setLanguage(getLanguageFromPath(filePath));
        } catch (error) {
          console.error('Error loading file content:', error);
          setCode(`// Error loading file: ${filePath}`);
        }
      };
      loadFileContent();
    } else {
      setCode('// Select a file to view its content');
      setLanguage('plaintext');
    }
  }, [filePath, projectId]);

  const handleEditorChange = (value: string | undefined) => {
    const content = value || '';
    setCode(content);
    onFileChange(content);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-2 border-b border-white/10 flex justify-between items-center">
        <span className="text-sm font-mono text-gray-400">{filePath || 'No file selected'}</span>
        {/* Placeholder for future actions */}
      </div>
      <div className="flex-grow">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};
