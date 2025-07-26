# // Interactor //

Welcome to **Interactor** - a creative platform that bridges the gap between art and technology! Whether you're an artist looking to create interactive installations or a developer wanting to build custom modules, you've come to the right place.

## What is Interactor? 

Interactor is a **modular, visual interaction system** designed for creating complex interactive art installations and experiences. Think of it as a digital canvas where you can connect different "building blocks" (modules) to create amazing interactive workflows.

### For Artists 🎭
- **Visual Node Editor**: Drag and drop to connect different modules - no coding required!
- **Real-time Control**: See your interactions come to life instantly
- **Rich Module Library**: From motion sensors to LED displays, from audio playback to network communication
- **Easy Setup**: Upload audio files, configure sensors, and create complex interactions through a friendly web interface

### For Developers 🔧
- **Extensible Architecture**: Build custom modules using our robust TypeScript framework
- **Type-Safe Development**: Full TypeScript support with shared types across the entire system
- **Event-Driven Design**: Clean, decoupled architecture that's easy to understand and extend
- **Comprehensive Testing**: Built-in testing framework to ensure your modules work reliably

## Quick Start

### For Artists
1. **Start the System**: Run `npm start` in the root directory
2. **Open the Web Interface**: Navigate to the provided URL in your browser
3. **Explore Modules**: Browse available input and output modules
4. **Create Connections**: Use the visual editor to wire modules together
5. **Test & Iterate**: See your interactions in real-time!

### For Developers
1. **Setup**: `npm install` to get all dependencies
2. **Development Mode**: `npm run dev` for hot-reloading development
3. **Create a Module**: Follow our [Module Development Guide](./ModuleDevelopmentGuide.md)
4. **Test Your Work**: cd to the Tests folder and `npm test` to run the test suite. Can keep running in a seperate terminal during development.
5. **Documentation**: Check out our [TypeScript Type System Guide](./TypesGuide.md)

## What Can You Build?

### Interactive Art Installations
- **Motion-Responsive Displays**: Connect motion sensors to LED arrays or projectors
- **Audio-Visual Experiences**: Trigger sounds and visuals based on audience interaction
- **Network-Connected Installations**: Share data across multiple locations
- **Time-Based Performances**: Create scheduled or duration-based interactions

### Custom Modules
- **Input Modules**: Sensors, APIs, time triggers, network data
- **Output Modules**: Displays, speakers, motors, network endpoints
- **Processing Modules**: Data transformation, filtering, aggregation

## Architecture Overview

Interactor V2 is built around a simple but powerful concept:

```
Input Modules → Message Router → Output Modules
     ↓              ↓              ↓
  Sensors      Event Bus      Displays
  APIs         Real-time      Speakers  
  Triggers     Routing        Motors
```

- **Input Modules**: Capture data from the real world (sensors, APIs, time, etc.)
- **Message Router**: The "brain" that routes data between modules
- **Output Modules**: Control physical or digital outputs (displays, speakers, motors, etc.)

## Documentation Structure

- **[Module Development Guide](./ModuleDevelopmentGuide.md)**: Complete guide for creating custom modules
- **[TypeScript Type System Guide](./TypesGuide.md)**: Understanding the type system and shared interfaces
- **[Frontend Design](./FrontendDesign.md)**: UI/UX design principles and implementation details

## Getting Help

### For Artists
- Start with the visual interface - it's designed to be intuitive!
- Check the module documentation for specific features
- Most modules have built-in test functions to verify they're working

### For Developers
- Read the [Module Development Guide](./ModuleDevelopmentGuide.md) for detailed technical information
- Check the [TypeScript Type System Guide](./TypesGuide.md) for type definitions
- Look at existing modules in `backend/src/modules/` for examples
- Run tests to understand expected behavior

## Community & Contribution

We believe in the power of collaboration! Whether you're:
- **An artist** sharing your creative workflows
- **A developer** contributing new modules
- **A user** reporting bugs or suggesting features

Your contributions help make Interactor better for everyone. Check out our existing modules to see what's possible, and don't hesitate to reach out with questions or ideas!

---

**Ready to create something amazing?** Start with the visual interface or dive into module development - the choice is yours! 🚀 