import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReactFlow } from 'reactflow';
import { useNodes, useEdges, useAppActions } from '@/store';
import { 
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  PhotoIcon,
  SwatchIcon
} from '@heroicons/react/24/outline';

interface ProjectData {
  nodes: any[];
  edges: any[];
  metadata: {
    name: string;
    description: string;
    version: string;
    createdAt: string;
    updatedAt: string;
  };
}

export const CanvasToolbar: React.FC = () => {
  const { fitView, zoomIn, zoomOut, setViewport } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();

  const actions = useAppActions();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFitView = () => {
    fitView({ padding: 0.1 });
  };

  const handleZoomIn = () => {
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
  };

  const handleCenterView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      actions.clearCanvas();
    }
  };

  const handleExport = async (format: 'json' | 'png' | 'svg') => {
    const projectData: ProjectData = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        config: node.config,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        data: edge.data,
      })),
      metadata: {
        name: 'Interactor2 Project',
        description: 'Exported from Interactor2',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    };

    if (format === 'json') {
      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interactor2-project-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      try {
        // Get the ReactFlow container
        const reactFlowContainer = document.querySelector('.react-flow') as HTMLElement;
        if (!reactFlowContainer) {
          throw new Error('ReactFlow container not found');
        }

        // Use html2canvas for PNG export
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(reactFlowContainer, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
        });

        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `interactor2-graph-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error exporting PNG:', error);
        alert('Failed to export PNG. Please try again.');
      }
    } else if (format === 'svg') {
      try {
        // Get the ReactFlow container
        const reactFlowContainer = document.querySelector('.react-flow') as HTMLElement;
        if (!reactFlowContainer) {
          throw new Error('ReactFlow container not found');
        }

        // Create SVG representation
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 1200 800');

        // Add background
        const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        background.setAttribute('width', '100%');
        background.setAttribute('height', '100%');
        background.setAttribute('fill', '#ffffff');
        svg.appendChild(background);

        // Add nodes as rectangles
        nodes.forEach(node => {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', node.position.x.toString());
          rect.setAttribute('y', node.position.y.toString());
          rect.setAttribute('width', '150');
          rect.setAttribute('height', '80');
          rect.setAttribute('fill', '#f3f4f6');
          rect.setAttribute('stroke', '#d1d5db');
          rect.setAttribute('stroke-width', '2');
          rect.setAttribute('rx', '8');
          svg.appendChild(rect);

          // Add node label
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', (node.position.x + 75).toString());
          text.setAttribute('y', (node.position.y + 45).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('fill', '#374151');
          text.setAttribute('font-family', 'Arial, sans-serif');
          text.setAttribute('font-size', '12');
          text.textContent = node.data?.label || node.id;
          svg.appendChild(text);
        });

        // Add edges as lines
        edges.forEach(edge => {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          if (sourceNode && targetNode) {
            line.setAttribute('x1', (sourceNode.position.x + 75).toString());
            line.setAttribute('y1', (sourceNode.position.y + 40).toString());
            line.setAttribute('x2', (targetNode.position.x + 75).toString());
            line.setAttribute('y2', (targetNode.position.y + 40).toString());
            line.setAttribute('stroke', '#6b7280');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('marker-end', 'url(#arrowhead)');
            svg.appendChild(line);
          }
        });

        // Add arrow marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#6b7280');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Convert SVG to string and download
        const svgString = new XMLSerializer().serializeToString(svg);
        const dataBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `interactor2-graph-${new Date().toISOString().split('T')[0]}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting SVG:', error);
        alert('Failed to export SVG. Please try again.');
      }
    }
    
    setShowExportMenu(false);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData: ProjectData = JSON.parse(e.target?.result as string);
        
        if (projectData.nodes && projectData.edges) {
          actions.loadProject(projectData);
          setShowImportMenu(false);
        } else {
          alert('Invalid project file format');
        }
      } catch (error) {
        console.error('Error parsing project file:', error);
        alert('Error parsing project file. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProject = async () => {
    // TODO: Implement save to backend
    console.log('Save project to backend to be implemented');
  };

  const handleLoadProject = () => {
    fileInputRef.current?.click();
  };

  const toolbarItems = [
    {
      icon: MagnifyingGlassIcon,
      label: 'Fit View',
      action: handleFitView,
      tooltip: 'Fit all nodes in view (F)',
    },
    {
      icon: PlusIcon,
      label: 'Zoom In',
      action: handleZoomIn,
      tooltip: 'Zoom in (+)',
    },
    {
      icon: MinusIcon,
      label: 'Zoom Out',
      action: handleZoomOut,
      tooltip: 'Zoom out (-)',
    },
    {
      icon: ArrowPathIcon,
      label: 'Center',
      action: handleCenterView,
      tooltip: 'Center view (C)',
    },
    {
      icon: TrashIcon,
      label: 'Clear',
      action: handleClearCanvas,
      tooltip: 'Clear canvas',
    },
    {
      icon: DocumentArrowDownIcon,
      label: 'Save',
      action: handleSaveProject,
      tooltip: 'Save project (Ctrl+S)',
    },
    {
      icon: ArrowUpTrayIcon,
      label: 'Export',
      action: () => setShowExportMenu(!showExportMenu),
      tooltip: 'Export graph',
      hasMenu: true,
    },
    {
      icon: DocumentTextIcon,
      label: 'Import',
      action: () => setShowImportMenu(!showImportMenu),
      tooltip: 'Import graph',
      hasMenu: true,
    },
  ];

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10"
    >
      <div className="flex items-center space-x-1 bg-white border border-gray-200 rounded-lg p-1 shadow-lg">
        {toolbarItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="relative">
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={item.action}
                className={`
                  p-2 rounded-md text-gray-600 hover:text-gray-900
                  hover:bg-gray-100 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  group relative
                  ${item.hasMenu && (showExportMenu || showImportMenu) ? 'bg-blue-500 text-white' : ''}
                `}
                title={item.tooltip}
              >
                <Icon className="w-5 h-5" />
                
                {/* Tooltip */}
                <div className="
                  absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                  px-2 py-1 text-xs text-white bg-gray-800 rounded
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  pointer-events-none whitespace-nowrap z-20
                ">
                  {item.tooltip}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </motion.button>

              {/* Export Menu */}
              {item.label === 'Export' && showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[140px]"
                >
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center space-x-2"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    onClick={() => handleExport('png')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center space-x-2"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    <span>Export as PNG</span>
                  </button>
                  <button
                    onClick={() => handleExport('svg')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center space-x-2"
                  >
                    <SwatchIcon className="w-4 h-4" />
                    <span>Export as SVG</span>
                  </button>
                </motion.div>
              )}

              {/* Import Menu */}
              {item.label === 'Import' && showImportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[140px]"
                >
                  <button
                    onClick={handleLoadProject}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors flex items-center space-x-2"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Load Project</span>
                  </button>
                  <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">
                    Supported: JSON files
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Project Info */}
      <div className="mt-2 text-center">
        <div className="inline-flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-600">
          <span>📊 {nodes.length} nodes</span>
          <span>🔗 {edges.length} connections</span>
        </div>
      </div>
    </motion.div>
  );
}; 