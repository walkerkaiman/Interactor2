
# Modules Event List (Overview)

This document lists common events across modules to aid orchestration and routing.

## Event categories
- trigger: discrete pulses; payload shaped by module (e.g., timeTrigger, oscTrigger, thresholdTrigger)
- stream: numeric continuous value updates (value: number)
- status: lifecycle/status changes; includes details per module
- error: operational errors with `context`

## Examples by module

- time_input
  - trigger: `timeTrigger` { mode, currentTime, targetTime?, millisecondDelay?, timestamp, manual? }
  - stream: value is not used (module emits runtime state via runtimeStateUpdate)
  - status: listening/running/stopped
  - error: validation/network if ws API enabled

- http_input
  - trigger: `httpTrigger` { value, method, url, headers, body, query, requestId, rateLimitRemaining, timestamp }
  - stream: value: number (extracted)
  - status: listening/stopped
  - error: http_server

- osc_input
  - trigger: `oscTrigger` { address, args, messageCount, timestamp }
  - stream: value: number (first arg)
  - status: listening/stopped
  - error: osc_listener

- serial_input
  - trigger: `thresholdTrigger` { value, rawData, threshold, operator, dataCount, timestamp }
  - stream: value: number
  - status: listening/stopped
  - error: serial

- frames_input
  - trigger: `frameChange` { frameNumber, msb, lsb, frameCount, timestamp }
  - stream: value: number (frame number)
  - status: listening/stopped
  - error: sacn

- audio_output
  - output: `audioOutput` { deviceId, sampleRate, channels, format, volume, isPlaying, currentTime, duration, playCount, timestamp }
  - status: ready/stopped
  - error: audio_playback

- osc_output
  - output: `oscSent` { address, args, timestamp, messageCount }
  - status: ready/stopped
  - error: osc_send

- dmx_output
  - output: `dmxSent` { universe, channels, brightness, frameNumber, totalFrames, frameCount, timestamp }
  - status: ready/stopped/fileLoaded
  - error: dmx_send

- http_output
  - output: response events and error events per shared types

Notes:
- All modules must publish via the in-process EventBus (`MessageRouter`).
- Inputs emit trigger/stream; outputs consume those via router subscriptions.


