import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentPlusIcon,
  FolderPlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ScissorsIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-50 min-w-48 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl py-1"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.separator && index > 0 && (
              <div className="h-px bg-gray-700/50 my-1" />
            )}
            <button
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={item.disabled}
              className={`
                w-full px-3 py-2 text-left text-sm flex items-center gap-3
                transition-colors duration-150
                ${
                  item.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-white/80 hover:text-white hover:bg-gray-700/50'
                }
              `}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

// Predefined context menu items for common file operations
export const createFileContextMenuItems = (
  onCreateFile: () => void,
  onCreateFolder: () => void,
  onRename?: () => void,
  onDelete?: () => void,
  onCopy?: () => void,
  onCut?: () => void,
  onPaste?: () => void,
  isDirectory?: boolean,
  canPaste?: boolean
): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [];

  // Create operations (always available)
  items.push(
    {
      id: 'create-file',
      label: 'New File',
      icon: DocumentPlusIcon,
      onClick: onCreateFile,
    },
    {
      id: 'create-folder',
      label: 'New Folder',
      icon: FolderPlusIcon,
      onClick: onCreateFolder,
    }
  );

  // File-specific operations (when a file/folder is selected)
  if (onRename || onDelete || onCopy || onCut) {
    items.push({
      id: 'separator-1',
      label: '',
      icon: DocumentIcon,
      onClick: () => {},
      separator: true,
    });

    if (onRename) {
      items.push({
        id: 'rename',
        label: 'Rename',
        icon: PencilIcon,
        onClick: onRename,
      });
    }

    if (onCopy) {
      items.push({
        id: 'copy',
        label: 'Copy',
        icon: DocumentDuplicateIcon,
        onClick: onCopy,
      });
    }

    if (onCut) {
      items.push({
        id: 'cut',
        label: 'Cut',
        icon: ScissorsIcon,
        onClick: onCut,
      });
    }

    if (onPaste && canPaste) {
      items.push({
        id: 'paste',
        label: 'Paste',
        icon: ClipboardDocumentIcon,
        onClick: onPaste,
        disabled: !canPaste,
      });
    }

    if (onDelete) {
      items.push(
        {
          id: 'separator-2',
          label: '',
          icon: DocumentIcon,
          onClick: () => {},
          separator: true,
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: TrashIcon,
          onClick: onDelete,
        }
      );
    }
  }

  return items;
};

// Hook for managing context menu state
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = React.useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    items: ContextMenuItem[];
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    items: [],
  });

  const openContextMenu = (
    event: React.MouseEvent,
    items: ContextMenuItem[]
  ) => {
    event.preventDefault();
    event.stopPropagation();

    // Calculate position to ensure menu stays within viewport
    const { clientX, clientY } = event;
    const menuWidth = 192; // min-w-48 = 12rem = 192px
    const menuHeight = items.length * 40; // Approximate height per item

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = clientX;
    let y = clientY;

    // Adjust horizontal position if menu would overflow
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    // Adjust vertical position if menu would overflow
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    setContextMenu({
      isOpen: true,
      position: { x, y },
      items,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
  };
};

// Dummy DocumentIcon for separator (not used visually)
const DocumentIcon: React.FC<any> = () => null;