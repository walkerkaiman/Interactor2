# Time Input Module Debugging Lessons

This document summarizes the key lessons learned from debugging the Time Input module issues, particularly around data persistence, WebSocket communication, and React Hooks compliance.

## Key Issues Encountered

### 1. Module ID Persistence Across Browser Refreshes

**Problem**: Every browser refresh generated new module IDs, causing the frontend to look for data for new IDs while the backend was sending data for old IDs.

**Root Cause**: 
- Frontend: `const newNodeId = \`node-${Date.now()}\``
- Backend: `id: \`instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}\``

**Solution**: 
- Use existing module IDs from backend state instead of generating new ones
- Ensure frontend loads existing modules via REST API before creating new ones

**Test**: `Tests/integration/TimeInputPersistence.test.ts` - "should maintain consistent module IDs across server restarts"

### 2. Real-time Data Not Included in Initial REST API Responses

**Problem**: The `/api/interactions` endpoint only returned basic interaction data without real-time fields like `currentTime` and `countdown`.

**Root Cause**: The endpoint only called `this.stateManager.getInteractions()` without merging real-time data from `this.stateManager.getModuleInstances()`.

**Solution**: Modified `/api/interactions` to merge real-time module data into interactions:

```typescript
const enrichedInteractions = interactions.map(interaction => ({
  ...interaction,
  modules: interaction.modules?.map(module => {
    const instanceUpdate = moduleInstances.find(instance => instance.id === module.id);
    if (instanceUpdate) {
      return { ...module, ...instanceUpdate };
    }
    return module;
  }) || []
}));
```

**Test**: `Tests/integration/TimeInputPersistence.test.ts` - "should preserve real-time data in REST API responses"

### 3. WebSocket Data Merging Conflicts

**Problem**: Multiple `setRegisteredInteractions` calls in `App.tsx` were overwriting each other, causing real-time data to be lost.

**Root Cause**: Two separate `setRegisteredInteractions` calls were conflicting:
1. One for structural changes in interactions
2. One for real-time data updates

**Solution**: Consolidated into a single, robust update that correctly merges `moduleInstances` data into the `interactions` state.

**Test**: `Tests/integration/WebSocketDataFlow.test.ts` - "should not overwrite real-time data when interactions structure changes"

### 4. React Hooks Rules Violations

**Problem**: `useState` and `useEffect` were called directly inside the `renderConfig` function, violating React Hooks rules.

**Root Cause**: The countdown timer logic was implemented directly in `renderConfig`, which is not a React component.

**Solution**: Extracted countdown logic into a dedicated `CountdownDisplay` React component:

```typescript
function CountdownDisplay({ countdown }: { countdown: string }) {
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  
  useEffect(() => {
    // Countdown logic here
  }, [countdown]);
  
  return (
    <span className={styles.configValue}>
      {countdownTimer !== null ? `${countdownTimer}s` : (countdown || '--')}
    </span>
  );
}
```

**Test**: `Tests/frontend/TimeInputNode.test.tsx` - "should not call hooks inside renderConfig function"

## Data Flow Architecture

### Backend State Management

1. **Module Instances**: Stored in `StateManager` with real-time data (`currentTime`, `countdown`, etc.)
2. **Interactions**: Stored separately with basic module data
3. **REST API**: Merges real-time data into interactions on `/api/interactions`
4. **WebSocket**: Broadcasts both interactions and moduleInstances separately

### Frontend Data Processing

1. **Initial Load**: Gets enriched interactions via REST API
2. **WebSocket Updates**: Merges real-time data from `moduleInstances` into existing interactions
3. **Component Updates**: Uses `useInstanceData` hook to access real-time data

## Best Practices Established

### 1. Module ID Management
- Always use existing IDs from backend state
- Never generate new IDs on frontend refresh
- Persist module instances across server restarts

### 2. Real-time Data Handling
- Include real-time data in REST API responses
- Merge WebSocket updates correctly without conflicts
- Preserve data across browser refreshes

### 3. React Component Architecture
- Extract complex logic into separate components
- Follow React Hooks rules strictly
- Use proper TypeScript typing for data

### 4. State Management
- Separate concerns: interactions vs module instances
- Merge data at the right level (REST API, WebSocket, component)
- Handle missing data gracefully

## Testing Strategy

### Integration Tests
- **TimeInputPersistence.test.ts**: Tests module ID persistence and REST API data inclusion
- **WebSocketDataFlow.test.ts**: Tests WebSocket data merging and state updates

### Frontend Tests
- **TimeInputNode.test.tsx**: Tests React Hooks compliance and component behavior

### Key Test Scenarios
1. Browser refresh with existing modules
2. WebSocket updates with real-time data
3. React Hooks rules compliance
4. Error handling for missing data
5. State persistence across server restarts

## Prevention Measures

### Code Review Checklist
- [ ] Are module IDs being generated consistently?
- [ ] Is real-time data included in REST API responses?
- [ ] Are React Hooks called at the top level of components?
- [ ] Is WebSocket data merging handled correctly?
- [ ] Are there multiple conflicting state updates?

### Automated Tests
- Run integration tests before deployment
- Run frontend tests to catch Hooks violations
- Test browser refresh scenarios
- Test WebSocket data flow

## Common Pitfalls to Avoid

1. **Generating new IDs on refresh**: Always use existing IDs from backend
2. **Calling hooks in render functions**: Extract logic to separate components
3. **Multiple state updates**: Consolidate updates to prevent conflicts
4. **Missing real-time data**: Ensure REST API includes all necessary data
5. **Inconsistent data merging**: Use consistent merging logic across all endpoints

## Debugging Tools

### Backend Logging
- Check `backend/data/state.json` for persisted data
- Monitor WebSocket broadcasts in server logs
- Verify REST API responses include real-time data

### Frontend Debugging
- Check browser console for WebSocket messages
- Verify `useInstanceData` hook calls
- Monitor React component re-renders

### Network Analysis
- Use browser dev tools to inspect REST API responses
- Monitor WebSocket message flow
- Check for data conflicts in state updates 