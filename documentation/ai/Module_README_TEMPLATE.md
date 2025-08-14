# Module: <module_name>

- Purpose: <short purpose>
- Type: <input|output>
- Owned state: <brief list>
- Public API: via `api/index.ts` factory and events

## Structure

```
backend/src/modules/<type>/<module_name>/
  api/
    index.ts          # registers module factory with ModuleRegistry
  domain/
    <pure_logic>.ts   # pure, testable logic (no IO)
  infra/
    <adapter>.ts      # IO adapters (network/ports/devices)
  index.ts            # module class, composes domain+infra, implements ModuleBase contracts
  README.md           # this file (short)
```

## Manifest

- Name: <Display Name>
- Events:
  - Inputs: <if output module>
  - Outputs: <events emitted>

## Events

- Trigger events: <names/payloads>
- Stream events: <value semantics>
- Status events: `status` with details
- Error events: `error` with context

## Configuration

- Required: <fields>
- Optional: <fields>

## Factory (api)

```ts
import { moduleRegistry } from '../../../../app/ModuleRegistry';
import { <ClassName> } from '../index';

moduleRegistry.register('<Display Name>', (config, id) => new <ClassName>(config as any, id));
```

## Notes

- Do not import `domain/` or `infra/` from other modules; only through this module’s `api/`.
- Keep `domain/` pure; side-effects in `infra/`.
- Module communicates via EventBus-compatible events only.
