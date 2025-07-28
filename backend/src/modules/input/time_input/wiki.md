# Time Input Module

## Overview

The Time Input module provides time-based triggering capabilities for interactive art installations. It supports two operating modes: **Clock mode** for triggering at specific times and **Metronome mode** for regular interval pulses. The module also includes WebSocket API support for integrating with external time sources.

## Features

- **Clock Mode**: Triggers at specific times (e.g., "2:30 PM")
- **Metronome Mode**: Pulses at regular intervals (e.g., every 1 second)
- **WebSocket API**: Connect to external time sources for dynamic time updates
- **Real-time Display**: Shows current time and countdown
- **Manual Trigger**: Support for manual triggering
- **State Persistence**: Maintains state across restarts

## Configuration

### Parameters

#### Basic Configuration

- **mode** (string, required): Operating mode
  - Options: `"clock"`, `"metronome"`
  - Default: `"clock"`

- **targetTime** (string, optional): Target time in 12-hour format
  - Format: `"2:30 PM"`, `"12:00 AM"`
  - Required for clock mode
  - Pattern: `^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM)$`

- **millisecondDelay** (number, optional): Delay between pulses in milliseconds
  - Range: 100-60000
  - Default: 1000
  - Required for metronome mode

- **enabled** (boolean, optional): Enable/disable the time trigger
  - Default: `true`

#### WebSocket API Configuration

- **apiEnabled** (boolean, optional): Enable WebSocket API for external time sources
  - Default: `false`

- **apiEndpoint** (string, optional): WebSocket endpoint for external time API
  - Format: `"wss://api.example.com/time"`, `"ws://localhost:8080/time"`
  - Pattern: `^wss?://.+`
  - Required when `apiEnabled` is `true`

### Example Configurations

#### Basic Clock Mode
```json
{
  "mode": "clock",
  "targetTime": "2:30 PM",
  "enabled": true
}
```

#### Metronome Mode
```json
{
  "mode": "metronome",
  "millisecondDelay": 2000,
  "enabled": true
}
```

#### With WebSocket API
```json
{
  "mode": "clock",
  "targetTime": "12:00 PM",
  "enabled": true,
  "apiEnabled": true,
  "apiEndpoint": "wss://time-api.example.com/stream"
}
```

## Events

### Output Events

#### timeTrigger
Emitted when target time is reached (Clock mode) or on pulse (Metronome mode)

**Payload:**
```json
{
  "mode": "clock",
  "targetTime": "2:30 PM",
  "currentTime": "2:30 PM",
  "timestamp": 1705333500000,
  "manual": false
}
```

#### stateUpdate
Emitted when module state changes

**Payload:**
```json
{
  "mode": "clock",
  "currentTime": "2:25 PM",
  "countdown": "5m 30s",
  "targetTime12Hour": "2:30 PM",
  "millisecondDelay": 1000,
  "enabled": true,
  "apiConnected": true,
  "apiData": {
    "time": "2:30 PM",
    "timestamp": 1705333500000
  }
}
```

#### apiConnected
Emitted when WebSocket API connection is established

**Payload:**
```json
{
  "endpoint": "wss://api.example.com/time",
  "timestamp": 1705333500000
}
```

#### apiDisconnected
Emitted when WebSocket API connection is lost

**Payload:**
```json
{
  "endpoint": "wss://api.example.com/time",
  "code": 1000,
  "reason": "Normal closure",
  "timestamp": 1705333500000
}
```

## WebSocket API Integration

### External API Format

The module expects external WebSocket APIs to send JSON messages in the following format:

```json
{
  "time": "2:30 PM",
  "currentTime": "2:25 PM",
  "countdown": "5m 30s",
  "timestamp": 1705333500000
}
```

### API Message Fields

- **time** (string, optional): New target time in 12-hour format
- **currentTime** (string, optional): Current time for display
- **countdown** (string, optional): Countdown string for display
- **timestamp** (number, optional): Unix timestamp

### Connection Management

The module automatically handles:
- **Connection**: Establishes WebSocket connection on startup
- **Reconnection**: Exponential backoff with up to 5 attempts
- **Error Handling**: Logs errors and continues operation
- **Graceful Disconnect**: Properly closes connections on shutdown

### Example External API Server

Here's a simple Node.js WebSocket server that provides time data:

```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send time updates every second
  const interval = setInterval(() => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const message = {
      time: "2:30 PM", // Fixed target time
      currentTime: time,
      countdown: "5m 30s", // Calculate based on target
      timestamp: now.getTime()
    };
    
    ws.send(JSON.stringify(message));
  }, 1000);
  
  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});
```

## Usage Examples

### Basic Time Trigger

Connect a time input module to trigger an audio output at 3:00 PM:

```json
{
  "id": "time-trigger-1",
  "name": "Daily Show Trigger",
  "description": "Triggers audio at 3:00 PM daily",
  "enabled": true,
  "modules": [
    {
      "id": "time-input-1",
      "moduleName": "time_input",
      "config": {
        "mode": "clock",
        "targetTime": "3:00 PM",
        "enabled": true
      }
    },
    {
      "id": "audio-output-1",
      "moduleName": "audio_output",
      "config": {
        "deviceId": "default",
        "sampleRate": 44100,
        "channels": 2,
        "format": "wav",
        "volume": 0.8,
        "enabled": true
      }
    }
  ],
  "routes": [
    {
      "id": "time-to-audio",
      "source": "time-input-1",
      "target": "audio-output-1",
      "event": "timeTrigger"
    }
  ]
}
```

### Metronome with DMX Output

Create a pulsing light effect every 2 seconds:

```json
{
  "id": "pulse-light-1",
  "name": "Pulsing Light Effect",
  "description": "Pulses DMX light every 2 seconds",
  "enabled": true,
  "modules": [
    {
      "id": "time-input-1",
      "moduleName": "time_input",
      "config": {
        "mode": "metronome",
        "millisecondDelay": 2000,
        "enabled": true
      }
    },
    {
      "id": "dmx-output-1",
      "moduleName": "dmx_output",
      "config": {
        "universe": 1,
        "brightness": 1.0,
        "protocol": {
          "type": "artnet",
          "host": "192.168.1.100",
          "port": 6454
        },
        "enabled": true
      }
    }
  ],
  "routes": [
    {
      "id": "pulse-to-dmx",
      "source": "time-input-1",
      "target": "dmx-output-1",
      "event": "timeTrigger"
    }
  ]
}
```

### External Time API Integration

Connect to an external time service for dynamic scheduling:

```json
{
  "id": "external-time-1",
  "name": "External Time Integration",
  "description": "Uses external API for time scheduling",
  "enabled": true,
  "modules": [
    {
      "id": "time-input-1",
      "moduleName": "time_input",
      "config": {
        "mode": "clock",
        "targetTime": "12:00 PM",
        "enabled": true,
        "apiEnabled": true,
        "apiEndpoint": "wss://time-api.example.com/stream"
      }
    },
    {
      "id": "audio-output-1",
      "moduleName": "audio_output",
      "config": {
        "deviceId": "default",
        "sampleRate": 44100,
        "channels": 2,
        "format": "wav",
        "volume": 0.8,
        "enabled": true
      }
    }
  ],
  "routes": [
    {
      "id": "external-time-to-audio",
      "source": "time-input-1",
      "target": "audio-output-1",
      "event": "timeTrigger"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Invalid Time Format**
   - Ensure time is in 12-hour format: `"2:30 PM"`, not `"14:30"`
   - Use proper AM/PM indicators

2. **WebSocket Connection Failed**
   - Check endpoint URL format: must start with `ws://` or `wss://`
   - Verify external API server is running
   - Check network connectivity

3. **Module Not Triggering**
   - Verify `enabled` is set to `true`
   - Check system time matches expected format
   - For metronome mode, ensure `millisecondDelay` is within range (100-60000)

4. **API Data Not Updating**
   - Verify external API sends data in expected JSON format
   - Check WebSocket connection status in logs
   - Ensure `apiEnabled` is set to `true`

### Debugging

Enable debug logging to see detailed module activity:

```bash
# Check module logs
tail -f backend/logs/interactor.log | grep "time_input"
```

### Performance Considerations

- **Metronome Mode**: High-frequency pulses (e.g., < 100ms) may impact system performance
- **WebSocket API**: Multiple concurrent connections may affect memory usage
- **State Updates**: Frequent state updates are throttled to prevent UI flooding

## API Reference

### Methods

#### `manualTrigger()`
Manually trigger the time event regardless of current time or mode.

#### `getTriggerParameters()`
Get current trigger parameters for UI display.

**Returns:**
```json
{
  "mode": "clock",
  "targetTime": "2:30 PM",
  "millisecondDelay": 1000,
  "enabled": true,
  "currentTime": "2:25 PM",
  "countdown": "5m 30s",
  "targetTime12Hour": "2:30 PM"
}
```

### State Properties

- **currentTime**: Current time in 12-hour format
- **countdown**: Time remaining until target (clock mode) or interval (metronome mode)
- **targetTime12Hour**: Target time in 12-hour format for display
- **millisecondDelay**: Delay between pulses (metronome mode)
- **enabled**: Whether module is enabled
- **apiConnected**: Whether WebSocket API is connected
- **apiData**: Last received API data 