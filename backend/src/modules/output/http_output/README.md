# Module: http_output

- Purpose: Send HTTP requests based on triggers/streams
- Type: output

## Events
- Output: response and error events per shared types
- Status: ready/stopped

## Config
- url, method, headers?, timeout?, enabled?

## Factory
```ts
moduleRegistry.register('HTTP Output', (config, id) => new HttpOutputModule(config as any, id));
```
