const { FramesInputModule } = require('../backend/dist/modules/input/frames_input/index.js');
const { StateManager } = require('../backend/dist/core/StateManager.js');

async function testStateUpdates() {
  console.log('🔍 Testing State Updates...');
  
  try {
    // Initialize state manager
    const stateManager = StateManager.getInstance();
    await stateManager.init();
    console.log('✅ State manager initialized');
    
    // Create frames input module
    const config = {
      universe: 999,
      enabled: true
    };
    
    const module = new FramesInputModule(config);
    console.log('✅ Module created');
    
    // Set up event listeners
    module.on('frameData', (data) => {
      console.log('🎯 Frame data received:', data);
    });
    
    module.on('stateUpdate', (data) => {
      console.log('🔄 State update:', data);
    });
    
    module.on('moduleStateChanged', (data) => {
      console.log('📡 Module state changed:', data);
    });
    
    // Initialize and start the module
    await module.init();
    await module.start();
    console.log('✅ Module started');
    
    // Add module instance to state manager
    const moduleInstance = {
      id: module.id,
      moduleName: module.name,
      config: module.config,
      status: 'running',
      messageCount: 0,
      currentFrame: 0,
      frameCount: 0,
      lastUpdate: Date.now()
    };
    
    await stateManager.addModuleInstance(moduleInstance);
    console.log('✅ Module instance added to state manager');
    
    // Check initial state
    console.log('📊 Initial module state:', module.getState());
    
    // Simulate receiving frame data
    console.log('🧪 Simulating frame data reception...');
    const testPacket = {
      universe: 999,
      slotsData: [1, 255, 0, 0, 0, 0, 0, 0, 0, 0] // MSB=1, LSB=255
    };
    
    await module.handleSacnPacket(testPacket);
    
    // Check state after update
    console.log('📊 Module state after update:', module.getState());
    
    // Check if the state manager has the updated instance
    const moduleInstances = stateManager.getModuleInstances();
    const updatedInstance = moduleInstances.find(m => m.id === module.id);
    console.log('📊 State manager module instance:', updatedInstance);
    
    console.log('✅ State update test completed');
    
  } catch (error) {
    console.error('❌ State update test failed:', error);
  }
}

testStateUpdates().catch(console.error); 