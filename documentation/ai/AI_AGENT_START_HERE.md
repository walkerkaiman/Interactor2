# 🤖 AI Agent Start Here - Interactor Development Guide

## 🚀 Quick Start (Read This First!)

**Interactor** is a modular, event-driven system for interactive installations. You are here to develop **new modules** or **enhance existing features**.

### 📁 What You're Working With
- **Backend**: Node.js/TypeScript modules that handle inputs/outputs (sensors, lights, audio, etc.)
- **Frontend**: React visual editor for connecting modules
- **Architecture**: Simple base classes + manifest-driven modules

---

## 🎯 Your Main Tasks Will Be

### ✅ **Module Development** (Most Common)
1. **Extend base classes**: `InputModuleBase` or `OutputModuleBase` 
2. **Create manifest.json**: Describes your module's config and capabilities
3. **Follow the lifecycle**: `onInit()` → `onStart()` → `onStop()`

**📂 Template Location**: `backend/src/modules/input/time_input/` (great example)

### ✅ **Frontend Features** (Less Common)
- The frontend is **simplified architecture only**
- Main files: `App.tsx`, `NodeEditor.tsx`, `CustomEdge.tsx`
- **No singletons or complex state management**

---

## 🚨 **Critical Rules** (Read These!)

### ❌ **What NOT to Touch**
- **Don't modify core services**: `MessageRouter`, `StateManager`, `ModuleLoader`
- **Don't create new base classes**: Use existing `InputModuleBase`/`OutputModuleBase`
- **Don't add complex state management**: Keep it simple
- **Don't create documentation files**: Focus on code

### ✅ **What TO Do**
- **Read the existing module examples first**
- **Use shared types from `@interactor/shared`**
- **Follow the manifest schema exactly**
- **Test your module in isolation**
- **Keep modules focused and simple**

---

## 📚 **Essential Reading (In Order)**

1. **`MODULE_DEVELOPMENT.md`** - How to create modules
2. **`shared/src/types/index.ts`** - All available types
3. **`backend/src/modules/input/time_input/`** - Complete example
4. **`API_GUIDE.md`** - REST endpoints and WebSocket events

---

## 🔧 **Development Workflow**

```bash
# 1. Create your module directory
mkdir backend/src/modules/input/my_new_module

# 2. Create required files
touch backend/src/modules/input/my_new_module/index.ts
touch backend/src/modules/input/my_new_module/manifest.json

# 3. Start development server (don't restart it yourself)
npm run dev  # (User handles this)

# 4. Test your module via API or frontend
```

---

## 🎨 **Current Architecture Status**

- ✅ **Backend**: Stable, don't modify core services
- ✅ **Frontend**: Recently simplified, stable patterns only
- ✅ **Shared Types**: Complete and consistent
- ❌ **No complex patterns**: Singletons, complex state, duplicate WebSocket logic

---

## 💡 **Quick Examples**

### Module Structure
```typescript
export class MyInputModule extends InputModuleBase {
  constructor(config: MyConfig) {
    super('my_input', config, manifest);
  }
  
  protected async onStart(): Promise<void> {
    // Your logic here
    this.emitTrigger('trigger', { value: 123 });
  }
}
```

### Manifest Structure
```json
{
  "name": "My Input",
  "type": "input",
  "version": "1.0.0",
  "description": "Does something useful",
  "configSchema": { "type": "object", "properties": {} },
  "events": [{ "name": "trigger", "type": "output" }]
}
```

---

## 🏁 **Success Criteria**

- Your module loads without errors
- Configuration UI appears in frontend
- Events route correctly through the system
- No impact on existing modules
- Clean, focused code

**Ready to start? Read `MODULE_DEVELOPMENT.md` next!**