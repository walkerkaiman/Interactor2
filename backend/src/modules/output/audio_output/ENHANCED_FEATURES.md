
# Enhanced Audio Output Module Features

## Overview

The Audio Output module has been enhanced with comprehensive file management capabilities, network file upload support, and an improved user interface for better audio file handling.

## New Features

### 1. Network File Upload Server

- **HTTP Upload Endpoint**: `POST http://localhost:3001/upload`
- **File Type Validation**: Supports `.wav`, `.mp3`, `.ogg`, `.m4a`, `.flac`
- **Size Limits**: Configurable maximum file size (default: 50MB)
- **Progress Tracking**: Real-time upload progress indication
- **Error Handling**: Comprehensive error messages for invalid files

### 2. File Management API

#### List Files
- **Endpoint**: `GET http://localhost:3001/files`
- **Response**: List of available audio files with metadata
- **Real-time Updates**: WebSocket events for file list changes

#### Delete Files
- **Endpoint**: `DELETE http://localhost:3001/files/{filename}`
- **Validation**: Only allows deletion of supported audio files
- **Safety**: Prevents deletion of non-existent files

#### File Metadata
- **Endpoint**: `GET http://localhost:3001/files/{filename}/metadata`
- **Information**: File size, format, duration, sample rate, channels
- **Caching**: Metadata is cached for performance

### 3. Enhanced Frontend UI

#### File Upload Section
- **Drag & Drop**: Visual upload zone with drag-and-drop support
- **File Browser**: Traditional file picker as backup
- **Progress Bar**: Real-time upload progress visualization
- **Error Display**: Clear error messages for failed uploads

#### File Selection
- **Dropdown Menu**: Populated with available audio files
- **File Information**: Shows file size, format, and duration
- **Auto-selection**: Automatically selects newly uploaded files
- **Search/Filter**: Text filtering for large file lists

#### Volume Control
- **Slider Control**: Horizontal volume slider (0-100%)
- **Numeric Display**: Shows current volume percentage
- **Mute Button**: Quick mute/unmute toggle
- **Preset Buttons**: Quick access to common volume levels (25%, 50%, 75%, 100%)

#### File Management
- **File List**: Table view of uploaded files
- **Delete Buttons**: Individual delete buttons for each file
- **File Details**: Shows upload date, size, format, duration
- **Bulk Operations**: Support for multiple file selection

### 4. Real-time Updates

#### WebSocket Events
- `fileUploaded`: Emitted when a file is uploaded successfully
- `fileListUpdated`: Emitted when the file list changes
- `fileDeleted`: Emitted when a file is deleted
- `fileMetadata`: Emitted when file metadata is retrieved
- `uploadError`: Emitted when upload fails

#### UI Synchronization
- **Automatic Updates**: UI updates automatically when files change
- **State Persistence**: File selections and volume settings are saved
- **Error Recovery**: Graceful handling of network errors

## Configuration Options

### File Upload Settings
```json
{
  "enableFileUpload": true,
  "uploadPort": 3001,
  "uploadHost": "0.0.0.0",
  "maxFileSize": 52428800,
  "allowedExtensions": [".wav", ".mp3", ".ogg", ".m4a", ".flac"]
}
```

### Audio Playback Settings
```json
{
  "volume": 1.0,
  "selectedFile": "",
  "enabled": true,
  "loop": false,
  "fadeInDuration": 0,
  "fadeOutDuration": 0
}
```

## API Usage Examples

### Upload a File
```javascript
const formData = new FormData();
formData.append('audio', file);

const response = await fetch('http://localhost:3001/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Uploaded:', result.data.filename);
```

### List Files
```javascript
const response = await fetch('http://localhost:3001/files');
const data = await response.json();
console.log('Available files:', data.data.files);
```

### Delete a File
```javascript
const response = await fetch('http://localhost:3001/files/test.wav', {
  method: 'DELETE'
});
const result = await response.json();
console.log('Deleted:', result.data.filename);
```

### Get File Metadata
```javascript
const response = await fetch('http://localhost:3001/files/test.wav/metadata');
const data = await response.json();
console.log('Metadata:', data.data);
```

## Native Playback Architecture (2025-08 Update)

### Why Native Playback?
The earlier implementation relied on spawning a system media-player (CLI) each time an audio cue was needed. This worked, but it introduced platform-specific requirements and noticeable startup latency.

The module now performs **all decoding and playback inside the Node process**:

| Component          | Purpose                                   |
|--------------------|-------------------------------------------|
| `prism-media`      | Wraps FFmpeg and exposes a decoded PCM stream. |
| `ffmpeg-static`    | Bundled cross-platform FFmpeg binary (no external install). |
| `wav`              | Lightweight WAV header parser → PCM.      |
| `speaker`          | Writes 16-bit PCM directly to the host audio device (CoreAudio / WASAPI / ALSA). |

### Runtime Flow
1. **Trigger received** (manual button or routed input).
2. Audio file path is resolved.  
   • `.wav` → streamed through `wav.Reader` (header → PCM).  
   • `.mp3` → streamed through `FFmpeg` (`-f s16le … -`).
3. Decoded PCM is piped to a `Speaker` instance.  
4. On `end` event the module updates its state (`isPlaying = false`) and emits an `audioOutput` event.

No external processes are spawned; latency is dominated only by FFmpeg decode startup (usually < 50 ms).

### Upload-time Transcoding
To guarantee instant playback the module **converts uploaded MP3s to LPCM WAV** once, server-side:

```text
POST /upload (audio/mpeg)
            ▼
assets/12345_original.mp3            ⇢   ffmpeg -i … 12345_converted.wav
            ▼                                   ▼
         deleted                  final file in assets/
```

• Transcoding is invoked via `execFile(ffmpeg-static)` in `saveAudioFile()`.  
• Original MP3 is removed after successful conversion.  
• WAVs remain untouched.  
• All entries returned by `getAvailableAudioFiles()` are therefore WAV, ensuring a single playback path.

### Configuration Hints
```jsonc
{
  "sampleRate": 44100,      // DECODING & SPEAKER OUTPUT
  "channels":   2,
  "selectedFile": "12345_converted.wav"
}
```

> You can still upload MP3s; the module handles the format internally.

---

## Security Considerations

### File Validation
- **Extension Checking**: Only allows supported audio file extensions
- **Size Limits**: Prevents oversized file uploads
- **Content Validation**: Basic file header validation

### Network Security
- **CORS Support**: Configured for cross-origin requests
- **Error Handling**: Prevents information leakage
- **Rate Limiting**: Built-in protection against abuse

## Performance Optimizations

### File Handling
- **Streaming Uploads**: Large files are handled efficiently
- **Metadata Caching**: Reduces repeated file system access
- **Background Processing**: Non-blocking file operations

### UI Performance
- **Virtual Scrolling**: Efficient handling of large file lists
- **Debounced Updates**: Prevents excessive re-renders
- **Memory Management**: Proper cleanup of file references

## Troubleshooting

### Common Issues

1. **Upload Fails**
   - Check file size limits
   - Verify file extension is supported
   - Ensure upload server is running

2. **Files Not Appearing**
   - Refresh the file list
   - Check file permissions in assets folder
   - Verify file format is supported

3. **Volume Not Working**
   - Check audio device configuration
   - Verify module is enabled
   - Test with different audio files

### Debug Information
- **Server Logs**: Check backend console for errors
- **Network Tab**: Monitor API requests in browser
- **WebSocket Events**: Verify real-time updates are working

## Future Enhancements

### Planned Features
- **Audio Preview**: Waveform visualization
- **Playlist Support**: Multiple file sequences
- **Advanced Metadata**: More detailed audio information
- **Cloud Storage**: Integration with external storage
- **Batch Operations**: Multiple file upload/delete

### Performance Improvements
- **Compression**: Automatic audio file compression
- **Caching**: Improved file metadata caching
- **Streaming**: Real-time audio streaming support 