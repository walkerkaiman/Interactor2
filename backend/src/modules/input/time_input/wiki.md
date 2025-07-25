# Time Input Module

## Overview

The Time Input module triggers events at a specific time of day. It's useful for scheduling automated actions in interactive art installations.

## Configuration

### Parameters

- **targetTime** (string, required): The time when the trigger should fire, in 12-hour format
  - Example: "2:30 PM" for 2:30 PM
  - Must match pattern: `^(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM)$`

- **enabled** (boolean, optional): Enable or disable the time trigger
  - Default: `true`

### Example Configuration

```json
{
  "targetTime": "3:45 PM",
  "enabled": true
}
```

## Events

### Output Events

- **timeTrigger**: Emitted when the target time is reached
  - Payload:
    ```json
    {
      "targetTime": "3:45 PM",
      "currentTime": "2024-01-15T15:45:00.000Z",
      "timestamp": 1705333500000
    }
    ```

- **stateUpdate**: Emitted every second with current time and countdown
  - Payload:
    ```json
    {
      "currentTime": "2:30 PM",
      "countdown": "1h 15m 30s",
      "targetTime12Hour": "3:45 PM"
    }
    ```

## Usage Examples

### Basic Time Trigger

Configure the module to trigger at 3:45 PM daily:

```json
{
  "targetTime": "3:45 PM",
  "enabled": true
}
```

### Disabled Trigger

Keep the module configured but disabled:

```json
{
  "targetTime": "9:00 AM",
  "enabled": false
}
```

## Behavior

- The module checks the current time every second
- When the current time matches the target time, it emits a `timeTrigger` event
- The trigger fires once per day at the specified time
- If the module is disabled, no events will be emitted
- The module automatically validates the time format on initialization
- Displays current time in 12-hour format with AM/PM
- Shows countdown to next trigger time
- Uses system timezone for all time calculations

## Integration

This module can be connected to output modules to:
- Start scheduled shows or performances
- Trigger lighting sequences
- Activate audio playback
- Control other time-based interactions

## Notes

- Uses 12-hour time format with AM/PM for user-friendly display
- Time comparison is done at minute precision (seconds are ignored)
- The module will trigger once per day at the specified time
- If the server is restarted, the module will resume checking from the new start time
- Countdown automatically adjusts to show next occurrence if target time has passed today
- All times are displayed in the system's local timezone 