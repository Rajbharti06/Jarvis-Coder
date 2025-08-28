import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Define the structure of a file or directory node
interface FileNodeData {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

// Props for the DirectoryNode component
interface DirectoryNodeProps {
  node: FileNodeData;
  projectId: string;
  onFileSelect: (filePath: string) => void;
  activeFile: string | null;
  level: number;
}

const DirectoryNode: React.FC<DirectoryNodeProps> = ({ node, projectId, onFileSelect, activeFile, level }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileNodeData[]>([]);

  const handleToggle = async () => {
    if (!isOpen) {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/files/list/${projectId}/${node.path}`);
        setChildren(response.data);
      } catch (error) {
        console.error('Failed to load directory contents:', error);
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full p-2 text-left flex items-center rounded-lg hover:bg-white/10 text-gray-400"
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          {/* Chevron Icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>
        </span>
        <span className="ml-2">{node.name}</span>
      </button>
      {isOpen && (
        <div className="border-l border-gray-700 ml-4">
          {children.map(childNode => (
            <Node key={childNode.path} node={childNode} projectId={projectId} onFileSelect={onFileSelect} activeFile={activeFile} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// Props for the FileNode component
interface FileNodeProps {
    node: FileNodeData;
    onFileSelect: (filePath: string) => void;
    activeFile: string | null;
    level: number;
}

const FileNode: React.FC<FileNodeProps> = ({ node, onFileSelect, activeFile, level }) => {
    return (
        <button
            onClick={() => onFileSelect(node.path)}
            className={`w-full p-2 text-left rounded-lg transition-colors text-sm ${
                activeFile === node.path
                ? 'bg-blue-600 text-white'
                : 'hover:bg-white/10 text-gray-300'
            }`}
            style={{ paddingLeft: `${level * 1.5}rem` }}
        >
            {node.name}
        </button>
    )
}

// A generic Node component that decides whether to render a File or Directory
const Node: React.FC<DirectoryNodeProps> = (props) => {
    if (props.node.type === 'directory') {
        return <DirectoryNode {...props} />
    }
    return <FileNode {...props} />
}

// Props for the main FileTree component
interface FileTreeProps {
  projectId: string;
  onFileSelect: (filePath: string) => void;
  activeFile: string | null;
}

const FileTree: React.FC<FileTreeProps> = ({ projectId, onFileSelect, activeFile }) => {
  const [rootNodes, setRootNodes] = useState<FileNodeData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      const fetchRootFiles = async () => {
        try {
          const response = await axios.get(`http://127.0.0.1:8000/files/list/${projectId}`);
          setRootNodes(response.data);
          setError(null);
        } catch (err) {
          setError('Failed to load file tree.');
          console.error(err);
        }
      };
      fetchRootFiles();
    }
  }, [projectId]);

  if (error) {
    return <div className="p-2 text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {rootNodes.map((node) => (
        <Node key={node.path} node={node} projectId={projectId} onFileSelect={onFileSelect} activeFile={activeFile} level={1} />
      ))}
    </div>
  );
};

export default FileTree;
