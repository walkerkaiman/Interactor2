# Module: osc_output

- Purpose: Send OSC messages to a remote host:port
- Type: output

## Events
- Output: `oscSent` { address, args, timestamp, messageCount }
- Status: ready/stopped
- Error: osc_send

## Config
- host, port, addressPattern, enabled

## Factory
```ts
moduleRegistry.register('OSC Output', (config, id) => new OscOutputModule(config as any, id));
```
