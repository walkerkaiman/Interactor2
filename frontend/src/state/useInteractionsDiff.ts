import { useMemo } from 'react';
import { InteractionConfig } from '@interactor/shared';

interface DiffResult {
  local: InteractionConfig[];
  registered: InteractionConfig[];
  hasUnregisteredChanges: boolean;
}

/**
 * Splits interactions list into local (unregistered) vs registered based on
 * a Set of original IDs plus deep equality with the snapshot we loaded at boot.
 */
export function useInteractionsDiff(
  all: InteractionConfig[],
  originalSnapshot: InteractionConfig[],
): DiffResult {
  const originalIds = useMemo(() => new Set(originalSnapshot.map(i => i.id)), [originalSnapshot]);

  return useMemo(() => {
    const local: InteractionConfig[] = [];
    const registered: InteractionConfig[] = [];

    all.forEach(intx => {
      const wasRegistered = originalIds.has(intx.id);
      if (wasRegistered) {
        const original = originalSnapshot.find(i => i.id === intx.id);
        const same = JSON.stringify(original) === JSON.stringify(intx);
        if (same) registered.push(intx); else local.push(intx);
      } else {
        local.push(intx);
      }
    });

    return {
      local,
      registered,
      hasUnregisteredChanges: local.length > 0
    };
  }, [all, originalSnapshot, originalIds]);
}