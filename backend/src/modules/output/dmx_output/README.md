# Module: dmx_output

- Purpose: Send DMX frames over configured protocol; supports CSV uploads
- Type: output

## Events
- Output: `dmxSent` { universe, channels, brightness, frameNumber, totalFrames, frameCount, timestamp }
- Status: ready/stopped/fileLoaded
- Error: dmx_send

## Config
- universe, brightness, protocol { type, host/port or serialPort/baudRate }, enabled, upload options

## Factory
```ts
moduleRegistry.register('DMX Output', (config, id) => new DmxOutputModule(config as any, id));
```
