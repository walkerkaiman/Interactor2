# DMX Output Module

## Overview

The DMX Output module is a powerful output module that allows you to control DMX lighting fixtures using CSV files containing frame data. It supports multiple DMX protocols (Art-Net, sACN, DMX512) and provides both trigger and streaming modes for playback.

### Quick Guide for Artists

1. Drop “DMX Output” into the canvas.
2. Click **Upload CSV** and select your frame file exported from your lighting desk.
3. Choose **Protocol** (Art-Net, sACN, or DMX512), **Universe**, and Brightness.
4. Use Trigger mode to step through frames or Streaming mode to jump to any frame based on an input value.

### Developer Deep Dive

Directory: `backend/src/modules/output/dmx_output/`

| Piece | Role |
|-------|------|
| CSV loader | `parseCsvFile()` caches frames (512 channels max). |
| Protocol drivers | `sendArtNet()`, `sendSacn()`, `sendDmx512()` abstract network vs serial output. |
| Playback engine | Keeps an internal frame pointer & brightness multiplier. |
| State events | Emits `stateUpdate` for UI progress bars and diagnostics. |

Enhance with live editing, RDM feedback, or compressed file formats.

---

## Features

- **CSV File Upload**: Upload CSV files containing DMX frame data (0-255 values per channel)
- **Dual Mode Support**: 
  - **Trigger Mode**: Increment through frames sequentially on each trigger event
  - **Streaming Mode**: Use incoming values as frame indices with proper modulus wrapping
- **Brightness Control**: Adjustable brightness multiplier (0.0-1.0) applied to all channels
- **Multiple Protocols**: Support for Art-Net, sACN, and DMX512 protocols
- **File Management**: Built-in file upload server for easy CSV file management
- **Frame Control**: Manual frame selection and playback control
- **Real-time Monitoring**: Live status updates and error reporting

## Configuration

### Basic Settings

- **universe**: DMX universe number (1-512)
- **brightness**: Brightness level multiplier (0.0-1.0)
- **enabled**: Enable/disable the module

### Protocol Configuration

The module supports three DMX protocols:

#### Art-Net
```json
{
  "protocol": {
    "type": "artnet",
    "host": "192.168.1.100",
    "port": 6454
  }
}
```

#### sACN (Streaming ACN)
```json
{
  "protocol": {
    "type": "sACN",
    "host": "192.168.1.100",
    "port": 5568
  }
}
```

#### DMX512 (Serial)
```json
{
  "protocol": {
    "type": "dmx512",
    "serialPort": "COM3",
    "baudRate": 57600
  }
}
```

### File Upload Settings

- **enableFileUpload**: Enable/disable the file upload server
- **uploadPort**: Port for the file upload server (default: 3001)
- **uploadHost**: Host for the file upload server (default: localhost)
- **maxFileSize**: Maximum file size in bytes (default: 10MB)
- **allowedExtensions**: Allowed file extensions (default: [".csv"])

## CSV File Format

The module expects CSV files where:
- Each row represents a DMX frame
- Each column represents a DMX channel (1-512)
- Values should be integers between 0-255
- Missing values are treated as 0
- Extra channels beyond 512 are ignored

### Example CSV File
```csv
255,128,64,0,0,0,0,0
128,255,128,64,0,0,0,0
64,128,255,128,64,0,0,0
0,64,128,255,128,64,0,0
```

This creates a 4-frame sequence with a moving light pattern.

## Events

### Input Events

#### dmxFrame
Triggers a DMX frame. In trigger mode, this advances to the next frame in the sequence.

### Output Events

#### dmxSent
Emitted when a DMX frame is sent successfully.

**Payload:**
```typescript
{
  universe: number;
  channels: number[];
  brightness: number;
  frameNumber: number;
  totalFrames: number;
  timestamp: number;
  frameCount: number;
}
```

#### dmxError
Emitted when a DMX frame fails to send.

**Payload:**
```typescript
{
  universe: number;
  error: string;
  context: string;
  timestamp: number;
}
```

#### fileUploaded
Emitted when a DMX file is uploaded successfully.

**Payload:**
```typescript
{
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  filePath: string;
  frameCount: number;
  channelCount: number;
  timestamp: number;
  availableFiles: string[];
}
```

#### stateUpdate
Emitted when module state changes.

## Usage

### 1. Basic Setup

1. Configure the module with your DMX protocol settings
2. Enable the module
3. Upload a CSV file using the file upload server

### 2. File Upload

The module provides a built-in HTTP server for file uploads:

- **Upload endpoint**: `POST http://localhost:3001/upload`
- **List files**: `GET http://localhost:3001/files`
- **Load file**: `POST http://localhost:3001/load/{filename}`

### 3. Trigger Mode

In trigger mode, each trigger event advances to the next frame in the sequence:

```typescript
// Module automatically increments frame on each trigger
// Frame 0 → Frame 1 → Frame 2 → Frame 0 (wraps around)
```

### 4. Streaming Mode

In streaming mode, the incoming value is used as the frame index:

```typescript
// Value 0 → Frame 0
// Value 1 → Frame 1
// Value 10 → Frame 10 (or wraps if sequence is shorter)
// Value 0.5 → Frame 0 (floored)
```

### 5. Brightness Control

The brightness setting is applied to all channels:

```typescript
// Original channel value: 255
// Brightness setting: 0.5
// Final channel value: 128 (255 * 0.5)
```

## API Methods

### Public Methods

#### `loadFile(filename: string): Promise<boolean>`
Load a DMX file by name.

#### `getFiles(): string[]`
Get list of available files.

#### `setBrightness(brightness: number): void`
Set brightness level (0.0-1.0).

#### `getBrightness(): number`
Get current brightness level.

#### `setCurrentFrame(frame: number): void`
Set current frame number.

#### `getCurrentFrame(): number`
Get current frame number.

#### `getTotalFrames(): number`
Get total number of frames in loaded sequence.

#### `getDmxSequence(): DmxFrame[]`
Get the loaded DMX sequence.

#### `testConnection(): Promise<boolean>`
Test the DMX connection.

#### `reset(): void`
Reset all counters and state.

## Examples

### Example Configuration

```json
{
  "universe": 1,
  "brightness": 0.8,
  "protocol": {
    "type": "artnet",
    "host": "192.168.1.100",
    "port": 6454
  },
  "enabled": true,
  "enableFileUpload": true,
  "uploadPort": 3001,
  "uploadHost": "localhost"
}
```

### Example Usage

```typescript
// Create module
const dmxModule = new DmxOutputModule(config);

// Initialize and start
await dmxModule.init();
await dmxModule.start();

// Upload file via HTTP
// POST http://localhost:3001/upload with CSV file

// Load file
await dmxModule.loadFile('light_show.csv');

// Set brightness
dmxModule.setBrightness(0.7);

// Manual trigger (advances frame in trigger mode)
await dmxModule.manualTrigger();

// Send specific frame (in streaming mode)
await dmxModule.send(5); // Send frame 5
```

## Error Handling

The module provides comprehensive error handling:

- **Configuration validation**: All settings are validated on initialization
- **File validation**: CSV files are parsed and validated
- **Connection errors**: DMX connection failures are reported
- **Frame bounds**: Frame indices are automatically wrapped using modulus

## Troubleshooting

### Common Issues

1. **"No DMX sequence loaded"**: Upload a CSV file first
2. **"DMX connection is not ready"**: Check protocol configuration
3. **"Invalid brightness level"**: Brightness must be between 0.0 and 1.0
4. **"File type not allowed"**: Only CSV files are supported

### Debug Tips

- Check the module logs for detailed error messages
- Verify protocol settings (IP, port, serial port)
- Ensure CSV file format is correct
- Test connection using `testConnection()` method

## Performance Considerations

- Large CSV files (>10MB) may take time to parse
- Frame sending is optimized for real-time performance
- Brightness calculations are applied efficiently
- File upload server has configurable size limits

## Future Enhancements

- Support for additional file formats (JSON, XML)
- Real-time DMX visualization
- Frame interpolation and easing
- MIDI synchronization
- Network discovery for Art-Net/sACN devices 