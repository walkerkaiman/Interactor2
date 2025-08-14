# Module: serial_input

- Purpose: Read serial values from a COM port and emit threshold triggers/stream
- Type: input

## Events
- Trigger: `thresholdTrigger` { value, rawData, threshold, operator, dataCount, timestamp }
- Stream: value: number

## Config
- port, baudRate, logicOperator, threshold, enabled

## Factory
```ts
moduleRegistry.register('Serial Input', (config, id) => new SerialInputModule(config as any, id));
```
