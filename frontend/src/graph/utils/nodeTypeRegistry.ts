export function resolveNodeType(moduleName: string, manifestType?: string): 'timeInput' | 'audioOutput' | 'custom' {
  const name = (moduleName || '').toLowerCase().replace(/\s+/g, '_');
  if (moduleName === 'Time Input' || name === 'time_input') return 'timeInput';
  if (moduleName === 'Audio Output' || name === 'audio_output' || manifestType === 'output') return 'audioOutput';
  return 'custom';
}


