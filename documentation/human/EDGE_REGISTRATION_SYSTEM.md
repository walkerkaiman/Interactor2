# Edge Registration System

## Overview

The edge registration system tracks whether edges (connections between nodes) are registered in interactions or not. This allows the frontend to apply different CSS styles to registered vs unregistered edges.

## Components

### 1. EdgeRegistrationTracker

Located in `frontend/src/utils/edgeRegistrationTracker.ts`, this singleton class manages the registration state of all edges.

**Key Methods:**
- `isEdgeRegistered(edgeId: string): boolean` - Check if an edge is registered
- `registerEdge(edgeId: string): void` - Mark an edge as registered
- `unregisterEdge(edgeId: string): void` - Mark an edge as unregistered
- `updateFromInteractions(registeredInteractions, localInteractions): void` - Update tracker from interaction data
- `clear(): void` - Clear all edge states

### 2. CSS Classes

Located in `frontend/src/components/CustomEdge.module.css`:

- `.registeredEdge` - Applied to edges that are registered in interactions
  - Animated with flowing dash pattern and pulse effect
  - Full opacity and thicker stroke
  
- `.unregisteredEdge` - Applied to edges that are not registered
  - Static appearance with reduced opacity
  - Thinner stroke width

## How It Works

### 1. Edge Creation

When a new connection is established:
- Edge is created with `isRegistered: false` in the data
- Edge ID is added to the tracker as unregistered
- CSS class `unregisteredEdge` is applied

### 2. Edge Registration

When interactions are registered with the backend:
- All edges in registered interactions are marked as registered
- CSS class changes to `registeredEdge`
- Animated effects are applied

### 3. State Updates

The tracker is updated in several scenarios:

**On Load:**
- Backend interactions are loaded
- All edges from registered interactions are marked as registered
- Local interactions are preserved as unregistered

**On New Connection:**
- New edge is created and marked as unregistered
- Tracker is updated immediately

**On Registration:**
- Local interactions are sent to backend
- All local edges become registered
- Tracker is updated to reflect new state

**On Edge Removal:**
- Edge is removed from tracker
- CSS classes are updated accordingly

## Usage

The system is automatically integrated into the ReactFlow components:

1. **CustomEdge Component** - Uses the tracker to determine which CSS class to apply
2. **NodeEditor Component** - Updates the tracker when edges are created/removed
3. **App Component** - Updates the tracker when interactions change

## Testing

Tests are located in `Tests/core/EdgeRegistrationTracker.test.ts` and verify:
- Edge registration state tracking
- Interaction-based updates
- Edge ID generation
- State clearing

## Visual Feedback

- **Registered Edges**: Animated dashed lines with flowing effect and pulse
- **Unregistered Edges**: Static lines with reduced opacity
- **Stream Connections**: Additional value labels showing real-time data

This system provides clear visual feedback to users about which connections are active in the backend system. 