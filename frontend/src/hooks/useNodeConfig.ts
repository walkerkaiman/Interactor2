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
    removeConfigChange, 
    hasConfigChange 
  } = useUnregisteredChanges();

  // Get the effective config (original + unregistered changes)
  const effectiveConfig = instance?.id ? getMergedConfig(instance.id, config) : config;
  const effectiveValue = effectiveConfig[key] !== undefined ? effectiveConfig[key] : defaultValue;

  // Check if this is a mode-specific setting that should be preserved
  const isModeSpecificSetting = (key: string): boolean => {
    // These settings should always be preserved regardless of current mode
    const modeSpecificKeys = [
      'mode', 'targetTime', 'millisecondDelay', 'enabled', 'apiEnabled', 'apiEndpoint',
      'port', 'host', 'endpoint', 'methods', 'addressPattern',
      'deviceId', 'volume', 'sampleRate', 'channels', 'format',
      // Add more mode-specific keys as needed
    ];
    return modeSpecificKeys.includes(key);
  };

  // Update from instance config changes (only if not locally modified)
  useEffect(() => {
    if (instance?.config) {
      const newValue = effectiveValue;
      
      // Only update from backend if this key hasn't been locally modified
      // AND if the value is actually different from what we have
      if (!localChanges.has(key)) {
        const finalValue = validator ? validator(newValue) : newValue;
        
        // Only update if the value is actually different
        if (finalValue !== state) {
          setState(finalValue);
          lastBackendValue.current = finalValue;
        }
      } else {
        // If this key has local changes, check if the backend value is different from our last known backend value
        // This helps detect when the backend has been updated externally
        if (newValue !== lastBackendValue.current) {
          console.log(`Backend value changed for ${key}: ${lastBackendValue.current} -> ${newValue}, but keeping local change`);
          lastBackendValue.current = newValue;
        }
      }
    }
  }, [instance, key, defaultValue, validator, localChanges, effectiveValue, state]);

  const updateState = useCallback((value: T) => {
    setState(value);
    
    // Mark this key as locally modified
    setLocalChanges(prev => new Set([...prev, key]));
    
    // Update local config
    if (instance) {
      const updatedConfig = {
        ...instance.config,
        [key]: value
      };
      instance.config = updatedConfig;
      
      // Store in unregistered changes
      if (instance.id) {
        updateConfigChange(instance.id, updatedConfig);
      }
      
      // Notify parent component of config change
      if (onConfigChange && instance.id) {
        onConfigChange(instance.id, updatedConfig);
      }
    }
  }, [instance, onConfigChange, key, updateConfigChange]);

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

  // Clear local changes when backend value matches our local value
  useEffect(() => {
    if (instance?.config && localChanges.has(key)) {
      const backendValue = instance.config[key] !== undefined ? instance.config[key] : defaultValue;
      const localValue = state;
      
      // If backend value now matches our local value, the change has been registered
      if (backendValue === localValue) {
        setLocalChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        console.log(`Local change for ${key} has been registered, clearing local change`);
      }
    }
  }, [instance?.config, key, state, localChanges, defaultValue]);

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