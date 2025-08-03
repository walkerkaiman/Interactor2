const { AudioOutputModule } = require('./src/modules/output/audio_output/index.ts');

async function testAudioOutput() {
  try {
    console.log('Testing Audio Output module...');
    
    const config = {
      deviceId: 'default',
      sampleRate: 44100,
      channels: 2,
      format: 'wav',
      volume: 1.0,
      enabled: true,
      bufferSize: 4096,
      loop: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      enableFileUpload: true,
      uploadPort: 3001,
      uploadHost: '0.0.0.0',
      maxFileSize: 50 * 1024 * 1024,
      allowedExtensions: ['.wav', '.mp3', '.ogg', '.m4a', '.flac']
    };
    
    const audioModule = new AudioOutputModule(config);
    console.log('Audio module created successfully');
    
    await audioModule.init();
    console.log('Audio module initialized successfully');
    
    await audioModule.start();
    console.log('Audio module started successfully');
    
    console.log('Audio module test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Audio module test failed:', error);
    process.exit(1);
  }
}

testAudioOutput(); 