# Time Input Module

## Overview

The Time Input module triggers events at a specific time of day. It's useful for scheduling automated actions in interactive art installations.

## Configuration

### Parameters

- **targetTime** (string, required): The time when the trigger should fire, in HH:MM format (24-hour)
  - Example: "14:30" for 2:30 PM
  - Must match pattern: `^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$`

- **enabled** (boolean, optional): Enable or disable the time trigger
  - Default: `true`

### Example Configuration

```json
{
  "targetTime": "15:45",
  "enabled": true
}
```

## Events

### Output Events

- **timeTrigger**: Emitted when the target time is reached
  - Payload:
    ```json
    {
      "targetTime": "15:45",
      "currentTime": "2024-01-15T15:45:00.000Z",
      "timestamp": 1705333500000
    }
    ```

## Usage Examples

### Basic Time Trigger

Configure the module to trigger at 3:45 PM daily:

```json
{
  "targetTime": "15:45",
  "enabled": true
}
```

### Disabled Trigger

Keep the module configured but disabled:

```json
{
  "targetTime": "09:00",
  "enabled": false
}
```

## Behavior

- The module checks the current time every second
- When the current time matches the target time, it emits a `timeTrigger` event
- The trigger fires once per day at the specified time
- If the module is disabled, no events will be emitted
- The module automatically validates the time format on initialization

## Integration

This module can be connected to output modules to:
- Start scheduled shows or performances
- Trigger lighting sequences
- Activate audio playback
- Control other time-based interactions

## Notes

- Uses 24-hour time format for consistency
- Time comparison is done at minute precision (seconds are ignored)
- The module will trigger once per day at the specified time
- If the server is restarted, the module will resume checking from the new start time 