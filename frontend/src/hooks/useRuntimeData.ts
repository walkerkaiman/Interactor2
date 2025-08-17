import { useState, useEffect, useCallback } from 'react';
import { runtimeBus, RuntimeUpdate } from '../state/runtimeBus';

export interface RuntimeData {
  [moduleId: string]: {
    countdown?: string;
    currentTime?: string;
    isPlaying?: boolean;
    [key: string]: any;
  };
}

export function useRuntimeData(onNewChanges?: (newChanges: boolean) => void) {
  const [runtimeData, setRuntimeData] = useState<RuntimeData>({});

  // Subscribe to runtime updates
  useEffect(() => {
    const handleUpdate = (update: RuntimeUpdate & { newChanges?: boolean }) => {
      setRuntimeData(prev => {
        const newData = {
          ...prev,
          [update.moduleId]: {
            ...prev[update.moduleId],
            ...update.runtimeData
          }
        };
        return newData;
      });
      
      // Notify parent about new changes if present
      if (update.newChanges !== undefined && onNewChanges) {
        onNewChanges(update.newChanges);
      }
    };

    runtimeBus.onUpdate(handleUpdate);
    return () => runtimeBus.offUpdate(handleUpdate);
  }, [onNewChanges]); // Removed runtimeData from dependencies to prevent infinite re-renders

  // Get runtime data for a specific module
  const getModuleRuntimeData = useCallback((moduleId: string) => {
    return runtimeData[moduleId] || {};
  }, [runtimeData]);

  // Get countdown for a time input module
  const getCountdown = useCallback((moduleId: string) => {
    const countdown = runtimeData[moduleId]?.countdown || '';
    return countdown;
  }, [runtimeData]);

  // Get current time for a time input module
  const getCurrentTime = useCallback((moduleId: string) => {
    const currentTime = runtimeData[moduleId]?.currentTime || '';
    return currentTime;
  }, [runtimeData]);

  return {
    runtimeData,
    getModuleRuntimeData,
    getCountdown,
    getCurrentTime
  };
}
