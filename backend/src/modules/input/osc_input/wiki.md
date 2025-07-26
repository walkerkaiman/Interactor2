# OSC Input Module

## Overview

The OSC Input module listens for Open Sound Control (OSC) messages on a configurable UDP port and address. It supports both trigger and streaming modes, making it versatile for interactive art installations that need to respond to external OSC sources.

### Quick Guide for Artists

- Drag “OSC Input” into your patch.
- Set the **Port** (e.g., `8000`); leave host `0.0.0.0` to accept from anywhere.
- In your OSC app send numeric values to the configured address (default `/value`).
- Wire the output to control lights, audio, or visuals.

### Developer Deep Dive

Directory: `backend/src/modules/input/osc_input/`

| Component | Purpose |
|-----------|---------|
| `node-osc` | Listens for UDP OSC packets. |
| `handleOscMessage()` | Splits trigger vs stream modes and extracts numeric data. |
| Types | Uses `OscInputTriggerPayload` & `OscInputStreamPayload` defined in shared types. |

Extend by adding bundle support or multi-argument parsing.

---

## Configuration

### Parameters

- **port** (number, required): UDP port to listen for OSC messages
  - Range: 1024-65535
  - Default: 8000
  - Example: 8000

- **host** (string, required): Host address to bind to
  - Default: "0.0.0.0" (listen on all interfaces)
  - Examples: "0.0.0.0", "localhost", "127.0.0.1", "192.168.1.100"

- **addressPattern** (string, required): OSC address pattern to match
  - Default: "/trigger"
  - Examples: "/trigger", "/trigger/*", "/sensor/1", "*" (match all)

- **enabled** (boolean, optional): Enable or disable the OSC listener
  - Default: `true`

### Example Configuration

```json
{
  "port": 8000,
  "host": "0.0.0.0",
  "addressPattern": "/trigger/*",
  "enabled": true
}
```

## Events

### Output Events

- **oscMessage**: Emitted when any OSC message is received
  - Payload:
    ```json
    {
      "address": "/trigger/button1",
      "args": [1],
      "timestamp": 1705333500000
    }
    ```

- **oscTrigger**: Emitted when OSC message matches address pattern (trigger mode)
  - Payload:
    ```json
    {
      "address": "/trigger/button1",
      "args": [1],
      "timestamp": 1705333500000,
      "messageCount": 42
    }
    ```

- **stateUpdate**: Emitted when module state changes
  - Payload:
    ```json
    {
      "status": "listening",
      "port": 8000,
      "host": "0.0.0.0",
      "addressPattern": "/trigger/*",
      "lastMessage": {
        "address": "/trigger/button1",
        "args": [1],
        "timestamp": 1705333500000
      },
      "messageCount": 42,
      "mode": "trigger"
    }
    ```

## Usage Examples

### Basic OSC Trigger

Configure the module to trigger on specific OSC addresses:

```json
{
  "port": 8000,
  "host": "0.0.0.0",
  "addressPattern": "/trigger",
  "enabled": true
}
```

### Wildcard Pattern Matching

Listen for all addresses starting with "/sensor/":

```json
{
  "port": 8000,
  "host": "0.0.0.0",
  "addressPattern": "/sensor/*",
  "enabled": true
}
```

### Local Network Only

Bind to a specific network interface:

```json
{
  "port": 8000,
  "host": "192.168.1.100",
  "addressPattern": "/trigger/*",
  "enabled": true
}
```

## Behavior

### Trigger Mode
- Listens for OSC messages on the configured port and host
- When a message matches the address pattern, emits an `oscTrigger` event
- Useful for discrete actions like button presses, scene changes, etc.

### Streaming Mode
- Continuously streams OSC message data when address pattern matches
- Uses the first argument of the OSC message as the stream value
- Useful for continuous data like sensor readings, fader positions, etc.

### Address Pattern Matching
- **Exact match**: `/trigger` matches only `/trigger`
- **Wildcard suffix**: `/trigger/*` matches `/trigger/button1`, `/trigger/button2`, etc.
- **Match all**: `*` matches any OSC address
- **Prefix match**: `/sensor/` matches `/sensor/1`, `/sensor/temperature`, etc.

### Message Handling
- All incoming OSC messages are logged and counted
- Message arguments are preserved and passed through events
- Timestamps are added to all messages
- Error handling for malformed OSC messages

## Integration

This module can be connected to output modules to:
- Trigger audio playback from OSC messages
- Control DMX lighting via OSC commands
- Send OSC messages to other devices
- Create interactive installations with external controllers

## Common OSC Sources

- **TouchOSC**: Mobile app for creating custom OSC interfaces
- **Max/MSP**: Audio/visual programming environment
- **Pure Data**: Visual programming language
- **Arduino**: With OSC library for hardware sensors
- **Processing**: Creative coding platform
- **Ableton Live**: Digital audio workstation
- **Qlab**: Show control software

## Testing OSC Messages

You can test the module using various OSC tools:

### Using Python (with python-osc)
```python
from pythonosc import udp_client

client = udp_client.SimpleUDPClient("127.0.0.1", 8000)
client.send_message("/trigger/button1", 1)
```

### Using Node.js (with osc)
```javascript
const osc = require('osc');

const udpPort = new osc.UDPPort({
  remoteAddress: "127.0.0.1",
  remotePort: 8000
});

udpPort.open();
udpPort.send({
  address: "/trigger/button1",
  args: [1]
});
```

## Notes

- Uses the `osc` Node.js library for reliable OSC communication
- Supports both UDP and TCP OSC (currently UDP only)
- Automatically handles OSC message parsing and validation
- Provides real-time status updates and message counting
- Can handle high-frequency OSC messages efficiently
- Includes error handling for network issues and malformed messages
- Supports IPv4 and IPv6 addresses
- Message counter can be reset using the `reset()` method 