const sacn = require('sacn');
const dgram = require('dgram');

console.log('🔍 Testing sACN with different port...');

// Try port 5569 instead
const receiver = new sacn.Receiver({
  universes: [999],
  port: 5569
});

console.log('📡 sACN receiver created on port 5569');

receiver.on('packet', (packet) => {
  console.log('✅ Received sACN packet!');
  console.log('Universe:', packet.universe);
  console.log('Packet keys:', Object.keys(packet));
  
  if (packet.slotsData) {
    console.log('DMX data length:', packet.slotsData.length);
    console.log('First 10 values:', packet.slotsData.slice(0, 10));
  }
});

receiver.on('error', (error) => {
  console.error('❌ sACN receiver error:', error);
});

// Create sender for port 5569
const socket = dgram.createSocket('udp4');

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

function sendTestPacket() {
  const channels = new Array(512).fill(0);
  channels[0] = 1;  // MSB (channel 1)
  channels[1] = 255; // LSB (channel 2)
  
  const packet = createSacnPacket(999, channels);
  
  socket.send(packet, 5569, '127.0.0.1', (err) => {
    if (err) {
      console.error('❌ Error sending packet:', err);
    } else {
      console.log('📤 Sent sACN packet to universe 999 on port 5569');
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

console.log('⏳ Waiting for sACN packets on port 5569...');

// Keep running for 15 seconds
setTimeout(() => {
  console.log('🔄 Closing sACN receiver...');
  receiver.close();
  socket.close();
  console.log('✅ Test completed');
  process.exit(0);
}, 15000); 