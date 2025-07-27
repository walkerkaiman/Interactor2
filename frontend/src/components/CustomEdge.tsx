import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { FrontendEdgeData } from '../types';

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
}

const CustomEdge: React.FC<CustomEdgeProps> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Only show label for stream connections
  const isStreamConnection = data?.route?.event === 'stream';
  
  // Mock value for demonstration - in a real implementation, this would come from the actual module data
  const getStreamValue = () => {
    if (!isStreamConnection) return null;
    
    // Generate different mock values based on time to simulate real data
    const timestamp = Date.now();
    const baseValue = (timestamp % 1000) / 10; // Value between 0-100
    
    // Add some variation to make it look more realistic
    const variation = Math.sin(timestamp / 1000) * 10;
    return (baseValue + variation).toFixed(1);
  };
  
  const streamValue = getStreamValue();

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      {isStreamConnection && streamValue && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              fontWeight: 'bold',
              backgroundColor: '#059669',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #047857',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            {streamValue}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge; 