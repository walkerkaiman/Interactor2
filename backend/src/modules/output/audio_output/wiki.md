# Audio Output Module

## Overview

The Audio Output module provides audio playback capabilities for the Interactor system. It can play audio files, generate test tones, and control audio playback with features like volume control, looping, and fade effects.

## Features

- **Audio Playback**: Play audio files in various formats (WAV, MP3, OGG)
- **Test Tone Generation**: Generate sine wave test tones for testing
- **Volume Control**: Adjustable volume levels (0.0-1.0)
- **Looping**: Option to loop audio playback
- **Fade Effects**: Configurable fade-in and fade-out durations
- **Multiple Channels**: Support for mono (1 channel) and stereo (2 channels)
- **Configurable Sample Rates**: Support for various sample rates (8kHz-48kHz)
- **Buffer Management**: Configurable audio buffer sizes for optimal performance
- **File Upload Server**: Built-in HTTP server for uploading audio files via web interface
- **File Management**: Automatic file organization in assets folder
- **UI Integration**: Real-time notifications to update UI dropdown menus

## Configuration

### Required Parameters

- **sampleRate**: Sample rate in Hz (8000-48000)
- **channels**: Number of audio channels (1-2)
- **format**: Audio format ('wav', 'mp3', 'ogg')
- **volume**: Volume level (0.0-1.0)
- **enabled**: Enable/disable the module
- **bufferSize**: Audio buffer size in samples (256-16384)
- **loop**: Whether to loop audio playback
- **fadeInDuration**: Fade in duration in milliseconds (0-10000)
- **fadeOutDuration**: Fade out duration in milliseconds (0-10000)

### Optional Parameters

- **deviceId**: Audio device name or ID (defaults to 'default')
- **enableFileUpload**: Enable/disable file upload server (defaults to true)
- **uploadPort**: File upload server port (1024-65535, defaults to 3001)
- **uploadHost**: File upload server host address (defaults to '0.0.0.0')
- **maxFileSize**: Maximum file size in bytes (1024-100MB, defaults to 50MB)
- **allowedExtensions**: Allowed audio file extensions (defaults to ['.wav', '.mp3', '.ogg', '.m4a', '.flac'])

## Events

### Input Events

#### audioPlay
Triggers audio playback.

**Payload:**
```typescript
{
  audioData: string | Buffer | ArrayBuffer;  // Audio data (file path, buffer, or URL)
  volume?: number;                           // Playback volume (0.0-1.0)
  loop?: boolean;                            // Whether to loop playback
  fadeInDuration?: number;                   // Fade in duration in milliseconds
  fadeOutDuration?: number;                  // Fade out duration in milliseconds
  timestamp: number;                         // Timestamp when playback started
}
```

#### audioStop
Stops audio playback.

#### audioPause
Pauses audio playback.

#### audioResume
Resumes audio playback.

### Output Events

#### audioOutput
Emitted when audio playback state changes.

**Payload:**
```typescript
{
  deviceId: string;                          // Audio device ID
  sampleRate: number;                        // Sample rate used
  channels: number;                          // Number of channels
  format: string;                            // Audio format
  volume: number;                            // Current volume level
  isPlaying: boolean;                        // Whether audio is currently playing
  currentTime: number;                       // Current playback position in seconds
  duration: number;                          // Total duration in seconds
  timestamp: number;                         // Timestamp when event occurred
  playCount: number;                         // Total number of audio files played
}
```

#### audioError
Emitted when an audio error occurs.

**Payload:**
```typescript
{
  deviceId: string;                          // Audio device ID
  error: string;                             // Error message
  context: string;                           // Error context
  timestamp: number;                         // Timestamp when error occurred
}
```

#### stateUpdate
Emitted when module state changes.

#### fileUploaded
Emitted when an audio file is uploaded successfully.

**Payload:**
```typescript
{
  filename: string;                          // Saved filename
  originalName: string;                      // Original filename
  size: number;                              // File size in bytes
  mimetype: string;                          // File mimetype
  filePath: string;                          // File path relative to assets folder
  timestamp: number;                         // Timestamp when file was uploaded
  availableFiles: string[];                  // List of all available audio files
}
```

#### fileListUpdated
Emitted when the list of available audio files changes.

**Payload:**
```typescript
{
  files: string[];                           // List of available audio files
  totalFiles: number;                        // Total number of files
  totalSize: number;                         // Total size of all files in bytes
  timestamp: number;                         // Timestamp when list was generated
}
```

#### uploadError
Emitted when a file upload fails.

**Payload:**
```typescript
{
  error: string;                             // Error message
  originalName: string;                      // Original filename that failed
  timestamp: number;                         // Timestamp when error occurred
}
```

## Usage

### Basic Configuration

```javascript
{
  "id": "audio_output_1",
  "name": "Main Audio Output",
  "type": "output",
  "version": "1.0.0",
  "description": "Primary audio output for the system",
  "author": "Interactor Team",
  "sampleRate": 44100,
  "channels": 2,
  "format": "wav",
  "volume": 0.8,
  "enabled": true,
  "bufferSize": 4096,
  "loop": false,
  "fadeInDuration": 500,
  "fadeOutDuration": 1000
}
```

### Playing Audio Files

```javascript
// Play a WAV file
await audioModule.send({
  audioData: "/path/to/audio.wav",
  volume: 0.7,
  loop: false,
  fadeInDuration: 1000,
  fadeOutDuration: 500
});

// Play an MP3 file with looping
await audioModule.send({
  audioData: "https://example.com/background.mp3",
  volume: 0.5,
  loop: true,
  fadeInDuration: 2000
});
```

### Generating Test Tones

```javascript
// The module automatically generates test tones for manual triggers
await audioModule.manualTrigger();

// Or send raw audio data
const testTone = generateSineWave(440, 1); // 440Hz for 1 second
await audioModule.send({
  audioData: testTone,
  volume: 0.3
});
```

### Volume Control via Streaming

```javascript
// Adjust volume based on streaming input (0-100 range)
// The module automatically normalizes to 0-1 range
await audioModule.handleStreamingEvent({
  type: 'stream',
  value: 75, // 75% volume
  timestamp: Date.now(),
  source: 'volume_control'
});
```

### File Upload Configuration

```javascript
// Configure the module with file upload capabilities
const config = {
  id: "audio_1",
  name: "Audio with Upload",
  type: "output",
  version: "1.0.0",
  description: "Audio output with file upload server",
  author: "User",
  sampleRate: 44100,
  channels: 2,
  format: "wav",
  volume: 0.8,
  enabled: true,
  bufferSize: 4096,
  loop: false,
  fadeInDuration: 0,
  fadeOutDuration: 0,
  enableFileUpload: true,
  uploadPort: 3001,
  uploadHost: "0.0.0.0",
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: [".wav", ".mp3", ".ogg", ".m4a", ".flac"]
};
```

### File Upload API Endpoints

The module provides HTTP endpoints for file upload functionality:

#### Upload File
- **URL**: `POST http://localhost:3001/upload`
- **Content-Type**: `multipart/form-data`
- **Field Name**: `audio`
- **Response**: JSON with upload result

```bash
curl -X POST http://localhost:3001/upload \
  -F "audio=@/path/to/audio.wav"
```

#### List Files
- **URL**: `GET http://localhost:3001/files`
- **Response**: JSON with list of available files

```bash
curl http://localhost:3001/files
```

#### Health Check
- **URL**: `GET http://localhost:3001/health`
- **Response**: JSON with server status

```bash
curl http://localhost:3001/health
```

### Web Interface Integration

The module automatically notifies the UI when files are uploaded:

```javascript
// Listen for file upload events
audioModule.on('fileUploaded', (payload) => {
  console.log('File uploaded:', payload.filename);
  console.log('Available files:', payload.availableFiles);
  // Update UI dropdown with new file list
});

// Listen for file list updates
audioModule.on('fileListUpdated', (payload) => {
  console.log('File list updated:', payload.files);
  // Refresh UI file list
});

// Listen for upload errors
audioModule.on('uploadError', (payload) => {
  console.error('Upload failed:', payload.error);
  // Show error message in UI
});
```

## API Methods

### Public Methods

#### `getConfig(): AudioOutputConfig`
Returns the current module configuration.

#### `getState(): AudioOutputModuleState`
Returns the current module state.

#### `getDetailedState(): object`
Returns detailed state information for testing.

#### `reset(): void`
Resets all counters and state.

#### `testConnection(): Promise<boolean>`
Tests the audio connection by playing a test tone.

#### `pause(): Promise<void>`
Pauses audio playback.

#### `resume(): Promise<void>`
Resumes audio playback.

#### `stop(): Promise<void>`
Stops audio playback.

#### `getFileUploadInfo(): object`
Returns file upload server information.

**Returns:**
```typescript
{
  enabled: boolean;                          // Whether file upload is enabled
  port: number;                              // Upload server port
  host: string;                              // Upload server host
  maxFileSize: number;                       // Maximum file size in bytes
  allowedExtensions: string[];               // Allowed file extensions
  uploadCount: number;                       // Number of files uploaded
  lastUpload?: AudioFileUploadPayload;       // Last uploaded file info
}
```

### Protected Methods

#### `onSend<T>(data: T): Promise<void>`
Handles sending audio data to the output.

#### `handleTriggerEvent(event: TriggerEvent): Promise<void>`
Handles trigger events for audio playback.

#### `handleStreamingEvent(event: StreamEvent): Promise<void>`
Handles streaming events for volume control.

#### `onManualTrigger(): Promise<void>`
Handles manual trigger events.

## Examples

### Example 1: Simple Audio Playback

```javascript
// Configure the module
const config = {
  id: "audio_1",
  name: "Simple Audio",
  type: "output",
  version: "1.0.0",
  description: "Simple audio output",
  author: "User",
  sampleRate: 44100,
  channels: 2,
  format: "wav",
  volume: 0.8,
  enabled: true,
  bufferSize: 4096,
  loop: false,
  fadeInDuration: 0,
  fadeOutDuration: 0
};

// Create and initialize the module
const audioModule = new AudioOutputModule(config);
await audioModule.init();
await audioModule.start();

// Play an audio file
await audioModule.send({
  audioData: "/sounds/notification.wav",
  volume: 0.6
});
```

### Example 2: Looping Background Music

```javascript
const config = {
  // ... other config
  loop: true,
  fadeInDuration: 2000,
  fadeOutDuration: 3000
};

const audioModule = new AudioOutputModule(config);
await audioModule.init();
await audioModule.start();

// Play looping background music
await audioModule.send({
  audioData: "/music/background.mp3",
  volume: 0.4,
  loop: true,
  fadeInDuration: 3000
});
```

### Example 3: Volume Control System

```javascript
// Connect a volume control input to the audio output
// The streaming event will automatically adjust volume

// When volume control sends a value (0-100)
// The module automatically converts it to 0-1 range
// and adjusts the playback volume accordingly
```

## Error Handling

The module provides comprehensive error handling:

- **Configuration Validation**: All configuration parameters are validated on initialization
- **Audio Data Validation**: Audio data is validated before playback
- **Error Events**: All errors are emitted as `audioError` events
- **Graceful Degradation**: The module continues to function even if individual audio operations fail

### Common Error Scenarios

1. **Invalid Sample Rate**: Must be between 8000-48000 Hz
2. **Invalid Channel Count**: Must be 1 or 2
3. **Invalid Volume**: Must be between 0.0 and 1.0
4. **Invalid Buffer Size**: Must be between 256 and 16384 samples
5. **Invalid Audio Format**: Must be 'wav', 'mp3', or 'ogg'
6. **Invalid Fade Duration**: Must be between 0 and 10000 milliseconds

## Performance Considerations

- **Buffer Size**: Larger buffer sizes provide better stability but higher latency
- **Sample Rate**: Higher sample rates provide better quality but use more CPU
- **Channels**: Stereo uses more memory and CPU than mono
- **Looping**: Continuous looping may use more resources
- **Fade Effects**: Fade effects require additional processing

## Testing

The module includes comprehensive testing capabilities:

```javascript
// Test the connection
const isConnected = await audioModule.testConnection();
console.log('Audio connection:', isConnected ? 'OK' : 'Failed');

// Get detailed state
const state = audioModule.getDetailedState();
console.log('Audio state:', state);

// Reset counters
audioModule.reset();
```

## Integration

The Audio Output module integrates seamlessly with other Interactor modules:

- **HTTP Input**: Trigger audio playback via webhooks
- **OSC Input**: Control audio via OSC messages
- **Serial Input**: Audio control via serial commands
- **Time Input**: Scheduled audio playback
- **HTTP Output**: Send audio status to external systems
- **OSC Output**: Broadcast audio events via OSC

## Future Enhancements

Potential future enhancements include:

- **Audio Effects**: Reverb, echo, equalization
- **Multiple Audio Streams**: Simultaneous playback of multiple audio sources
- **Audio Recording**: Capture and save audio input
- **Audio Analysis**: Real-time audio analysis and visualization
- **Network Audio**: Streaming audio over network protocols
- **MIDI Integration**: MIDI control of audio parameters 