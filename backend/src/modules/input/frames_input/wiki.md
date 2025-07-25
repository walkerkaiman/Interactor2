# Frames Input Module

## Overview

The Frames Input module monitors sACN (Streaming ACN) frame numbers on a specified universe, typically Universe 999. It reads channels 1 and 2 as Most Significant Byte (MSB) and Least Significant Byte (LSB) respectively to extract frame numbers for triggering events or streaming data.

## How MSB/LSB Frame Extraction Works

The module combines two DMX channels to create a 16-bit unsigned integer frame number:

- **Channel 1 (MSB)**: Contains the high-order byte (bits 8-15)
- **Channel 2 (LSB)**: Contains the low-order byte (bits 0-7)

**Formula**: `frameNumber = (MSB << 8) | LSB`

### Examples:
- MSB = 1, LSB = 255 → Frame Number = (1 << 8) | 255 = 256 | 255 = 511
- MSB = 0, LSB = 100 → Frame Number = (0 << 8) | 100 = 0 | 100 = 100
- MSB = 255, LSB = 255 → Frame Number = (255 << 8) | 255 = 65280 | 255 = 65535

## Configuration

### Parameters

- **universe** (number, required): sACN universe to monitor for frame data
  - Range: 1-63999
  - Default: 999
  - Example: 999

- **enabled** (boolean, optional): Enable or disable the sACN listener
  - Default: `true`

### Example Configuration

```json
{
  "universe": 999,
  "enabled": true
}
```

## Events

### Output Events

- **frameChange**: Emitted when frame number changes (trigger mode)
  - Payload:
    ```json
    {
      "frameNumber": 1234,
      "msb": 4,
      "lsb": 210,
      "timestamp": 1705333500000,
      "frameCount": 42
    }
    ```

- **frameData**: Emitted when frame data is received
  - Payload:
    ```json
    {
      "frameNumber": 1234,
      "msb": 4,
      "lsb": 210,
      "timestamp": 1705333500000
    }
    ```

- **stateUpdate**: Emitted when module state changes
  - Payload:
    ```json
    {
      "status": "listening",
      "universe": 999,
      "currentFrame": 1234,
      "msb": 4,
      "lsb": 210,
      "frameCount": 42,
      "mode": "trigger",
      "lastUpdate": 1705333500000
    }
    ```

## Usage Examples

### Basic Frame Monitoring

Monitor Universe 999 for frame changes:

```json
{
  "universe": 999,
  "enabled": true
}
```

### Custom Universe

Monitor a different universe for frame data:

```json
{
  "universe": 1000,
  "enabled": true
}
```

## Behavior

### Trigger Mode
- Listens for sACN packets on the configured universe
- Extracts MSB and LSB from channels 1 and 2
- Combines them to form a frame number
- Emits `frameChange` event when the frame number changes
- Useful for discrete frame-based triggers

### Streaming Mode
- Continuously streams frame numbers as they are received
- Emits `frameData` for every packet received
- Useful for continuous frame monitoring and synchronization

### Frame Number Calculation
The module uses bitwise operations to combine the two channels:
```javascript
// Extract channels 1 and 2
const msb = packet.slotsData[0] || 0; // Channel 1 (MSB)
const lsb = packet.slotsData[1] || 0; // Channel 2 (LSB)

// Combine to form 16-bit frame number
const frameNumber = (msb << 8) | lsb;
```

### Error Handling
- Validates universe number range (1-63999)
- Handles missing or invalid channel data gracefully
- Logs sACN receiver errors
- Continues operation even if individual packets are malformed

## Integration

This module can be connected to output modules to:
- Trigger audio playback on specific frame numbers
- Control DMX lighting synchronized with frame changes
- Create frame-accurate show control systems
- Synchronize multiple systems using frame numbers

## Common Use Cases

### Show Control
- Monitor frame numbers from a lighting console
- Trigger events at specific frame numbers
- Synchronize audio, video, and lighting systems

### Frame-Accurate Timing
- Use frame numbers for precise timing control
- Create frame-synchronized installations
- Monitor playback position in media systems

### System Synchronization
- Use frame numbers to sync multiple Interactor instances
- Coordinate distributed systems
- Maintain timing across network boundaries

## Technical Notes

### sACN Protocol
- Uses standard sACN (E1.31) protocol
- Listens on port 5568 (default sACN port)
- Supports universes 1-63999
- Handles packet loss and network issues gracefully

### Performance
- Low latency frame number extraction
- Efficient bitwise operations
- Minimal CPU overhead
- Real-time event emission

### Network Considerations
- Requires network access to sACN traffic
- May need firewall configuration for port 5568
- Supports multicast and unicast sACN
- Handles network jitter and packet reordering

## Testing

### Manual Testing
1. Configure module for Universe 999
2. Send sACN data with varying MSB/LSB values
3. Verify frame number calculation
4. Test trigger and streaming modes
5. Verify event emission

### Example Test Data
```javascript
// Test frame number: 1234
// MSB = 4, LSB = 210
// 4 << 8 = 1024
// 1024 | 210 = 1234

const testPacket = {
  slotsData: [4, 210, ...] // MSB=4, LSB=210
};
```

## Troubleshooting

### Common Issues
- **No frame data received**: Check network connectivity and sACN source
- **Incorrect frame numbers**: Verify MSB/LSB channel assignment
- **Module not starting**: Check universe number validity and network access
- **High latency**: Check network performance and sACN packet rate

### Debug Information
The module provides detailed logging for:
- sACN receiver initialization
- Packet processing
- Frame number calculations
- Error conditions
- State changes 