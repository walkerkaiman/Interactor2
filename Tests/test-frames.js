const { FramesInputModule } = require('../backend/dist/modules/input/frames_input/index.js');
const { StateManager } = require('../backend/dist/core/StateManager.js');
const dgram = require('dgram');

// sACN packet sender
function createSacnPacket(universe, channels) {
  const packet = Buffer.alloc(638);
  
  // Simplified sACN header
  packet.writeUInt16BE(0x638, 0);
  packet.writeUInt32BE(0x00000000, 2);
  packet.write('ASC-E1.17', 6, 12);
  packet.writeUInt16BE(0x0000, 18);
  packet.writeUInt32BE(0x00000000, 20);
  packet.writeUInt16BE(0x0000, 24);
  packet.writeUInt16BE(0x0000, 26);
  packet.writeUInt32BE(0x00000002, 28);
  packet.writeUInt16BE(0x0000, 32);
  packet.writeUInt16BE(universe, 34);
  packet.writeUInt16BE(0x0000, 36);
  packet.writeUInt16BE(0x0000, 38);
  packet.writeUInt32BE(0x00000002, 40);
  packet.writeUInt8(0x00, 44);
  packet.writeUInt8(0x00, 45);
  packet.writeUInt16BE(0x0000, 46);
  packet.writeUInt16BE(0x0001, 48);
  packet.writeUInt8(0x00, 50);
  
  const dmxStart = 125;
  for (let i = 0; i < channels.length && i < 512; i++) {
    packet.writeUInt8(channels[i], dmxStart + i);
  }
  
  return packet;
}

async function testFramesInput() {
  console.log('Testing Frames Input Module...');
  
  // Initialize state manager
  const stateManager = StateManager.getInstance();
  await stateManager.init();
  
  // Create frames input module
  const config = {
    universe: 999,
    enabled: true
  };
  
  const module = new FramesInputModule(config);
  
  // Set up event listeners
  module.on('frameData', (data) => {
    console.log('✅ Frame data received:', data);
  });
  
  module.on('stateUpdate', (data) => {
    console.log('✅ State update:', data);
  });
  
  // Initialize and start the module
  await module.init();
  await module.start();
  
  console.log('Module started. Waiting for sACN packets...');
  console.log('Send sACN packets to universe 999 on port 5568');
  console.log('Channels 1 and 2 should contain MSB and LSB values');
  
  // Add debugging for the module state
  console.log('Module state:', module.getState());
  console.log('Module frame parameters:', module.getFrameParameters());
  
  // Create sACN sender
  const socket = dgram.createSocket('udp4');
  
  function sendTestPacket() {
    const channels = new Array(512).fill(0);
    channels[0] = 1;  // MSB (channel 1)
    channels[1] = 255; // LSB (channel 2)
    
    const packet = createSacnPacket(999, channels);
    
    socket.send(packet, 5568, '127.0.0.1', (err) => {
      if (err) {
        console.error('❌ Error sending packet:', err);
      } else {
        console.log('📤 Sent sACN packet to universe 999');
        console.log('   MSB (channel 1):', channels[0]);
        console.log('   LSB (channel 2):', channels[1]);
        console.log('   Expected frame number:', (channels[0] << 8) | channels[1]);
      }
    });
  }
  
  // Send test packets every 3 seconds
  setInterval(sendTestPacket, 3000);
  
  // Send first packet after 1 second
  setTimeout(sendTestPacket, 1000);
  
  // Keep the process running
  setTimeout(() => {
    console.log('Test completed');
    socket.close();
    process.exit(0);
  }, 30000); // Run for 30 seconds
}

testFramesInput().catch(console.error); 