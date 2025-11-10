import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Define the structure of a file or directory node
interface FileNodeData {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

// Props for any node
interface NodeProps {
  node: FileNodeData;
  projectId: string;
  onFileSelect: (filePath: string) => void;
  activeFile: string | null;
  level: number;
  refresh: () => void;
}

const DirectoryNode: React.FC<NodeProps> = ({ node, projectId, onFileSelect, activeFile, level, refresh }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileNodeData[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const fetchChildren = useCallback(async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/files/list/${projectId}/${node.path}`);
      setChildren(response.data);
    } catch (error) {
      console.error('Failed to load directory contents:', error);
      toast.error('Could not load directory.');
    }
  }, [projectId, node.path]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchChildren();
    }
    setIsOpen(!isOpen);
  };

  const handleCreateFile = async () => {
    const fileName = prompt('Enter new file name:');
    if (fileName) {
      try {
        await axios.post(`http://127.0.0.1:8000/files/create_file/${projectId}/${node.path}`, { name: fileName });
        toast.success(`File ${fileName} created.`);
        fetchChildren(); // Refresh children
      } catch (error) {
        toast.error('Failed to create file.');
      }
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter new folder name:');
    if (folderName) {
      try {
        await axios.post(`http://127.0.0.1:8000/files/create_folder/${projectId}/${node.path}`, { name: folderName });
        toast.success(`Folder ${folderName} created.`);
        fetchChildren(); // Refresh children
      } catch (error) {
        toast.error('Failed to create folder.');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${node.name}?`)) {
        try {
            await axios.delete(`http://127.0.0.1:8000/files/delete_folder/${projectId}/${node.path}`);
            toast.success(`Deleted ${node.name}`);
            refresh(); // Refresh parent
        } catch (error) {
            toast.error('Failed to delete folder.');
        }
    }
  }

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="w-full p-2 text-left flex items-center rounded-lg hover:bg-white/10 text-gray-400">
        <button onClick={handleToggle} className="flex items-center flex-grow">
            <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>
            </span>
            <span className="ml-2">{node.name}</span>
        </button>
        {isHovered && (
            <div className="flex-shrink-0 flex items-center space-x-1">
                <button onClick={handleCreateFile} title="New File">📄</button>
                <button onClick={handleCreateFolder} title="New Folder">📁</button>
                <button onClick={handleDelete} title="Delete">🗑️</button>
            </div>
        )}
      </div>
      {isOpen && (
        <div className="border-l border-gray-700 ml-4">
          {children.map(childNode => (
            <Node key={childNode.path} node={childNode} projectId={projectId} onFileSelect={onFileSelect} activeFile={activeFile} level={level + 1} refresh={fetchChildren} />
          ))}
        </div>
      )}
    </div>
  );
};

const FileNode: React.FC<NodeProps> = ({ node, onFileSelect, activeFile, level, refresh }) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete ${node.name}?`)) {
            try {
                await axios.delete(`http://127.0.0.1:8000/files/delete_file/${projectId}/${node.path}`);
                toast.success(`Deleted ${node.name}`);
                refresh();
            } catch (error) {
                toast.error('Failed to delete file.');
            }
        }
    }

    return (
        <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="flex items-center rounded-lg hover:bg-white/10">
            <button
                onClick={() => onFileSelect(node.path)}
                className={`flex-grow p-2 text-left transition-colors text-sm ${
                    activeFile === node.path ? 'bg-blue-600 text-white' : 'text-gray-300'
                }`}
                style={{ paddingLeft: `${level * 1.5}rem` }}
            >
                {node.name}
            </button>
            {isHovered && (
                <div className="flex-shrink-0 pr-2">
                    <button onClick={handleDelete} title="Delete">🗑️</button>
                </div>
            )}
        </div>
    )
}

const Node: React.FC<NodeProps> = (props) => {
    return props.node.type === 'directory' ? <DirectoryNode {...props} /> : <FileNode {...props} />;
}

interface FileTreeProps {
  projectId: string;
  onFileSelect: (filePath: string) => void;
  activeFile: string | null;
}

const FileTree: React.FC<FileTreeProps> = ({ projectId, onFileSelect, activeFile }) => {
  const [rootNodes, setRootNodes] = useState<FileNodeData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchRootFiles = useCallback(async () => {
    if (projectId) {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/files/list/${projectId}`);
        setRootNodes(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load file tree.');
        console.error(err);
      }
    }
  }, [projectId]);

  useEffect(() => {
    fetchRootFiles();
  }, [fetchRootFiles]);

  if (error) {
    return <div className="p-2 text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {rootNodes.map((node) => (
        <Node key={node.path} node={node} projectId={projectId} onFileSelect={onFileSelect} activeFile={activeFile} level={1} refresh={fetchRootFiles} />
      ))}
    </div>
  );
};

export default FileTree;
