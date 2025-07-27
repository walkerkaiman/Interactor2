const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

// sACN packet structure for Universe 999
function createSacnPacket(universe, channels) {
  const packet = Buffer.alloc(638);
  
  // sACN header (simplified)
  packet.writeUInt16BE(0x0010, 0); // Root Layer Preamble Size
  packet.writeUInt16BE(0x0000, 2); // Root Layer Post-amble Size
  packet.write('ASC-E1.17', 4, 12); // ACN Packet Identifier
  packet.writeUInt32BE(0x00000000, 16); // Root Layer Flags and Length
  packet.writeUInt32BE(0x00000000, 20); // Root Layer Vector
  packet.writeUInt32BE(0x00000000, 24); // CID (Component Identifier)
  
  // Framing Layer
  packet.writeUInt16BE(0x7000, 36); // Framing Layer Flags and Length
  packet.writeUInt32BE(0x00000002, 40); // Framing Layer Vector
  packet.writeUInt32BE(0x00000000, 44); // Source Name
  packet.writeUInt8(0x00, 48); // Priority
  packet.writeUInt16BE(0x0000, 49); // Reserved
  packet.writeUInt8(0x00, 51); // Sequence Number
  packet.writeUInt8(0x00, 52); // Options
  packet.writeUInt16BE(universe, 53); // Universe
  
  // DMP Layer
  packet.writeUInt16BE(0x7200, 75); // DMP Layer Flags and Length
  packet.writeUInt8(0x02, 79); // DMP Layer Vector
  packet.writeUInt8(0xA1, 80); // DMP Layer Type
  packet.writeUInt16BE(0x0000, 81); // First Property Address
  packet.writeUInt16BE(0x0001, 83); // Address Increment
  packet.writeUInt16BE(channels.length + 1, 85); // Property Value Count
  
  // DMX Data
  packet.writeUInt8(0x00, 87); // Start Code
  channels.forEach((value, index) => {
    packet.writeUInt8(value, 88 + index);
  });
  
  return packet;
}

// Test function
function sendTestFrame(frameNumber) {
  const msb = (frameNumber >> 8) & 0xFF;
  const lsb = frameNumber & 0xFF;
  
  console.log(`Sending frame ${frameNumber} (MSB: ${msb}, LSB: ${lsb})`);
  
  const channels = [msb, lsb]; // Channels 1 and 2
  const packet = createSacnPacket(999, channels);
  
  socket.send(packet, 5568, 'localhost', (err) => {
    if (err) {
      console.error('Error sending packet:', err);
    } else {
      console.log(`Frame ${frameNumber} sent successfully`);
    }
  });
}

// Send test frames
let frameNumber = 1;
const interval = setInterval(() => {
  sendTestFrame(frameNumber);
  frameNumber++;
  
  if (frameNumber > 10) {
    clearInterval(interval);
    socket.close();
    console.log('Test completed');
  }
}, 1000);

console.log('Starting sACN test - sending frames to Universe 999...');
console.log('Make sure the Frames Input module is running and listening on Universe 999'); 