import { useState, useEffect, useCallback } from 'react';
import { configParser, UnifiedModuleConfig } from '../core/ConfigParser';

interface UseNodeConfigOptions {
  moduleName: string;
  instance: any;
  onConfigChange: (config: any) => void;
  manifest?: any;
}

export function useNodeConfig({ moduleName, instance, onConfigChange, manifest }: UseNodeConfigOptions) {
  const [config, setConfig] = useState<any>({});

  // Clean and extract module-specific configuration from unified config
  const cleanConfigData = useCallback((rawConfig: any): any => {
    // If no config provided, get defaults for this module
    if (!rawConfig || Object.keys(rawConfig).length === 0) {
      console.log('[useNodeConfig] No config provided, using defaults for:', moduleName);
      return configParser.getDefaultConfig(moduleName, manifest);
    }
    
    // First clean any nested structures
    const cleaned = configParser.cleanConfig(rawConfig);
    
    // Then extract module-specific configuration
    return configParser.extractModuleConfig(moduleName, cleaned as UnifiedModuleConfig, manifest);
  }, [moduleName, manifest]);

  // Get initial value for a specific key
  const getInitialValue = useCallback((key: string) => {
    if (!instance?.config) return undefined;
    
    const moduleConfig = cleanConfigData(instance.config);
    return moduleConfig[key];
  }, [instance?.config, cleanConfigData]);

  // Update configuration
  const updateConfig = useCallback((key: string, value: any) => {
    console.log('[useNodeConfig] updateConfig called:', { key, value, moduleName, instanceId: instance?.id });
    
    // Get the current clean config from the instance
    const currentConfig = cleanConfigData(instance?.config || {});
    console.log('[useNodeConfig] current config:', currentConfig);
    
    // Create updated config with the new value
    const updatedConfig = { ...currentConfig, [key]: value };
    console.log('[useNodeConfig] updated config:', updatedConfig);
    
    // Set the local state
    setConfig(updatedConfig);
    
    // Send the updated config to the parent (don't clean it again, it's already module-specific)
    console.log('[useNodeConfig] calling onConfigChange with:', updatedConfig);
    onConfigChange(updatedConfig);
  }, [instance?.config, cleanConfigData, onConfigChange, moduleName]);

  // Watch for backend config changes
  useEffect(() => {
    if (instance?.config) {
      const moduleConfig = cleanConfigData(instance.config);
      setConfig(moduleConfig);
    }
  }, [instance?.config, cleanConfigData]);

  return {
    config,
    updateConfig,
    getInitialValue
  };
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