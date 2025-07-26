# OSC Output Module

## Overview

The OSC Output module sends Open Sound Control (OSC) messages to external endpoints. It can be triggered by events from input modules or manually controlled to send OSC messages to audio software, lighting systems, or other OSC-compatible devices.

## Configuration

### Required Parameters

- **host**: Target host address for OSC messages (e.g., '127.0.0.1', '192.168.1.100')
- **port**: Target UDP port for OSC messages (1024-65535)
- **addressPattern**: Default OSC address pattern to send to (e.g., '/trigger', '/light/1/intensity')

### Optional Parameters

- **enabled**: Enable or disable the module (default: true)

## Events

### Input Events

#### oscMessage
Triggers an OSC message to be sent.

**Payload Options:**
```typescript
// Send to default address pattern
{
  value: number;
}

// Send to specific address with custom arguments
{
  address: string;
  args: any[];
}
```

### Output Events

#### oscSent
Emitted when an OSC message is sent successfully.

**Payload:**
```typescript
{
  address: string;
  args: any[];
  timestamp: number;
  messageCount: number;
}
```

#### oscError
Emitted when an OSC message fails to send.

**Payload:**
```typescript
{
  host: string;
  port: number;
  address: string;
  error: string;
  timestamp: number;
}
```

#### stateUpdate
Emitted when module state changes.

**Payload:**
```typescript
{
  status: string;
  messageCount: number;
  errorCount: number;
  lastMessage?: OscOutputMessage;
  lastError?: OscOutputErrorData;
}
```

## Usage

### Basic Configuration

```json
{
  "host": "127.0.0.1",
  "port": 8000,
  "addressPattern": "/trigger",
  "enabled": true
}
```

### Connecting to Audio Software

For connecting to audio software like Ableton Live, Max/MSP, or Pure Data:

```json
{
  "host": "127.0.0.1",
  "port": 9000,
  "addressPattern": "/live/play",
  "enabled": true
}
```

### Connecting to Lighting Systems

For connecting to lighting control systems:

```json
{
  "host": "192.168.1.100",
  "port": 8000,
  "addressPattern": "/light/intensity",
  "enabled": true
}
```

## Examples

### Trigger Mode

When receiving trigger events from input modules, the OSC output module will:

1. Extract the address from the event payload (or use the default)
2. Convert the payload to OSC arguments
3. Send the OSC message to the target host/port

**Example Trigger Event:**
```typescript
{
  type: 'trigger',
  payload: {
    address: '/button/press',
    args: [1, 'pressed']
  },
  timestamp: 1640995200000,
  source: 'http_input'
}
```

### Streaming Mode

When receiving streaming events, the OSC output module will:

1. Use the default address pattern
2. Send the numeric value as the first argument

**Example Streaming Event:**
```typescript
{
  type: 'stream',
  value: 0.75,
  timestamp: 1640995200000,
  source: 'serial_input'
}
```

### Manual Trigger

You can manually trigger OSC messages for testing:

```typescript
// Send a test message
await oscOutputModule.manualTrigger();

// Send to specific address
await oscOutputModule.sendToAddress('/test/button', [1, 'pressed']);
```

## Data Conversion

The module automatically converts different data types to OSC arguments:

- **Numbers**: Sent as-is
- **Strings**: Sent as strings
- **Booleans**: Converted to 1 (true) or 0 (false)
- **Arrays**: Sent as array of arguments
- **Objects**: Converted to JSON string, or extract 'value' property if present

## Error Handling

The module handles various error conditions:

- **Invalid host/port**: Validation during initialization
- **Network errors**: Emitted as oscError events
- **Invalid address patterns**: Must start with '/'
- **Connection failures**: Automatic retry and status updates

## Testing

Use the test connection feature to verify connectivity:

```typescript
const isConnected = await oscOutputModule.testConnection();
console.log('OSC connection test:', isConnected ? 'PASSED' : 'FAILED');
```

## Common OSC Address Patterns

### Audio Software
- `/live/play` - Play clip in Ableton Live
- `/live/stop` - Stop playback
- `/live/tempo` - Set tempo
- `/live/volume` - Set track volume

### Lighting Systems
- `/light/intensity` - Set light intensity
- `/light/color` - Set light color
- `/light/pattern` - Set light pattern
- `/light/strobe` - Control strobe effect

### MIDI Control
- `/midi/note` - Send MIDI note
- `/midi/cc` - Send MIDI control change
- `/midi/program` - Change MIDI program

## Troubleshooting

### Common Issues

1. **"OSC sender is not ready"**
   - Check if the module is enabled
   - Verify host and port are correct
   - Ensure target application is listening

2. **"Invalid host address"**
   - Use valid IP addresses or 'localhost'
   - Check network connectivity

3. **"Invalid OSC address pattern"**
   - Address patterns must start with '/'
   - Avoid special characters except '/'

### Debug Mode

Enable debug logging to see detailed OSC message information:

```typescript
// The module will log all sent messages and errors
// Check the application logs for detailed information
```

## Integration Examples

### With HTTP Input Module

```json
{
  "interactions": [
    {
      "input": "http_input",
      "output": "osc_output",
      "mapping": {
        "trigger": {
          "address": "/webhook/trigger",
          "args": ["${payload.value}"]
        }
      }
    }
  ]
}
```

### With Serial Input Module

```json
{
  "interactions": [
    {
      "input": "serial_input",
      "output": "osc_output",
      "mapping": {
        "stream": {
          "address": "/sensor/value",
          "args": ["${value}"]
        }
      }
    }
  ]
}
```

This module provides a robust way to send OSC messages to external systems, making it easy to integrate Interactor with audio software, lighting systems, and other OSC-compatible devices. 