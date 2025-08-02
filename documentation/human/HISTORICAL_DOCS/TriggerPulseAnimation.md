# Trigger Pulse Animation

## Overview

The trigger pulse animation provides visual feedback when output modules are triggered, making it easy to see which modules are actively responding to events. When a trigger event is fired, the connected dot on the Trigger connection point of output modules will pulse with a green animation.

## How It Works

### Frontend Components

1. **TriggerEventTracker** (`frontend/src/utils/triggerEventTracker.ts`)
   - Singleton class that manages trigger events and pulse states
   - Records trigger events and manages animation timing
   - Emits events for pulse start/end

2. **CustomNode Component** (`frontend/src/components/CustomNode.tsx`)
   - Listens for trigger events for its specific module
   - Applies pulse animation CSS class when triggered
   - Manages local pulsing state

3. **CSS Animation** (`frontend/src/components/CustomNode.module.css`)
   - `.triggerConnectedPulse` class with `pulseAnimation` keyframes
   - 0.6-second ease-out animation with scale and glow effects
   - Green color scheme matching trigger connections

### Backend Integration

1. **OutputModuleBase** (`backend/src/modules/OutputModuleBase.ts`)
   - Emits `triggerEvent` when modules are triggered
   - Handles both manual and automatic triggers
   - Includes module ID and trigger type

2. **InteractorServer** (`backend/src/index.ts`)
   - Listens for trigger events from output modules
   - Broadcasts trigger events to frontend via WebSocket
   - Sets up event listeners during module registration

3. **WebSocket Communication**
   - Backend sends `trigger_event` messages to frontend
   - Frontend receives and records trigger events
   - Real-time animation triggering

## Animation Details

### CSS Animation
```css
@keyframes pulseAnimation {
  0% {
    transform: translateY(-50%) scale(1);
    box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.7);
  }
  50% {
    transform: translateY(-50%) scale(1.5);
    box-shadow: 0 0 0 10px rgba(5, 150, 105, 0.4);
  }
  100% {
    transform: translateY(-50%) scale(1);
    box-shadow: 0 0 0 0 rgba(5, 150, 105, 0);
  }
}
```

### Animation Properties
- **Duration**: 0.6 seconds
- **Easing**: ease-out
- **Scale**: 1.0 → 1.5 → 1.0
- **Glow**: Green box-shadow that expands and fades
- **Color**: Matches trigger connection color (#059669)

## Usage

### Manual Triggering
1. Open the Trigger Panel in the frontend
2. Click "Trigger" button for any output module
3. The connected dot will pulse green for 0.6 seconds

### Automatic Triggering
1. Set up interactions between input and output modules
2. When input modules emit trigger events, connected output modules will pulse
3. Animation occurs automatically through the message routing system

### Testing
- Use the manual trigger panel to test pulse animations
- Check that animations work for all output module types
- Verify that multiple simultaneous triggers work correctly

## Technical Implementation

### Event Flow
1. **Trigger Event Fired** (manual or automatic)
2. **Backend Processing** (OutputModuleBase.onTriggerEvent)
3. **WebSocket Broadcast** (InteractorServer.broadcastTriggerEvent)
4. **Frontend Reception** (App.tsx WebSocket handler)
5. **Event Recording** (triggerEventTracker.recordTriggerEvent)
6. **Animation Trigger** (CustomNode useEffect)
7. **CSS Animation** (pulseAnimation keyframes)

### State Management
- **Active Pulses**: Set of currently pulsing module IDs
- **Animation Timing**: 600ms timeout for pulse completion
- **Event Cleanup**: Automatic removal from active pulses
- **Multiple Pulses**: Support for simultaneous animations

## Configuration

### Animation Duration
Change the animation duration by updating:
- CSS animation duration in `CustomNode.module.css`
- Timeout duration in `triggerEventTracker.ts`
- Both should match for consistent behavior

### Animation Style
Modify the pulse animation by editing:
- `pulseAnimation` keyframes in CSS
- Scale values, colors, and timing
- Box-shadow properties for glow effects

### Trigger Sources
The system supports different trigger sources:
- `'manual'`: User-initiated triggers
- `'auto'`: Automatic triggers from input modules
- Custom sources can be added as needed

## Troubleshooting

### Animation Not Working
1. Check WebSocket connection status
2. Verify trigger events are being emitted from backend
3. Ensure CSS classes are being applied correctly
4. Check browser console for errors

### Multiple Animations
1. Verify that `triggerEventTracker` is properly managing state
2. Check that module IDs are unique
3. Ensure cleanup timeouts are working correctly

### Performance Issues
1. Limit simultaneous animations if needed
2. Consider debouncing rapid trigger events
3. Monitor WebSocket message frequency 