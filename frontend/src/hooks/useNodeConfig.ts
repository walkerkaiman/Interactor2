import { useState, useEffect, useCallback } from 'react';

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

  // Update from instance config changes
  useEffect(() => {
    if (instance?.config) {
      const newValue = instance.config[key] !== undefined 
        ? instance.config[key] 
        : defaultValue;
      
      if (validator) {
        setState(validator(newValue));
      } else {
        setState(newValue);
      }
    }
  }, [instance, key, defaultValue, validator]);

  const updateState = useCallback((value: T) => {
    setState(value);
    // Update local config only (not backend)
    if (instance) {
      const updatedConfig = {
        ...instance.config,
        [key]: value
      };
      instance.config = updatedConfig;
      
      // Notify parent component of config change
      if (onConfigChange && instance.id) {
        onConfigChange(instance.id, updatedConfig);
      }
    }
  }, [instance, onConfigChange]);

  return [state, updateState];
}

/**
 * Custom hook for getting real-time data from instance (for WebSocket updates)
 */
export function useInstanceData<T>(instance: any, key: string, defaultValue: T): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    if (instance) {
      const newValue = instance[key] !== undefined 
        ? instance[key] 
        : defaultValue;
      setValue(newValue);
    }
  }, [instance, key, defaultValue]);

  return value;
} 