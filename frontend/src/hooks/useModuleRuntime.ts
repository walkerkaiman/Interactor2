import { useState, useEffect } from 'react';
import { runtimeBus, RuntimeUpdate } from '../state/runtimeBus';

export function useModuleRuntime(moduleId: string) {
  const [runtimeData, setRuntimeData] = useState<Record<string, any>>({});

  useEffect(() => {
    const handleUpdate = (update: RuntimeUpdate) => {
      if (update.moduleId === moduleId) {
        setRuntimeData(update.runtimeData);
      }
    };

    runtimeBus.onUpdate(handleUpdate);
    return () => runtimeBus.offUpdate(handleUpdate);
  }, [moduleId]);

  return runtimeData;
}


