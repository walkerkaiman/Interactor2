# Time Input Module

## Purpose
The Time Input module is a **countdown timer and trigger module** that provides time-based triggering for other modules. It does NOT display current time - that is not its purpose.

## Functionality

### Clock Mode
- **Purpose**: Triggers at a specific time each day
- **Display**: Shows countdown to target time (e.g., "2h 15m 30s")
- **Trigger**: Fires once per day at the specified time
- **Configuration**: Target time in 12-hour format (e.g., "2:30 PM")

### Metronome Mode
- **Purpose**: Triggers at regular intervals
- **Display**: Shows countdown to next trigger (e.g., "3s to next")
- **Trigger**: Fires every N milliseconds (configurable)
- **Configuration**: Millisecond delay (100-60000ms)

## Important Design Principles

### ✅ What This Module DOES:
- Calculate and display countdown timers
- Trigger events at specified times/intervals
- Provide time-based automation
- Show time remaining until next trigger

### ❌ What This Module DOES NOT:
- Display current time (that's not its purpose)
- Show clock faces or current time indicators
- Act as a general time display widget

## UI Components

### Status Display
- **Countdown**: Shows time remaining until next trigger
- **Mode**: Clock or Metronome indicator
- **Enabled/Disabled**: Status indicator

### Configuration
- **Mode Selection**: Clock vs Metronome
- **Target Time**: For clock mode (12-hour format)
- **Millisecond Delay**: For metronome mode (100-60000ms)

## Technical Implementation

### Backend
- `TimeEngine`: Handles timing logic and triggers
- `updateTimeDisplay()`: Calculates countdown only
- `emitRuntimeStateUpdate()`: Sends countdown data to frontend

### Frontend
- `useModuleRuntime()`: Receives real-time countdown updates
- `CountdownDisplay`: Shows countdown timer
- No current time display components

## Common Mistakes to Avoid

1. **❌ Adding current time display** - This module is for countdowns, not current time
2. **❌ Using `useInstanceData` for countdown** - Use `useModuleRuntime` for real-time updates
3. **❌ Emitting current time data** - Only emit countdown data
4. **❌ Creating clock face UI** - This is a timer, not a clock

## Integration Examples

### With Audio Output
- Time Input (metronome, 4000ms) → Audio Output
- Result: Audio plays every 4 seconds

### With Display Module
- Time Input (clock, 12:00 PM) → Display Module
- Result: Display updates at noon daily

## State Management

### Runtime Data (WebSocket Updates)
```typescript
{
  countdown: "3s to next"  // Only countdown, no current time
}
```

### Configuration Data
```typescript
{
  mode: "metronome",
  millisecondDelay: 4000,
  enabled: true
}
```

## Troubleshooting

### Countdown Not Updating
1. Check if `useModuleRuntime` is used (not `useInstanceData`)
2. Verify WebSocket connection is active
3. Check backend TimeEngine is running
4. Ensure module is enabled

### No Triggers
1. Verify target time format (12-hour with AM/PM)
2. Check millisecond delay is within range (100-60000ms)
3. Ensure module is enabled
4. Check trigger event routing
