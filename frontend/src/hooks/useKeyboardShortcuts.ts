import { useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { useAppStore, useAppActions } from '@/store';

export const useKeyboardShortcuts = () => {
  const { fitView, zoomIn, zoomOut, setViewport } = useReactFlow();
  const activeTab = useAppStore(state => state.activeTab);
  const selectedNode = useAppStore(state => state.ui.selectedNode);
  const selectedEdge = useAppStore(state => state.ui.selectedEdge);
  const actions = useAppActions();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;

      // Ctrl/Cmd combinations
      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'z':
            event.preventDefault();
            if (isShift) {
              // Ctrl+Shift+Z or Cmd+Shift+Z = Redo
              console.log('Redo');
            } else {
              // Ctrl+Z or Cmd+Z = Undo
              console.log('Undo');
            }
            break;
          case 's':
            event.preventDefault();
            // Ctrl+S or Cmd+S = Save project
            console.log('Save project');
            break;
          case 'o':
            event.preventDefault();
            // Ctrl+O or Cmd+O = Open project
            console.log('Open project');
            break;
          case 'n':
            event.preventDefault();
            // Ctrl+N or Cmd+N = New project
            console.log('New project');
            break;
          case 'f':
            event.preventDefault();
            // Ctrl+F or Cmd+F = Find/Search
            console.log('Find/Search');
            break;
          case '=':
          case '+':
            event.preventDefault();
            // Ctrl+= or Ctrl++ = Zoom in
            zoomIn();
            break;
          case '-':
            event.preventDefault();
            // Ctrl+- = Zoom out
            zoomOut();
            break;
          case '0':
            event.preventDefault();
            // Ctrl+0 = Reset zoom
            setViewport({ x: 0, y: 0, zoom: 1 });
            break;
        }
      }

      // Function keys
      switch (event.key) {
        case 'F1':
          event.preventDefault();
          // F1 = Help
          console.log('Help');
          break;
        case 'F5':
          event.preventDefault();
          // F5 = Refresh
          window.location.reload();
          break;
        case 'F11':
          event.preventDefault();
          // F11 = Toggle fullscreen
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
      }

      // Single key shortcuts (only when not in input fields)
      switch (event.key.toLowerCase()) {
        case 'escape':
          event.preventDefault();
          // Escape = Clear selection
          actions.clearSelection();
          break;
        case 'delete':
        case 'backspace':
          event.preventDefault();
          // Delete/Backspace = Delete selected items
          if (selectedNode) {
            actions.deleteModuleInstance(selectedNode);
          } else if (selectedEdge) {
            actions.deleteConnection(selectedEdge);
          }
          break;
        case 'f':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            // F = Fit view
            fitView({ padding: 0.1 });
          }
          break;
        case 'c':
          if (isCtrlOrCmd) {
            event.preventDefault();
            // Ctrl+C or Cmd+C = Copy
            console.log('Copy');
          } else {
            event.preventDefault();
            // C = Center view
            setViewport({ x: 0, y: 0, zoom: 1 });
          }
          break;
        case 'h':
          event.preventDefault();
          // H = Toggle help
          console.log('Toggle help');
          break;
        case '?':
          event.preventDefault();
          // ? = Show shortcuts
          console.log('Show shortcuts');
          break;
        case '1':
          event.preventDefault();
          // 1 = Switch to Editor tab
          actions.switchTab('editor');
          break;
        case '2':
          event.preventDefault();
          // 2 = Switch to Wiki tab
          actions.switchTab('wiki');
          break;
        case '3':
          event.preventDefault();
          // 3 = Switch to Console tab
          actions.switchTab('console');
          break;
        case '4':
          event.preventDefault();
          // 4 = Switch to Dashboard tab
          actions.switchTab('dashboard');
          break;
        case 'a':
          if (isCtrlOrCmd) {
            event.preventDefault();
            // Ctrl+A or Cmd+A = Select all
            console.log('Select all');
          }
          break;
        case 'v':
          if (isCtrlOrCmd) {
            event.preventDefault();
            // Ctrl+V or Cmd+V = Paste
            console.log('Paste');
          }
          break;
        case 'x':
          if (isCtrlOrCmd) {
            event.preventDefault();
            // Ctrl+X or Cmd+X = Cut
            console.log('Cut');
          }
          break;
        case 'd':
          if (isCtrlOrCmd) {
            event.preventDefault();
            // Ctrl+D or Cmd+D = Duplicate
            console.log('Duplicate');
          }
          break;
      }

      // Arrow keys for navigation
      if (selectedNode) {
        // const moveAmount = isShift ? 10 : 1; // TODO: Implement node movement
        switch (event.key) {
          case 'arrowup':
            event.preventDefault();
            // Move selected node up
            console.log('Move node up');
            break;
          case 'arrowdown':
            event.preventDefault();
            // Move selected node down
            console.log('Move node down');
            break;
          case 'arrowleft':
            event.preventDefault();
            // Move selected node left
            console.log('Move node left');
            break;
          case 'arrowright':
            event.preventDefault();
            // Move selected node right
            console.log('Move node right');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    fitView, 
    zoomIn, 
    zoomOut, 
    setViewport, 
    activeTab, 
    selectedNode, 
    selectedEdge,
    actions
  ]);
}; 