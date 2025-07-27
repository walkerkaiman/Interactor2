import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { UIEdge } from '@/types/ui';

interface CustomEdgeData extends UIEdge {
  type: 'trigger' | 'stream';
  label?: string;
}

export const CustomEdge: React.FC<EdgeProps<CustomEdgeData>> = ({

  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style = {},
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const getEdgeColor = () => {
    if (data?.type === 'trigger') {
      return selected ? '#10b981' : '#059669';
    }
    return selected ? '#3b82f6' : '#2563eb';
  };

  const getEdgeWidth = () => {
    return selected ? 3 : 2;
  };

  const getEdgeStyle = () => {
    const color = getEdgeColor();
    const width = getEdgeWidth();
    
    return {
      ...style,
      stroke: color,
      strokeWidth: width,
      strokeDasharray: data?.type === 'trigger' ? '5,5' : 'none',
    };
  };

  return (
    <>
      <BaseEdge path={edgePath} style={getEdgeStyle()} />
      
      {/* Edge Label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <div className={`
              px-2 py-1 rounded text-xs font-medium
              ${data.type === 'trigger' 
                ? 'bg-connection-trigger text-white' 
                : 'bg-connection-stream text-white'
              }
              ${selected ? 'ring-2 ring-white ring-opacity-50' : ''}
            `}>
              {data.label}
            </div>
          </motion.div>
        </EdgeLabelRenderer>
      )}
      
      {/* Connection Type Indicator */}
      <EdgeLabelRenderer>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          className="absolute pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 20}px)`,
          }}
        >
          <div className={`
            w-2 h-2 rounded-full
            ${data?.type === 'trigger' 
              ? 'bg-connection-trigger' 
              : 'bg-connection-stream'
            }
            ${selected ? 'animate-pulse' : ''}
          `} />
        </motion.div>
      </EdgeLabelRenderer>
    </>
  );
}; 