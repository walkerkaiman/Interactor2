import React, { memo } from 'react';
import { EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { FrontendEdgeData } from '../types';

import styles from './CustomEdge.module.css';

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: any;
  data?: FrontendEdgeData;
  selected?: boolean;
  markerEnd?: string;
}

const CustomEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected = false,
  markerEnd,
}) => {
  console.log(`CustomEdge rendering for ${id}:`, {
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    style
  });

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Use registration state from data prop (passed from parent)
  const isRegistered = data?.isRegistered ?? false;
  
  // Determine CSS classes based on registration status and event type
  const edgeClasses = [];
  
  if (isRegistered) {
    edgeClasses.push(styles.registeredEdge);
  } else {
    edgeClasses.push(styles.unregisteredEdge);
  }
  
  // Add event type color classes
  if (data?.route?.event === 'trigger') {
    edgeClasses.push(styles.triggerEdge);
  } else if (data?.route?.event === 'stream') {
    edgeClasses.push(styles.streamEdge);
  }
  
  // Add selection class
  if (selected) {
    edgeClasses.push(styles.selectedEdge);
  }
  
  const className = edgeClasses.join(' ');
  
  console.log(`CustomEdge ${id} classes:`, {
    edgeClasses,
    className,
    edgePath,
    isRegistered: data?.isRegistered,
    event: data?.route?.event
  });
  
  // Generate label text based on event type
  const getLabelText = () => {
    if (!data?.route?.event) return '';
    
    // Only show labels for stream events
    if (data.route.event === 'stream') {
      // Try to get the current value from the source module instance
      const sourceModuleId = data.route.source;
      
      // Check if we have interaction data with module instances
      if (data.interaction?.modules) {
        const sourceModule = data.interaction.modules.find((module: any) => module.id === sourceModuleId);
        if (sourceModule) {
          // Check for current value in the module instance
          if (sourceModule.currentFrame !== undefined && sourceModule.currentFrame !== null) {
            return String(sourceModule.currentFrame);
          } else if (sourceModule.currentValue !== undefined && sourceModule.currentValue !== null) {
            return String(sourceModule.currentValue);
          } else if (sourceModule.lastValue !== undefined && sourceModule.lastValue !== null) {
            return String(sourceModule.lastValue);
          }
        }
      }
      
      // If no value is available, show "N/A"
      return 'N/A';
    }
    
    return '';
  };
  
  const labelText = getLabelText();
  
  // Determine label CSS classes - only for stream events
  const labelClasses = [styles.edgeLabel];
  if (data?.route?.event === 'stream') {
    labelClasses.push(styles.streamLabel);
  }
  const labelClassName = labelClasses.join(' ');
  
  return (
    <>
      <path
        d={edgePath}
        className={className}
        fill="none"
        strokeWidth={selected ? "3" : "2"}
        markerEnd={markerEnd}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className={labelClassName}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(CustomEdge); 