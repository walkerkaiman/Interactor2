import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerEventTracker } from '../../frontend/src/utils/triggerEventTracker';

describe('Trigger Pulse Animation', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    triggerEventTracker.removeAllListeners();
  });

  afterEach(() => {
    // Clear any existing event listeners
    triggerEventTracker.removeAllListeners();
  });

  it('should record trigger events and emit them', () => {
    const mockListener = vi.fn();
    triggerEventTracker.on('triggerEvent', mockListener);

    const moduleId = 'test-module-1';
    const source = 'manual';
    
    triggerEventTracker.recordTriggerEvent(moduleId, source);

    expect(mockListener).toHaveBeenCalledWith({
      moduleId,
      timestamp: expect.any(Number),
      source
    });
  });

  it('should track pulsing state correctly', () => {
    const moduleId = 'test-module-2';
    
    // Initially not pulsing
    expect(triggerEventTracker.isPulsing(moduleId)).toBe(false);
    
    // Record trigger event
    triggerEventTracker.recordTriggerEvent(moduleId, 'auto');
    
    // Should be pulsing now
    expect(triggerEventTracker.isPulsing(moduleId)).toBe(true);
    
    // Wait for animation to complete
    return new Promise(resolve => {
      setTimeout(() => {
        expect(triggerEventTracker.isPulsing(moduleId)).toBe(false);
        resolve(true);
      }, 700); // Slightly longer than the 600ms animation duration
    });
  });

  it('should emit pulseEnded event when animation completes', () => {
    const mockListener = vi.fn();
    triggerEventTracker.on('pulseEnded', mockListener);

    const moduleId = 'test-module-3';
    triggerEventTracker.recordTriggerEvent(moduleId, 'manual');

    return new Promise(resolve => {
      setTimeout(() => {
        expect(mockListener).toHaveBeenCalledWith(moduleId);
        resolve(true);
      }, 700);
    });
  });

  it('should handle multiple simultaneous pulses', () => {
    const moduleId1 = 'test-module-4';
    const moduleId2 = 'test-module-5';
    
    triggerEventTracker.recordTriggerEvent(moduleId1, 'auto');
    triggerEventTracker.recordTriggerEvent(moduleId2, 'manual');
    
    expect(triggerEventTracker.isPulsing(moduleId1)).toBe(true);
    expect(triggerEventTracker.isPulsing(moduleId2)).toBe(true);
    
    const activePulses = triggerEventTracker.getActivePulses();
    expect(activePulses).toContain(moduleId1);
    expect(activePulses).toContain(moduleId2);
    expect(activePulses).toHaveLength(2);
  });

  it('should clear all pulses', () => {
    const moduleId1 = 'test-module-6';
    const moduleId2 = 'test-module-7';
    
    triggerEventTracker.recordTriggerEvent(moduleId1, 'auto');
    triggerEventTracker.recordTriggerEvent(moduleId2, 'manual');
    
    expect(triggerEventTracker.getActivePulses()).toHaveLength(2);
    
    triggerEventTracker.clearAllPulses();
    
    expect(triggerEventTracker.getActivePulses()).toHaveLength(0);
    expect(triggerEventTracker.isPulsing(moduleId1)).toBe(false);
    expect(triggerEventTracker.isPulsing(moduleId2)).toBe(false);
  });
}); 