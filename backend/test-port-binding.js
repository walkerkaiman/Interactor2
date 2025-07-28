const sacn = require('sacn');
const dgram = require('dgram');

console.log('🔍 Testing sACN port binding...');

// Create sACN receiver
const receiver = new sacn.Receiver({
  universes: [999],
  port: 5568
});

console.log('📡 sACN receiver created');

receiver.on('packet', (packet) => {
  console.log('✅ Received sACN packet!');
  console.log('Universe:', packet.universe);
  console.log('Packet keys:', Object.keys(packet));
});

receiver.on('error', (error) => {
  console.error('❌ sACN receiver error:', error);
});

// Test UDP port binding
const testSocket = dgram.createSocket('udp4');

testSocket.on('error', (err) => {
  console.error('❌ Test socket error:', err);
});

testSocket.on('message', (msg, rinfo) => {
  console.log('📨 Test socket received message from', rinfo.address + ':' + rinfo.port);
  console.log('Message length:', msg.length);
});

// Try to bind to port 5568 to see if it's available
testSocket.bind(5568, '127.0.0.1', () => {
  console.log('✅ Test socket bound to port 5568');
  
  // Send a test message to ourselves
  const testMsg = Buffer.from('test message');
  testSocket.send(testMsg, 5568, '127.0.0.1', (err) => {
    if (err) {
      console.error('❌ Error sending test message:', err);
    } else {
      console.log('📤 Test message sent');
    }
  });
  
  // Close test socket after a delay
  setTimeout(() => {
    testSocket.close();
    console.log('🔒 Test socket closed');
  }, 2000);
});

console.log('⏳ Waiting for sACN packets...');
console.log('Send sACN packets to universe 999 on port 5568');

// Keep running for 10 seconds
setTimeout(() => {
  console.log('🔄 Closing sACN receiver...');
  receiver.close();
  console.log('✅ Test completed');
  process.exit(0);
}, 10000); 