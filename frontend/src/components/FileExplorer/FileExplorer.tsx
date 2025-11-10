import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderIcon,
  FolderOpenIcon,
  DocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  PhotoIcon,
  MusicalNoteIcon,
  FilmIcon,
  ArchiveBoxIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface FileExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect?: (filePath: string) => void;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileNode[];
  isExpanded?: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ isOpen, onClose, onFileSelect }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFiles, setFilteredFiles] = useState<FileNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchFileTree();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      searchFiles(searchQuery);
    } else {
      setIsSearching(false);
      setFilteredFiles([]);
    }
  }, [searchQuery, fileTree]);

  const fetchFileTree = async () => {
    try {
      const response = await fetch('/api/files/tree');
      if (response.ok) {
        const data = await response.json();
        setFileTree(data);
      }
    } catch (error) {
      console.error('Failed to fetch file tree:', error);
    }
  };

  const searchFiles = (query: string) => {
    const results: FileNode[] = [];
    const searchRecursive = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          results.push(node);
        }
        if (node.children) {
          searchRecursive(node.children);
        }
      });
    };
    searchRecursive(fileTree);
    setFilteredFiles(results);
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file.path);
      onFileSelect?.(file.path);
    } else {
      toggleFolder(file.path);
    }
  };

  const getFileIcon = (fileName: string, isDirectory: boolean) => {
    if (isDirectory) {
      return expandedFolders.has(fileName) ? FolderOpenIcon : FolderIcon;
    }

    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
      case 'swift':
      case 'kt':
        return CodeBracketIcon;
      case 'md':
      case 'txt':
      case 'rtf':
        return DocumentTextIcon;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return PhotoIcon;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
        return MusicalNoteIcon;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return FilmIcon;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
        return ArchiveBoxIcon;
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
      case 'toml':
        return CogIcon;
      default:
        return DocumentIcon;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const Icon = getFileIcon(node.name, node.type === 'directory');
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;

    return (
      <div key={node.path}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`flex items-center px-2 py-1 rounded-lg cursor-pointer transition-colors group ${
            isSelected
              ? 'bg-blue-600/20 text-blue-400'
              : 'hover:bg-gray-700/50 text-gray-300'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFileClick(node)}
        >
          {node.type === 'directory' && (
            <div className="mr-1">
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
            </div>
          )}
          
          <Icon className={`w-4 h-4 mr-2 ${
            node.type === 'directory' 
              ? isExpanded ? 'text-blue-400' : 'text-yellow-400'
              : 'text-gray-400'
          }`} />
          
          <span className="flex-1 text-sm truncate">{node.name}</span>
          
          {node.type === 'file' && node.size && (
            <span className="text-xs text-gray-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {formatFileSize(node.size)}
            </span>
          )}
        </motion.div>

        <AnimatePresence>
          {node.type === 'directory' && isExpanded && node.children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children.map(child => renderFileNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderSearchResults = () => (
    <div className="space-y-1">
      {filteredFiles.map(file => {
        const Icon = getFileIcon(file.name, file.type === 'directory');
        const isSelected = selectedFile === file.path;
        
        return (
          <motion.div
            key={file.path}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? 'bg-blue-600/20 text-blue-400'
                : 'hover:bg-gray-700/50 text-gray-300'
            }`}
            onClick={() => handleFileClick(file)}
          >
            <Icon className="w-4 h-4 mr-3 text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{file.name}</div>
              <div className="text-xs text-gray-500 truncate">{file.path}</div>
            </div>
            {file.type === 'file' && file.size && (
              <span className="text-xs text-gray-500 ml-2">
                {formatFileSize(file.size)}
              </span>
            )}
          </motion.div>
        );
      })}
      
      {filteredFiles.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-400">
          <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No files found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, x: -100 }}
            animate={{ scale: 1, opacity: 1, x: 0 }}
            exit={{ scale: 0.9, opacity: 0, x: -100 }}
            className="bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">File Explorer</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2">
              {isSearching ? renderSearchResults() : (
                <div className="space-y-1">
                  {fileTree.map(node => renderFileNode(node))}
                  
                  {fileTree.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <FolderIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No files found</p>
                      <p className="text-sm">The directory appears to be empty</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {selectedFile && (
              <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <div className="text-xs text-gray-400 truncate">
                  Selected: {selectedFile}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FileExplorer;