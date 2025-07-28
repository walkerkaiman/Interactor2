const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

// sACN packet structure for universe 999
function createSacnPacket(universe, channels) {
  const packet = Buffer.alloc(638);
  
  // sACN header (simplified)
  packet.writeUInt16BE(0x638, 0); // Root Layer PDU Length
  packet.writeUInt32BE(0x00000000, 2); // Root Layer Vector
  packet.write('ASC-E1.17', 6, 12); // Root Layer CID
  packet.writeUInt16BE(0x0000, 18); // Root Layer Flags and Length
  packet.writeUInt32BE(0x00000000, 20); // Root Layer Vector
  packet.writeUInt16BE(0x0000, 24); // Root Layer Flags and Length
  
  // Framing Layer
  packet.writeUInt16BE(0x0000, 26); // Framing Layer Flags and Length
  packet.writeUInt32BE(0x00000002, 28); // Framing Layer Vector
  packet.writeUInt16BE(0x0000, 32); // Framing Layer Flags and Length
  packet.writeUInt16BE(universe, 34); // Universe
  packet.writeUInt16BE(0x0000, 36); // Framing Layer Flags and Length
  
  // DMP Layer
  packet.writeUInt16BE(0x0000, 38); // DMP Layer Flags and Length
  packet.writeUInt32BE(0x00000002, 40); // DMP Layer Vector
  packet.writeUInt8(0x00, 44); // DMP Layer Flags and Length
  packet.writeUInt8(0x00, 45); // DMP Layer Address Type and Data Type
  packet.writeUInt16BE(0x0000, 46); // DMP Layer Flags and Length
  packet.writeUInt16BE(0x0001, 48); // DMP Layer Property Value Count
  packet.writeUInt8(0x00, 50); // DMP Layer Property Values
  
  // DMX data starts at byte 125
  const dmxStart = 125;
  for (let i = 0; i < channels.length && i < 512; i++) {
    packet.writeUInt8(channels[i], dmxStart + i);
  }
  
  return packet;
}

function sendTestPacket() {
  // Create test data: MSB = 1, LSB = 255 (should give frame number 511)
  const channels = new Array(512).fill(0);
  channels[0] = 1;  // MSB (channel 1)
  channels[1] = 255; // LSB (channel 2)
  
  const packet = createSacnPacket(999, channels);
  
  socket.send(packet, 5568, '127.0.0.1', (err) => {
    if (err) {
      console.error('Error sending packet:', err);
    } else {
      console.log('Sent sACN packet to universe 999');
      console.log('MSB (channel 1):', channels[0]);
      console.log('LSB (channel 2):', channels[1]);
      console.log('Expected frame number:', (channels[0] << 8) | channels[1]);
    }
  });
}

// Send a test packet every 2 seconds
setInterval(sendTestPacket, 2000);

console.log('sACN packet sender started');
console.log('Sending packets to universe 999 on port 5568');
console.log('Press Ctrl+C to stop');

// Send first packet immediately
sendTestPacket(); 