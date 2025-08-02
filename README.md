# Interactor

A modular, event-driven platform for building interactive installations. Features a visual node-based editor, robust backend services, and an extensible module system.

## 📚 **Documentation**

Documentation is organized for different audiences:

- **🤖 AI Agents**: Start with [`documentation/ai/AI_AGENT_START_HERE.md`](documentation/ai/AI_AGENT_START_HERE.md)
- **👨‍💻 Human Developers**: Start with [`documentation/human/DeveloperOnboarding.md`](documentation/human/DeveloperOnboarding.md)
- **📋 Current Status**: See [`CURRENT_STATUS_AND_TODOS.md`](CURRENT_STATUS_AND_TODOS.md) for known issues and roadmap

## 🏃‍♂️ **Quick Start**

**Simple Start** (Recommended):
```bash
# Windows
start-simple.bat

# Manual
cd backend && npm install
cd ../frontend && npm install && npm run build  
cd ../backend && npm start
```

**Development Mode**:
```bash
# Windows  
start-full-dev.bat

# Manual - Terminal 1
cd backend && npm install && npm run dev

# Manual - Terminal 2  
cd frontend && npm install && npm run dev
```

**Access**:
- Frontend UI: http://localhost:3000 (dev) or http://localhost:3001 (production)
- Backend API: http://localhost:3001

## 🏗️ **Architecture Overview**

- **Backend**: Node.js/TypeScript with modular plugin system
- **Frontend**: React-based visual node editor  
- **Modules**: Extensible input/output modules for sensors, lights, audio, etc.
- **Communication**: REST API + WebSocket for real-time updates
- **Configuration**: JSON manifest-driven module system

## 🎛️ **Available Modules**

**Input Modules**: time_input, frames_input, http_input, osc_input, serial_input  
**Output Modules**: audio_output, dmx_output, http_output, osc_output

## 🔗 **Key API Endpoints**

- `GET /api/modules` - List available modules
- `GET /api/interactions` - Get current connections
- `POST /api/interactions/register` - Save connections  
- `POST /api/trigger/:moduleId` - Manual trigger

*Full API documentation: [`documentation/human/API_GUIDE.md`](documentation/human/API_GUIDE.md)*

## 🎯 **Usage**

1. **Add Modules**: Drag from sidebar to canvas
2. **Connect Nodes**: Draw connections between handles
3. **Configure**: Click nodes to edit settings
4. **Test**: Use manual triggers
5. **Register**: Save to backend

*Detailed guides available in [`documentation/human/`](documentation/human/)*

## 🔧 **Development**

**Prerequisites**: Node.js 18+

**Project Structure**:
```
Interactor/
├── backend/           # Node.js server + modules
├── frontend/          # React node editor  
├── shared/            # TypeScript types
└── documentation/     # Organized by audience
    ├── ai/           # For AI agents
    └── human/        # For developers
```

**Contributing**: See [`documentation/human/DeveloperOnboarding.md`](documentation/human/DeveloperOnboarding.md)

## 🔍 **Troubleshooting**

- **Port conflicts**: Check `backend/config/system.json`
- **Module issues**: Check `backend/logs/interactor.log`  
- **WebSocket errors**: Check browser console
- **Current known issues**: See [`CURRENT_STATUS_AND_TODOS.md`](CURRENT_STATUS_AND_TODOS.md)

## License

MIT License - see LICENSE file for details. 