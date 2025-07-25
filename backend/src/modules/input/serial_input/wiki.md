# Serial Input Module

## Overview

The Serial Input module monitors serial data from hardware sensors and devices via RS-232/RS-485 communication. It supports both trigger and streaming modes, with sophisticated threshold-based triggering using configurable logic operators. This module is ideal for integrating Arduino, sensors, and other serial-enabled hardware into interactive installations.

## Configuration

### Parameters

- **port** (string, required): Serial port to monitor
  - Examples: "COM1" (Windows), "/dev/ttyUSB0" (Linux), "/dev/tty.usbserial" (macOS)
  - Default: "COM1"

- **baudRate** (number, required): Baud rate for serial communication
  - Range: 9600-115200
  - Common values: 9600, 19200, 38400, 57600, 115200
  - Default: 9600

- **logicOperator** (string, required): Logic operator for threshold comparison
  - Options: ">", "<", "="
  - Default: ">"

- **threshold** (number, required): Threshold value for trigger mode
  - Default: 100

- **enabled** (boolean, optional): Enable or disable the serial listener
  - Default: `true`

### Example Configuration

```json
{
  "port": "COM3",
  "baudRate": 9600,
  "logicOperator": ">",
  "threshold": 50,
  "enabled": true
}
```

## Events

### Output Events

- **serialData**: Emitted when serial data is received
  - Payload:
    ```json
    {
      "value": 75.5,
      "rawData": "75.5",
      "timestamp": 1705333500000
    }
    ```

- **thresholdTrigger**: Emitted when value crosses threshold (trigger mode)
  - Payload:
    ```json
    {
      "value": 75.5,
      "rawData": "75.5",
      "threshold": 50,
      "operator": ">",
      "timestamp": 1705333500000,
      "dataCount": 42
    }
    ```

- **stateUpdate**: Emitted when module state changes
  - Payload:
    ```json
    {
      "status": "listening",
      "port": "COM3",
      "baudRate": 9600,
      "currentValue": 75.5,
      "threshold": 50,
      "operator": ">",
      "dataCount": 42,
      "mode": "trigger",
      "lastUpdate": 1705333500000
    }
    ```

## Usage Examples

### Basic Threshold Trigger

Monitor a temperature sensor and trigger when temperature exceeds 25°C:

```json
{
  "port": "COM3",
  "baudRate": 9600,
  "logicOperator": ">",
  "threshold": 25,
  "enabled": true
}
```

### Range Detection

Trigger when sensor value falls below 10:

```json
{
  "port": "COM4",
  "baudRate": 19200,
  "logicOperator": "<",
  "threshold": 10,
  "enabled": true
}
```

### Exact Value Matching

Trigger when sensor reads exactly 100:

```json
{
  "port": "COM5",
  "baudRate": 9600,
  "logicOperator": "=",
  "threshold": 100,
  "enabled": true
}
```

## Behavior

### Trigger Mode
- Listens for serial data on the configured port
- Parses incoming data as numeric values
- Compares values against threshold using the specified logic operator
- Emits `thresholdTrigger` event when condition is met
- Prevents duplicate triggers until condition becomes false again
- Useful for discrete sensor-based triggers

### Streaming Mode
- Continuously streams all received serial values
- Emits `serialData` for every received value
- Useful for continuous monitoring and data logging

### Logic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `>` | Greater than | Value > 50 |
| `<` | Less than | Value < 50 |
| `=` | Equal to | Value = 50 |

### Data Processing
The module processes incoming serial data as follows:
1. Receives raw serial data as Buffer
2. Converts to string and trims whitespace
3. Attempts to parse as numeric value
4. Ignores non-numeric data with warning
5. Compares parsed value against threshold
6. Emits appropriate events based on mode and conditions

### Error Handling
- Validates baud rate range (9600-115200)
- Validates logic operator against allowed values
- Handles serial port errors gracefully
- Logs warnings for non-numeric data
- Continues operation even if individual data points are malformed

## Integration

This module can be connected to output modules to:
- Trigger audio playback when sensor values exceed thresholds
- Control DMX lighting based on sensor readings
- Send HTTP requests when conditions are met
- Create sensor-driven interactive installations

## Common Use Cases

### Environmental Monitoring
- Temperature sensors triggering cooling systems
- Humidity sensors controlling dehumidifiers
- Light sensors adjusting lighting levels
- Motion sensors triggering security systems

### Industrial Control
- Pressure sensors monitoring equipment
- Level sensors controlling pumps
- Temperature sensors in manufacturing processes
- Vibration sensors for predictive maintenance

### Interactive Art
- Proximity sensors triggering audio/visual effects
- Pressure sensors controlling projection mapping
- Motion sensors activating kinetic sculptures
- Touch sensors triggering interactive displays

## Technical Notes

### Serial Communication
- Uses Node.js `serialport` library
- Supports standard RS-232/RS-485 protocols
- Handles common baud rates (9600-115200)
- Cross-platform port naming support
- Automatic port detection available

### Performance
- Low latency serial data processing
- Efficient numeric parsing
- Minimal CPU overhead
- Real-time event emission

### Hardware Considerations
- Requires compatible serial hardware
- May need USB-to-serial adapters
- Check device documentation for baud rate requirements
- Ensure proper cable connections

## Testing

### Manual Testing
1. Connect serial device (Arduino, sensor, etc.)
2. Configure module with correct port and baud rate
3. Send test data through serial connection
4. Verify threshold triggering behavior
5. Test different logic operators
6. Verify event emission

### Example Arduino Code
```cpp
// Arduino sketch for testing
void setup() {
  Serial.begin(9600);
}

void loop() {
  // Send random values for testing
  int sensorValue = random(0, 200);
  Serial.println(sensorValue);
  delay(1000);
}
```

### Example Python Test Script
```python
import serial
import time
import random

# Test serial communication
ser = serial.Serial('COM3', 9600, timeout=1)

for i in range(10):
    value = random.randint(0, 200)
    ser.write(f"{value}\n".encode())
    time.sleep(1)

ser.close()
```

## Troubleshooting

### Common Issues
- **Port not found**: Check device manager (Windows) or `ls /dev/tty*` (Linux/macOS)
- **Permission denied**: Run with appropriate permissions or add user to dialout group
- **Wrong baud rate**: Check device documentation for correct baud rate
- **No data received**: Verify cable connections and device power
- **Non-numeric data**: Ensure device sends numeric values only

### Debug Information
The module provides detailed logging for:
- Serial port initialization
- Data reception and parsing
- Threshold comparisons
- Error conditions
- State changes

### Port Discovery
Use the static method to discover available ports:
```javascript
const availablePorts = await SerialInputModule.getAvailablePorts();
console.log('Available ports:', availablePorts);
``` 