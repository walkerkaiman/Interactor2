# Module: audio_output

- Purpose: Play audio files/buffers via OS audio device
- Type: output
- Owned state: deviceId, sampleRate, channels, format, volume, playback state

## Structure
```
modules/output/audio_output/
  api/
  domain/ (n/a)
  infra/
    players/, storage/
  index.ts
  README.md
```

## Events
- Output: `audioOutput` with playback and device info
- Status: ready/stopped
- Error: audio_playback

## Config
- sampleRate, channels, format, volume, bufferSize, loop, fades, enableFileUpload

## Factory
```ts
moduleRegistry.register('Audio Output', (config, id) => new AudioOutputModule(config as any, id));
```
