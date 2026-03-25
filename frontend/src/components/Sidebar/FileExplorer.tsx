import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../../hooks/useStore';
import { FileCode, Folder, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

const FileTreeItem: React.FC<{ item: FileItem; depth: number; onFileClick: (file: FileItem) => void }> = React.memo(({ item, depth, onFileClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDirectory = item.type === 'directory';

  return (
    <div key={item.path}>
      <div 
        className={`flex items-center py-1 px-2 hover:bg-[#37373d] cursor-pointer select-none text-sm text-gray-300 transition-colors`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => isDirectory ? setIsOpen(!isOpen) : onFileClick(item)}
      >
        <span className="w-4 mr-1">
          {isDirectory && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </span>
        <span className="mr-2">
          {isDirectory ? <Folder size={14} className="text-blue-400" /> : <FileCode size={14} className="text-gray-400" />}
        </span>
        <span className="truncate">{item.name}</span>
      </div>
      {isDirectory && isOpen && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeItem key={child.path} item={child} depth={depth + 1} onFileClick={onFileClick} />
          ))}
        </div>
      )}
    </div>
  );
});

FileTreeItem.displayName = 'FileTreeItem';

export const FileExplorer: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { addOpenFile } = useStore();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/files/list');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileClick = async (file: FileItem) => {
    if (file.type === 'file') {
      try {
        const response = await axios.get(`http://localhost:8000/api/files/read?path=${encodeURIComponent(file.path)}`);
        addOpenFile({
          id: file.path,
          name: file.name,
          path: file.path,
          content: response.data.content,
          language: getLanguage(file.name)
        });
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown'
    };
    return map[ext || ''] || 'text';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#252526]">
      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center border-b border-[#3e3e42]">
        <span>Explorer</span>
        <button 
          onClick={fetchFiles} 
          className="hover:text-gray-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto mt-1 custom-scrollbar">
        {files.length === 0 && !loading && (
          <div className="p-4 text-xs text-gray-500 text-center">No files found</div>
        )}
        {files.map(file => (
          <FileTreeItem key={file.path} item={file} depth={0} onFileClick={handleFileClick} />
        ))}
      </div>
    </div>
  );
};
