import { useEffect, useMemo, useState } from 'react';
import { runtimeBus, RuntimeUpdate } from '../state/runtimeBus';

export function useModuleRuntime(moduleId: string, keys?: string[]): Record<string, any> {
  const initial = useMemo(() => runtimeBus.getLatest(moduleId), [moduleId]);
  const [values, setValues] = useState<Record<string, any>>(initial);

  useEffect(() => {
    const listener = (u: RuntimeUpdate) => {
      if (u.moduleId !== moduleId) return;
      console.log('useModuleRuntime received:', u);
      if (!keys || keys.length === 0) {
        setValues(prev => ({ ...prev, ...u.runtimeData }));
      } else {
        const picked: Record<string, any> = {};
        keys.forEach(k => { if (u.runtimeData[k] !== undefined) picked[k] = u.runtimeData[k]; });
        if (Object.keys(picked).length > 0) {
          setValues(prev => ({ ...prev, ...picked }));
        }
      }
    };
    runtimeBus.onUpdate(listener);
    return () => runtimeBus.offUpdate(listener);
  }, [moduleId, Array.isArray(keys) ? keys.join('|') : '']);

  return values;
}


