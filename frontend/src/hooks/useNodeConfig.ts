import { useState, useEffect, useCallback, useRef } from 'react';
import { useUnregisteredChanges } from '../state/useUnregisteredChanges';

/**
 * Custom hook for managing node configuration state
 * Provides consistent configuration management across all node components
 */
export function useNodeConfig<T>(
  instance: any,
  key: string,
  defaultValue: T,
  validator?: (value: any) => T,
  onConfigChange?: (instanceId: string, config: any) => void
): [T, (value: T) => void] {
  const config = instance?.config || {};
  const initialValue = config[key] !== undefined ? config[key] : defaultValue;
  
  const [state, setState] = useState<T>(initialValue);
  const [localChanges, setLocalChanges] = useState<Set<string>>(new Set());
  const lastBackendValue = useRef<T>(initialValue);
  
  // Get unregistered changes manager
  const { 
    getMergedConfig, 
    updateConfigChange, 
 
    hasConfigChange 
  } = useUnregisteredChanges();





  // Update local UI state when backend config changes
  useEffect(() => {
    if (!instance?.config) return;
    const backendValue = instance.config[key] !== undefined ? instance.config[key] : defaultValue;

    if (!localChanges.has(key)) {
      // No local changes, update from backend
      const finalValue = validator ? validator(backendValue) : backendValue;
      if (finalValue !== state) {
        setState(finalValue);
      }
    } else {
      // Local change exists - check if backend now matches our local value (change was processed)
      if (backendValue === state) {
        // Backend now matches our local value, clear the local change
        setLocalChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        console.log(`Local change for ${key} has been confirmed by backend, clearing local change`);
      } else if (backendValue !== lastBackendValue.current) {
        // Backend value changed but doesn't match our local value - log for debugging
        console.log(`Backend value for ${key} changed from ${String(lastBackendValue.current)} to ${String(backendValue)}, but local value is ${String(state)}`);
      }
    }
    
    // Track last raw backend value
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    lastBackendValue.current = backendValue as T;
  }, [instance?.config, key, defaultValue, validator, localChanges, state]);

  const updateState = useCallback((value: T) => {
    setState(value);

    // Mark this key as locally modified
    setLocalChanges(prev => new Set([...prev, key]));

    if (instance?.id) {
      // Store only the delta in the unregistered changes memory
      updateConfigChange(instance.id, { [key]: value } as any);

      // Compute the full merged config for the parent/upstream (draft = backend + all local deltas + this change)
      const currentLocalDraftConfig = getMergedConfig(instance.id, instance.config || {});
      const fullUpdatedConfig = { ...currentLocalDraftConfig, [key]: value };

      // Notify parent component of config change with the full merged config
      if (onConfigChange) {
        onConfigChange(instance.id, fullUpdatedConfig);
      }
    }
  }, [instance, onConfigChange, key, updateConfigChange, getMergedConfig]);

  // Reset local changes when instance changes (new module loaded)
  useEffect(() => {
    if (instance?.id) {
      setLocalChanges(new Set());
    }
  }, [instance?.id]);

  // Clear unregistered changes when module is registered
  useEffect(() => {
    if (instance?.id && !hasConfigChange(instance.id)) {
      // Module has been registered, clear any local changes
      setLocalChanges(new Set());
    }
  }, [instance?.id, hasConfigChange]);



  return [state, updateState];
}

/**
 * Custom hook for getting real-time data from instance (for WebSocket updates)
 */
export function useInstanceData<T>(instance: any, key: string, defaultValue: T): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    console.log(`useInstanceData called for key "${key}":`, {
      instance,
      instanceId: instance?.id,
      instanceKeys: instance ? Object.keys(instance) : [],
      hasKey: instance ? key in instance : false,
      instanceValue: instance ? instance[key] : undefined,
      defaultValue,
      currentValue: value
    });
    
    if (instance) {
      const newValue = instance[key] !== undefined 
        ? instance[key] 
        : defaultValue;
      
      console.log(`useInstanceData update for key "${key}":`, {
        key,
        oldValue: value,
        newValue,
        instance,
        instanceKeys: Object.keys(instance),
        hasKey: key in instance,
        instanceValue: instance[key],
        willUpdate: newValue !== value
      });
      
      if (newValue !== value) {
        console.log(`Setting new value for "${key}": ${value} -> ${newValue}`);
        setValue(newValue);
      } else {
        console.log(`No update needed for "${key}": ${value}`);
      }
    }
  }, [instance, key, defaultValue, value]);

  return value;
} 