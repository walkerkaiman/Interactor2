# Module: osc_input

- Purpose: Listen for OSC messages over UDP
- Type: input

## Events
- Trigger: `oscTrigger` { address, args, messageCount, timestamp }
- Stream: value: number (first argument)

## Config
- port, host, addressPattern, enabled

## Factory
```ts
moduleRegistry.register('OSC Input', (config, id) => new OscInputModule(config as any, id));
```
