# Module: http_input

- Purpose: Receive HTTP requests and emit trigger/stream events
- Type: input

## Events
- Trigger: `httpTrigger` { value, method, url, headers, body, query, requestId, rateLimitRemaining, timestamp }
- Stream: value: number

## Config
- port, host, endpoint, methods, rateLimit, contentType, enabled

## Factory
```ts
moduleRegistry.register('HTTP Input', (config, id) => new HttpInputModule(config as any, id));
```
