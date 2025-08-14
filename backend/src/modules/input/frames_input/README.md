# Module: frames_input

- Purpose: Listen to sACN universe, emit frame change events
- Type: input
- Owned state: universe, currentFrame, frameCount

## Events
- Trigger: `frameChange` { frameNumber, msb, lsb, frameCount, timestamp }
- Stream: value: number (frameNumber)

## Config
- universe: number; enabled: boolean

## Factory
```ts
moduleRegistry.register('Frames Input', (config, id) => new FramesInputModule(config as any, id));
```
