import { useState, useEffect, useCallback } from 'react';
import { ConfigParser } from '../core/ConfigParser';

const configParser = new ConfigParser();

export function useNodeConfig(
  instance: any,
  key: string,
  defaultValue: any,
  validator?: (value: any) => any,
  onConfigChange?: (config: any) => void
) {
  const moduleName = instance?.moduleName || instance?.name || 'unknown';
  const manifest = instance?.manifest;

  // Clean config data from instance
  const cleanConfigData = useCallback((rawConfig: any): any => {
    if (!rawConfig || Object.keys(rawConfig).length === 0) {
      return configParser.getDefaultConfig(moduleName, manifest);
    }
    const cleaned = configParser.cleanConfig(rawConfig);
    return configParser.extractModuleConfig(moduleName, cleaned, manifest);
  }, [moduleName, manifest]);

  // Get initial value
  const [value, setValue] = useState(() => {
    const config = cleanConfigData(instance?.config);
    return config[key] ?? defaultValue;
  });

  // Update value when instance config changes
  useEffect(() => {
    const config = cleanConfigData(instance?.config);
    const newValue = config[key] ?? defaultValue;
    setValue(newValue);
  }, [instance?.config, key, defaultValue, cleanConfigData]);

  // Update configuration
  const updateConfig = useCallback((newValue: any) => {
    const currentConfig = cleanConfigData(instance?.config || {});
    const updatedConfig = { ...currentConfig, [key]: newValue };
    setValue(newValue);
    onConfigChange?.(updatedConfig);
  }, [instance?.config, cleanConfigData, onConfigChange, key]);

  return [value, updateConfig] as const;
}

export function useInstanceData(instance: any, key: string, defaultValue: any) {
  const [value, setValue] = useState(() => {
    return instance?.[key] ?? defaultValue;
  });

  // Update value when instance data changes
  useEffect(() => {
    const newValue = instance?.[key] ?? defaultValue;
    if (newValue !== value) {
      setValue(newValue);
    }
  }, [instance?.[key], defaultValue, value]);

  return value;
} 