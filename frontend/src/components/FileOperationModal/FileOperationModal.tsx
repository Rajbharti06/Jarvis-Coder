import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  DocumentIcon,
  FolderIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export type FileOperationType = 'create-file' | 'create-folder' | 'rename' | 'delete';

interface FileOperationModalProps {
  isOpen: boolean;
  type: FileOperationType;
  currentPath?: string;
  currentName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const FileOperationModal: React.FC<FileOperationModalProps> = ({
  isOpen,
  type,
  currentPath = '',
  currentName = '',
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(type === 'rename' ? currentName : '');
      setError('');
      // Focus input after modal animation
      setTimeout(() => {
        inputRef.current?.focus();
        if (type === 'rename' && currentName) {
          // Select filename without extension for renaming
          const dotIndex = currentName.lastIndexOf('.');
          if (dotIndex > 0) {
            inputRef.current?.setSelectionRange(0, dotIndex);
          } else {
            inputRef.current?.select();
          }
        }
      }, 100);
    }
  }, [isOpen, type, currentName]);

  const validateInput = (value: string): string => {
    if (!value.trim()) {
      return 'Name cannot be empty';
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(value)) {
      return 'Name contains invalid characters';
    }

    // Check for reserved names (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(value.toUpperCase())) {
      return 'Name is reserved and cannot be used';
    }

    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedValue = inputValue.trim();
    const validationError = validateInput(trimmedValue);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    onConfirm(trimmedValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const getModalConfig = () => {
    switch (type) {
      case 'create-file':
        return {
          title: 'Create New File',
          icon: DocumentIcon,
          placeholder: 'Enter file name (e.g., index.js)',
          confirmText: 'Create File',
          description: currentPath ? `in ${currentPath}` : '',
        };
      case 'create-folder':
        return {
          title: 'Create New Folder',
          icon: FolderIcon,
          placeholder: 'Enter folder name',
          confirmText: 'Create Folder',
          description: currentPath ? `in ${currentPath}` : '',
        };
      case 'rename':
        return {
          title: 'Rename',
          icon: DocumentIcon,
          placeholder: 'Enter new name',
          confirmText: 'Rename',
          description: currentPath ? `in ${currentPath}` : '',
        };
      case 'delete':
        return {
          title: 'Delete',
          icon: ExclamationTriangleIcon,
          placeholder: '',
          confirmText: 'Delete',
          description: `Are you sure you want to delete "${currentName}"?`,
          isDestructive: true,
        };
      default:
        return {
          title: 'File Operation',
          icon: DocumentIcon,
          placeholder: '',
          confirmText: 'Confirm',
          description: '',
        };
    }
  };

  const config = getModalConfig();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <config.icon 
                className={`w-6 h-6 ${
                  config.isDestructive ? 'text-red-400' : 'text-blue-400'
                }`} 
              />
              <h2 className="text-lg font-semibold text-white">
                {config.title}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Description */}
          {config.description && (
            <p className={`text-sm mb-4 ${
              config.isDestructive ? 'text-red-300' : 'text-white/70'
            }`}>
              {config.description}
            </p>
          )}

          {/* Form */}
          {type !== 'delete' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={config.placeholder}
                  className={`
                    w-full px-3 py-2 bg-gray-700/50 border rounded-lg
                    text-white placeholder-white/40 focus:outline-none
                    focus:ring-2 transition-colors
                    ${error 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-600 focus:border-blue-500 focus:ring-blue-500/50'
                    }
                  `}
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm mt-2"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white/80 hover:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || !!error}
                  className={`
                    flex-1 px-4 py-2 rounded-lg font-medium transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${config.isDestructive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  `}
                >
                  {config.confirmText}
                </button>
              </div>
            </form>
          )}

          {/* Delete confirmation */}
          {type === 'delete' && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white/80 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(currentName)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {config.confirmText}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};