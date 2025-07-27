import React from 'react';
import { EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { FrontendEdgeData } from '../types';
import { edgeRegistrationTracker } from '../utils/edgeRegistrationTracker';
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
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isRegistered = edgeRegistrationTracker.isEdgeRegistered(id);
  
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
  
  const className = edgeClasses.join(' ');
  
  return (
    <path
      d={edgePath}
      className={className}
      fill="none"
      strokeWidth="2"
    />
  );
};

export default CustomEdge; 