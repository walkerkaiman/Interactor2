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



  return (
    <>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border rounded-2xl shadow-elevation-2 p-2">
          <div className="flex items-center space-x-1">
            {/* Zoom In */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleZoomIn}
              className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-200 group"
              title="Zoom In"
            >
              <PlusIcon className="w-5 h-5 group-hover:text-accent transition-colors" />
            </motion.button>

            {/* Zoom Out */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleZoomOut}
              className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-200 group"
              title="Zoom Out"
            >
              <MinusIcon className="w-5 h-5 group-hover:text-accent transition-colors" />
            </motion.button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Fit View */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFitView}
              className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-200 group"
              title="Fit to View"
            >
              <MagnifyingGlassIcon className="w-5 h-5 group-hover:text-accent transition-colors" />
            </motion.button>

            {/* Center View */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCenterView}
              className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-200 group"
              title="Center View"
            >
              <ArrowPathIcon className="w-5 h-5 group-hover:text-accent transition-colors" />
            </motion.button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Export */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-200 group"
                title="Export"
              >
                <DocumentArrowDownIcon className="w-5 h-5 group-hover:text-accent transition-colors" />
              </motion.button>

              {/* Export Menu */}
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute top-full mt-2 left-0 bg-bg-secondary/95 backdrop-blur-xl border border-border rounded-xl shadow-elevation-3 py-2 min-w-[160px]"
                >
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-2"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    onClick={() => handleExport('png')}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-2"
                  >
                    <PhotoIcon className="w-4 h-4" />
                    <span>Export as PNG</span>
                  </button>
                  <button
                    onClick={() => handleExport('svg')}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-2"
                  >
                    <SwatchIcon className="w-4 h-4" />
                    <span>Export as SVG</span>
                  </button>
                </motion.div>
              )}
            </div>

            {/* Import */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-200 group"
              title="Import"
            >
              <ArrowUpTrayIcon className="w-5 h-5 group-hover:text-accent transition-colors" />
            </motion.button>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Clear Canvas */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleClearCanvas}
              className="p-2.5 rounded-xl hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-all duration-200 group"
              title="Clear Canvas"
            >
              <TrashIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Canvas Stats */}
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="absolute bottom-4 right-4 z-10"
      >
        <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border rounded-xl shadow-elevation-1 px-3 py-2">
          <div className="flex items-center space-x-4 text-xs text-text-secondary">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-module-input rounded-full" />
              <span>{nodes.length} nodes</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-module-output rounded-full" />
              <span>{edges.length} connections</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}; 