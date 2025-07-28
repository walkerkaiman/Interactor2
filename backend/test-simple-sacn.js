const sacn = require('sacn');

// Create a simple sACN receiver
const receiver = new sacn.Receiver({
  universes: [999],
  port: 5568
});

console.log('Starting sACN receiver test...');

receiver.on('packet', (packet) => {
  console.log('✅ Received sACN packet!');
  console.log('Universe:', packet.universe);
  console.log('Packet keys:', Object.keys(packet));
  
  if (packet.slotsData) {
    console.log('DMX data length:', packet.slotsData.length);
    console.log('First 10 values:', packet.slotsData.slice(0, 10));
    
    // Extract channels 1 and 2
    const msb = packet.slotsData[0] || 0;
    const lsb = packet.slotsData[1] || 0;
    const frameNumber = (msb << 8) | lsb;
    
    console.log('MSB (channel 1):', msb);
    console.log('LSB (channel 2):', lsb);
    console.log('Frame number:', frameNumber);
  }
});

receiver.on('error', (error) => {
  console.error('❌ sACN receiver error:', error);
});

console.log('sACN receiver listening on universe 999, port 5568');
console.log('Send sACN packets to test...');

// Keep running
setTimeout(() => {
  console.log('Test completed');
  receiver.close();
  process.exit(0);
}, 30000); 