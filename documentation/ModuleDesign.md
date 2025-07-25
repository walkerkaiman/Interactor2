# Unified Module Design Document

---

## 1. Overview: Module System & Base Classes

Interactor V2 uses a layered module system for extensibility and clarity. All modules inherit from a common `ModuleBase`, with input and output modules further specializing via `InputModuleBase` and `OutputModuleBase`.

- **ModuleBase:** Shared lifecycle, config, logging, event emitter, and manifest access.
- **InputModuleBase:** Adds input-specific features (trigger/streaming logic, event firing, input formatting, debouncing, etc.).
- **OutputModuleBase:** Adds output-specific features (value consumption, output formatting, batching, etc.).

**Directory Example:**
```
backend/src/modules/
  frames_input/      # extends InputModuleBase
  osc_input/         # extends InputModuleBase
  serial_input/      # extends InputModuleBase
  time_input/        # extends InputModuleBase
  audio_output/      # extends OutputModuleBase
  dmx_output/        # extends OutputModuleBase
  osc_output/        # extends OutputModuleBase
```

---

## 2. Input Module Features & Descriptions

All input modules support both trigger and streaming modes (where applicable), with a mode toggle in the UI. They emit events to connected output modules and synchronize state/config with the frontend in real time.

### Shared Input Features
- Mode toggle: trigger or streaming
- Real-time event emission
- WebSocket/HTTP sync with UI
- Configurable parameters (per module)
- State display in UI
- All settings/state changes are live-synced

### Module Details

#### Frames Input Module
- Monitors sACN frame numbers on Universe 999
- **Trigger mode:** Fires event on frame change
- **Streaming mode:** Continuously streams frame numbers
- **Key functions:** `start()`, `stop()`, `onTrigger(event)`, `onStream(value)`, `initSacnListener()`
- **Config:** Universe (default 999), current frame (display)

#### OSC Input Module
- Listens for OSC messages on configurable UDP port/address
- **Trigger mode:** Fires event when received OSC address matches user input
- **Streaming mode:** Streams value of matched address message
- **Key functions:** `start()`, `stop()`, `onTrigger(event)`, `onStream(value)`, `initOscListener()`, `reset()`
- **Config:** Port (default 8000), OSC address (default /trigger)

#### Serial Input Module
- Monitors serial data from hardware sensors
- **Trigger mode:** Fires event when value crosses threshold (with logic operator)
- **Streaming mode:** Streams continuous sensor value
- **Key functions:** `start()`, `stop()`, `onTrigger(event)`, `onStream(value)`, `initSerial()`, `checkTrigger(value)`, `reset()`
- **Config:** Serial port, baud rate, logic operator, threshold value

#### Time Input Module
- Triggers events at a specific time of day
- **Trigger mode only:** Emits event at configured time
- **Key functions:** `start()`, `stop()`, `checkTime()`, `onTrigger(event)`, `getTriggerParameters()`
- **Config:** Target time (HH:MM)

---

## 3. Output Module Features & Descriptions

All output modules adapt their behavior based on the type of input event (trigger or streaming) they receive. They expose configuration and state to the UI and support real-time control.

### Shared Output Features
- Adaptive behavior: trigger vs streaming
- Real-time state/config sync with UI
- Manual trigger/play button in UI (where applicable)
- Configurable parameters (per module)
- All settings/state changes are live-synced

### Module Details

#### Audio Output Module
- Plays WAV files with volume control and waveform visualization
- **Trigger event:** Plays audio file
- **Key functions:** `start()`, `stop()`, `onTriggerEvent(event)`, `playAudio(filePath, volume)`, `generateWaveform(filePath)`, `manualTrigger()`, `setMasterVolume(vol)`
- **Config:** Audio file, volume, waveform

#### DMX Output Module
- Controls DMX lighting (sACN, Art-Net, Serial DMX). Can load a csv where each row is a frame of DMX data. Module validates csv file and handles malformed data and data of wrong size. User inputs FPS for chase functions. 
- **Trigger event:** Plays chase sequence from CSV
- **Streaming event:** Sends real-time DMX data. Streaming  values will drive the frame index of a csv file loaded by user input.
- **Key functions:** `start()`, `stop()`, `onTriggerEvent(event)`, `onStreamingEvent(event)`, `playChase()`, `sendDmxFrame(frame)`, `manualTrigger()`
- **Config:** Protocol, CSV file, FPS, universe, IP, port, serial port, net, subnet

#### OSC Output Module
- Sends OSC messages to configured address/port
- **Trigger event:** Sends message with value "1" to user address/IP/port
- **Streaming event:** Sends message with streamed value
- **Key functions:** `start()`, `stop()`, `onTriggerEvent(event)`, `onStreamingEvent(event)`, `sendOscMessage(value)`, `manualTrigger()`
- **Config:** IP address, port, OSC address

---

## 4. UI Elements & Manifest System

### UI Elements
- **Mode Toggle:** Switches input modules between trigger and streaming
- **Config Forms:** Auto-generated from module manifests (JSON schemas)
- **State Displays:** Show current value, status, or frame (real-time)
- **Manual Trigger/Play:** Button for output modules to test/play manually
- **File Pickers, Sliders, Dropdowns:** For selecting files, adjusting values, etc.

### Manifest System
- Each module provides a `manifest.json` describing:
  - Name, type (input/output)
  - Configurable parameters (type, default, UI element type)
  - Supported events/messages
  - Asset references
- The frontend reads manifests to auto-generate config forms and UI controls
- Manifests are validated and synced between backend and frontend

---

## 5. Summary Table: Key Functions/Methods per Module

| Module            | Key Functions/Methods                                                                 |
|-------------------|--------------------------------------------------------------------------------------|
| Frames Input      | start(), stop(), onTrigger(event), onStream(value), initSacnListener()               |
| OSC Input         | start(), stop(), onTrigger(event), onStream(value), initOscListener(), reset()       |
| Serial Input      | start(), stop(), onTrigger(event), onStream(value), initSerial(), checkTrigger(), reset() |
| Time Input        | start(), stop(), checkTime(), onTrigger(event), getTriggerParameters()               |
| Audio Output      | start(), stop(), onTriggerEvent(event), playAudio(), generateWaveform(), manualTrigger(), setMasterVolume() |
| DMX Output        | start(), stop(), onTriggerEvent(event), onStreamingEvent(event), playChase(), sendDmxFrame(), manualTrigger() |
| OSC Output        | start(), stop(), onTriggerEvent(event), onStreamingEvent(event), sendOscMessage(), manualTrigger() |

---

## 6. Notes on Trigger Logic and Adaptive Behavior

- **Input modules**: Trigger logic is implemented per module (e.g., threshold crossing, OSC address match, time check, frame change). Streaming mode passes values directly.
- **Output modules**: Detect event type (trigger or streaming) and adapt behavior (e.g., play audio, send DMX frame, send OSC message).
- **UI/Manifest**: All config and state is live-synced; manifests drive UI generation and validation.