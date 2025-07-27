import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppActions } from '@/store';
import { 
  DocumentDuplicateIcon,
  TrashIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  contextType: 'canvas' | 'node' | 'edge' | 'module-palette';
  contextData?: any;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  contextType,
  contextData
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = useAppActions();


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

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const getMenuItems = (): MenuItem[] => {
    switch (contextType) {
      case 'canvas':
        return [
          {
            id: 'new-module',
            label: 'Add Module',
            icon: PlusIcon,
            action: () => console.log('Add module'),
            shortcut: 'Ctrl+N'
          },
          {
            id: 'separator-1',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'fit-view',
            label: 'Fit View',
            icon: MagnifyingGlassIcon,
            action: () => console.log('Fit view'),
            shortcut: 'F'
          },
          {
            id: 'center-view',
            label: 'Center View',
            icon: ArrowPathIcon,
            action: () => console.log('Center view'),
            shortcut: 'C'
          },
          {
            id: 'separator-2',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'export',
            label: 'Export',
            icon: ArrowUpTrayIcon,
            action: () => console.log('Export'),
            shortcut: 'Ctrl+E'
          },
          {
            id: 'import',
            label: 'Import',
            icon: DocumentArrowDownIcon,
            action: () => console.log('Import'),
            shortcut: 'Ctrl+I'
          },
          {
            id: 'separator-3',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'clear-canvas',
            label: 'Clear Canvas',
            icon: TrashIcon,
            action: () => handleAction(() => {
              if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
                actions.clearCanvas();
              }
            }),
            shortcut: 'Ctrl+Shift+C'
          }
        ];

      case 'node':
        return [
          {
            id: 'select',
            label: 'Select',
            icon: EyeIcon,
            action: () => handleAction(() => actions.selectNode(contextData?.id)),
            shortcut: 'Enter'
          },
          {
            id: 'edit',
            label: 'Edit Configuration',
            icon: PencilIcon,
            action: () => handleAction(() => console.log('Edit node config')),
            shortcut: 'E'
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: DocumentDuplicateIcon,
            action: () => handleAction(() => console.log('Duplicate node')),
            shortcut: 'Ctrl+D'
          },
          {
            id: 'separator-1',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'start',
            label: 'Start Module',
            icon: PlayIcon,
            action: () => handleAction(() => actions.startModuleInstance(contextData?.id)),
            disabled: contextData?.status === 'active'
          },
          {
            id: 'stop',
            label: 'Stop Module',
            icon: StopIcon,
            action: () => handleAction(() => actions.stopModuleInstance(contextData?.id)),
            disabled: contextData?.status === 'inactive'
          },
          {
            id: 'separator-2',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'copy',
            label: 'Copy',
            icon: ClipboardDocumentIcon,
            action: () => handleAction(() => console.log('Copy node')),
            shortcut: 'Ctrl+C'
          },
          {
            id: 'cut',
            label: 'Cut',
            icon: ClipboardDocumentListIcon,
            action: () => handleAction(() => console.log('Cut node')),
            shortcut: 'Ctrl+X'
          },
          {
            id: 'separator-3',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: TrashIcon,
            action: () => handleAction(() => {
              if (window.confirm('Are you sure you want to delete this module?')) {
                actions.deleteModuleInstance(contextData?.id);
              }
            }),
            shortcut: 'Delete'
          }
        ];

      case 'edge':
        return [
          {
            id: 'select',
            label: 'Select',
            icon: EyeIcon,
            action: () => handleAction(() => actions.selectEdge(contextData?.id)),
            shortcut: 'Enter'
          },
          {
            id: 'edit',
            label: 'Edit Connection',
            icon: PencilIcon,
            action: () => handleAction(() => console.log('Edit connection')),
            shortcut: 'E'
          },
          {
            id: 'separator-1',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'copy',
            label: 'Copy',
            icon: ClipboardDocumentIcon,
            action: () => handleAction(() => console.log('Copy connection')),
            shortcut: 'Ctrl+C'
          },
          {
            id: 'cut',
            label: 'Cut',
            icon: ClipboardDocumentListIcon,
            action: () => handleAction(() => console.log('Cut connection')),
            shortcut: 'Ctrl+X'
          },
          {
            id: 'separator-2',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: TrashIcon,
            action: () => handleAction(() => {
              if (window.confirm('Are you sure you want to delete this connection?')) {
                actions.deleteConnection(contextData?.id);
              }
            }),
            shortcut: 'Delete'
          }
        ];

      case 'module-palette':
        return [
          {
            id: 'add-to-canvas',
            label: 'Add to Canvas',
            icon: PlusIcon,
            action: () => handleAction(() => console.log('Add module to canvas')),
            shortcut: 'Enter'
          },
          {
            id: 'view-docs',
            label: 'View Documentation',
            icon: DocumentTextIcon,
            action: () => handleAction(() => console.log('View module docs')),
            shortcut: 'D'
          },
          {
            id: 'separator-1',
            label: '',
            icon: PlusIcon,
            action: () => {},
            separator: true
          },
          {
            id: 'configure',
            label: 'Configure',
            icon: Cog6ToothIcon,
            action: () => handleAction(() => console.log('Configure module')),
            shortcut: 'C'
          }
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  // Adjust position to keep menu within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - menuItems.length * 40);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
        style={{
          left: adjustedX,
          top: adjustedY
        }}
      >
        {menuItems.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.separator ? (
              <div className="border-t border-gray-100 my-1" />
            ) : (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={item.action}
                disabled={item.disabled}
                className={`
                  w-full flex items-center justify-between px-3 py-2 text-sm
                  hover:bg-gray-100 transition-colors duration-150
                  focus:outline-none focus:bg-gray-100
                  ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}
                `}
              >
                <div className="flex items-center space-x-2">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-xs text-gray-500 ml-4">
                    {item.shortcut}
                  </span>
                )}
              </motion.button>
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}; 