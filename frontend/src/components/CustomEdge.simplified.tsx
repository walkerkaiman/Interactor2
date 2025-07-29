import React from 'react';
import { EdgeLabelRenderer, getBezierPath, BaseEdge } from 'reactflow';
import styles from './CustomEdge.module.css';

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  data?: {
    route?: any;
    interaction?: any;
    edgeState?: {
      isRegistered: boolean;
      isAnimating: boolean;
    };
  };
}

const CustomEdgeSimplified: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
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

  // Get state from props instead of singleton
  const isRegistered = data?.edgeState?.isRegistered ?? true;
  const isAnimating = data?.edgeState?.isAnimating ?? isRegistered;

  // Determine CSS classes
  const edgeClasses = [
    styles.edge,
    isRegistered ? styles.registeredEdge : styles.unregisteredEdge,
    isAnimating && styles.animatingEdge,
    data?.route?.event === 'trigger' && styles.triggerEdge,
    data?.route?.event === 'stream' && styles.streamEdge,
  ].filter(Boolean).join(' ');

  // Get label for stream events
  const getLabelText = () => {
    if (data?.route?.event !== 'stream') return '';
    
    // Find the source module in the interaction
    const sourceModule = data.interaction?.modules?.find(
      (module: any) => module.id === data.route.source
    );
    
    if (sourceModule?.currentFrame !== undefined) {
      return String(sourceModule.currentFrame);
    }
    
    return 'N/A';
  };

  const labelText = getLabelText();

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={edgeClasses}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className={`${styles.edgeLabel} ${styles.streamLabel}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default React.memo(CustomEdgeSimplified);