# 🚀 AI Quick Reference - Interactor

## 📋 **Module Development Checklist**

### Required Files
- [ ] `index.ts` - Module implementation
- [ ] `manifest.json` - Configuration schema
- [ ] `wiki.md` - Documentation (optional)

### Base Class Choice
- **Input Module**: `extends InputModuleBase`
- **Output Module**: `extends OutputModuleBase`

### Required Methods
- [ ] `constructor(config)` - Initialize with manifest
- [ ] `onStart()` - Start your module logic
- [ ] `onStop()` - Clean up resources

### Manifest Required Fields
```json
{
  "name": "Human Readable Name",
  "type": "input" | "output", 
  "version": "1.0.0",
  "description": "What this does",
  "author": "Kaiman Walker",
  "configSchema": { "type": "object" },
  "events": [{ "name": "event", "type": "input|output" }]
}
```

---

## 🔗 **Key File Locations**

- **Module Base Classes**: `backend/src/modules/InputModuleBase.ts`, `OutputModuleBase.ts`
- **Shared Types**: `shared/src/types/index.ts`
- **Example Module**: `backend/src/modules/input/time_input/`
- **Frontend Components**: `frontend/src/components/`

---

## 🎛️ **Available Input/Output Types**

### Current Input Modules
- `frames_input` - Frame-based triggers
- `http_input` - HTTP endpoint listener
- `osc_input` - OSC protocol
- `serial_input` - Serial port communication
- `time_input` - Clock/metronome triggers

### Current Output Modules  
- `audio_output` - Audio playback
- `dmx_output` - DMX lighting control
- `http_output` - HTTP requests
- `osc_output` - OSC protocol

---

## 📡 **Common Patterns**

### Input Module Pattern
```typescript
export class MyInput extends InputModuleBase {
  private timer?: NodeJS.Timeout;
  
  protected async onStart(): Promise<void> {
    this.timer = setInterval(() => {
      this.emitTrigger('pulse', { timestamp: Date.now() });
    }, 1000);
  }
  
  protected async onStop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
  }
}
```

### Output Module Pattern
```typescript
export class MyOutput extends OutputModuleBase {
  protected async onStart(): Promise<void> {
    this.on('trigger', (payload) => {
      console.log('Received:', payload);
    });
  }
}
```

---

## 🚨 **Common Mistakes to Avoid**

- ❌ Don't modify `MessageRouter` or `StateManager`
- ❌ Don't create your own WebSocket connections
- ❌ Don't add complex frontend state management
- ❌ Don't import Node.js modules in shared code
- ❌ Don't hardcode file paths

---

## ✅ **Testing Your Module**

1. **Module loads**: Check backend logs for errors
2. **Config UI**: Module appears in frontend sidebar
3. **Events work**: Connect to other modules and test triggers
4. **No crashes**: System remains stable

---

## 📞 **API Endpoints for Testing**

- `GET /api/modules` - List available modules
- `POST /api/trigger/:moduleId` - Manually trigger module
- `GET /api/interactions` - Current connections
- `POST /api/interactions/register` - Save connections