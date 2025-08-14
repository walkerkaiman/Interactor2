# Module: time_input

- Purpose: Emit triggers based on wall-clock time or metronome
- Type: input
- Owned state: current time, countdown, mode, delay
- Public API: `api/index.ts` factory registration

## Structure

```
modules/input/time_input/
  api/        # factory registration
  domain/     # TimeEngine, DisplayFormatter (pure)
  infra/      # WsClient (optional external API)
  index.ts    # module orchestration
  README.md
```

## Manifest
- Name: Time Input
- Events (outputs): `timeTrigger`, `stateUpdate`

## Events
- Trigger: `timeTrigger` { mode, currentTime, targetTime?, millisecondDelay?, timestamp, manual? }
- Status: listening/running/stopped

## Configuration
- mode: 'clock' | 'metronome'
- targetTime?: string (clock)
- millisecondDelay?: number (metronome)
- enabled?: boolean
- apiEnabled?: boolean; apiEndpoint?: string

## Factory
Registered in `api/index.ts`:
```ts
moduleRegistry.register('Time Input', (config, id) => new TimeInputModule(config as any, id));
```
