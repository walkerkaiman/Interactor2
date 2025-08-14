export default function seedConfigFromManifest(manifest: any): Record<string, any> {
  const cfg: Record<string, any> = { enabled: true };
  const props = manifest?.configSchema?.properties || {};
  for (const [key, schema] of Object.entries(props)) {
    // Only copy explicit defaults; do not infer
    if (schema && Object.prototype.hasOwnProperty.call(schema as any, 'default')) {
      cfg[key] = (schema as any).default;
    }
  }
  return cfg;
}



