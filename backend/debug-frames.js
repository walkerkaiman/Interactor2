const { FramesInputModule } = require('./dist/modules/input/frames_input/index.js');
const { StateManager } = require('./dist/core/StateManager.js');

async function debugFramesInput() {
  console.log('🔍 Debugging Frames Input Module...');
  
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
    
    console.log('📋 Module config:', config);
    
    const module = new FramesInputModule(config);
    console.log('✅ Module created');
    
    // Set up comprehensive event listeners
    module.on('frameData', (data) => {
      console.log('🎯 FRAME DATA RECEIVED:', data);
    });
    
    module.on('stateUpdate', (data) => {
      console.log('🔄 STATE UPDATE:', data);
    });
    
    module.on('error', (error) => {
      console.error('❌ MODULE ERROR:', error);
    });
    
    // Initialize the module
    console.log('🔄 Initializing module...');
    await module.init();
    console.log('✅ Module initialized');
    
    // Start the module
    console.log('🔄 Starting module...');
    await module.start();
    console.log('✅ Module started');
    
    // Check module state
    console.log('📊 Module state:', module.getState());
    console.log('📊 Frame parameters:', module.getFrameParameters());
    
    // Test manual frame data processing
    console.log('🧪 Testing manual frame data processing...');
    const testPacket = {
      universe: 999,
      slotsData: [1, 255, 0, 0, 0, 0, 0, 0, 0, 0] // MSB=1, LSB=255
    };
    
    console.log('📤 Sending test packet:', testPacket);
    await module.handleSacnPacket(testPacket);
    
    // Check state after test
    console.log('📊 Module state after test:', module.getState());
    console.log('📊 Frame parameters after test:', module.getFrameParameters());
    
    console.log('✅ Debug test completed');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugFramesInput().catch(console.error); 