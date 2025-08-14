import Speaker from 'speaker';
import { PassThrough, Readable } from 'stream';
import * as fs from 'fs';
import path from 'path';
import { AudioPlaybackData } from '@interactor/shared';
import { IAudioPlayer, PlaybackState } from './IAudioPlayer';
import * as FFmpegWasm from '@ffmpeg/ffmpeg';
const { createFFmpeg, fetchFile } = FFmpegWasm as unknown as { createFFmpeg: (opts?: any) => any; fetchFile: (file: any) => Promise<Uint8Array> };

/**
 * Real-time PCM player based on the `speaker` package.  It uses ffmpeg (via
 * prism-media) to decode any common container/codec to 16-bit signed PCM in
 * the user-specified sample-rate & channel layout, then pipes that data
 * directly to the OS audio device.  No temporary files or CLI processes are
 * spawned, keeping latency low.
 */
export class NodeSpeakerPlayer implements IAudioPlayer {
  private speaker: Speaker | null = null;
  private passthrough: PassThrough | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pausedAt = 0;
  private duration = 0;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(private readonly sampleRate: number, private readonly channels: number) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  async play(data: string | ArrayBuffer | AudioPlaybackData | unknown): Promise<void> {
    await this.stop(); // Ensure previous playback is cleared

    // Decode to PCM buffer (16-bit signed, interleaved) → Speaker
    const { pcm, duration } = await this.decodeToPcm(data);
    this.duration = duration;

    this.speaker = new Speaker({
      channels: this.channels,
      bitDepth: 16,
      sampleRate: this.sampleRate
    });

    this.passthrough = new PassThrough();
    this.passthrough.pipe(this.speaker);
    this.passthrough.end(pcm);

    this.startTime = Date.now();
    this.isPlaying = true;

    // Track progress (every 200 ms is enough for UI)
    this.updateInterval = setInterval(() => {
      if (!this.isPlaying) return;
    }, 200);

    // When playback finishes
    this.passthrough.on('end', () => {
      this.cleanup();
    });
  }

  async pause(): Promise<void> {
    if (!this.isPlaying || !this.passthrough) return;
    this.passthrough.pause();
    this.pausedAt = Date.now();
    this.isPlaying = false;
  }

  async resume(): Promise<void> {
    if (this.isPlaying || !this.passthrough) return;
    this.passthrough.resume();
    // Adjust startTime to account for paused duration
    this.startTime += Date.now() - this.pausedAt;
    this.isPlaying = true;
  }

  async stop(): Promise<void> {
    this.cleanup();
  }

  getState(): PlaybackState {
    const currentTime = this.isPlaying ? (Date.now() - this.startTime) / 1000 : (this.pausedAt - this.startTime) / 1000;
    return {
      isPlaying: this.isPlaying,
      currentTime: Number(currentTime.toFixed(2)),
      duration: this.duration
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async decodeToPcm(data: string | ArrayBuffer | AudioPlaybackData | unknown): Promise<{ pcm: Buffer; duration: number }> {
    // Determine input and read into buffer
    let inputBuffer: Buffer;
    let ext = '';
    let overrideVolume: number | undefined;
    if (typeof data === 'string') {
      const filePath = data;
      ext = path.extname(filePath).toLowerCase();
      inputBuffer = await fs.promises.readFile(filePath);
    } else if (data instanceof ArrayBuffer) {
      inputBuffer = Buffer.from(data);
    } else if (typeof data === 'object' && data && (data as AudioPlaybackData).audioData) {
      const apd = data as AudioPlaybackData;
      overrideVolume = apd.volume;
      if (typeof apd.audioData === 'string') {
        const filePath = apd.audioData as string;
        ext = path.extname(filePath).toLowerCase();
        inputBuffer = await fs.promises.readFile(filePath);
      } else if (apd.audioData instanceof ArrayBuffer) {
        inputBuffer = Buffer.from(apd.audioData);
      } else if (Buffer.isBuffer(apd.audioData as any)) {
        inputBuffer = apd.audioData as unknown as Buffer;
      } else {
        inputBuffer = Buffer.alloc(0);
      }
    } else {
      inputBuffer = Buffer.alloc(0);
    }

    let channelData: Float32Array[] = [];
    let sourceSampleRate = this.sampleRate;
    let sourceChannels = this.channels;
    let duration = 0;

    if (inputBuffer.length === 0) {
      // 1s silence
      const frames = this.sampleRate;
      const float = new Float32Array(frames * this.channels);
      channelData = this.deinterleave(float, this.channels);
      sourceSampleRate = this.sampleRate;
      sourceChannels = this.channels;
      duration = 1;
    } else {
      // Decode any format via ffmpeg.wasm to signed 16-bit PCM at requested rate/channels, then convert to Float32
      const ffmpeg = createFFmpeg({ log: false });
      if (!ffmpeg.isLoaded()) await ffmpeg.load();
      ffmpeg.FS('writeFile', 'in', await fetchFile(inputBuffer));
      await ffmpeg.run('-i', 'in', '-f', 's16le', '-acodec', 'pcm_s16le', '-ar', String(this.sampleRate), '-ac', String(this.channels), 'out.pcm');
      sourceSampleRate = this.sampleRate;
      sourceChannels = this.channels;
      const out = ffmpeg.FS('readFile', 'out.pcm');
      const int16 = new Int16Array((out as Uint8Array).buffer, (out as Uint8Array).byteOffset, Math.floor((out as Uint8Array).byteLength / 2));
      const frames = Math.floor(int16.length / sourceChannels);
      channelData = Array.from({ length: sourceChannels }, () => new Float32Array(frames));
      for (let i = 0; i < frames; i++) {
        for (let c = 0; c < sourceChannels; c++) {
          const sVal = int16[i * sourceChannels + c] ?? 0;
          const s = sVal / 32768;
          (channelData[c]![i] as number) = s;
        }
      }
      duration = frames / sourceSampleRate;
    }

    // Resample and channel-map to desired output format
    const targetChannels = this.channels;
    const targetRate = this.sampleRate;
    const mapped = this.mapChannels(channelData, sourceChannels, targetChannels);
    const resampled = this.resample(mapped, sourceSampleRate, targetRate);

    // Apply volume (config default or override)
    const volume = overrideVolume ?? 1.0;
    if (volume !== 1.0) {
      for (let c = 0; c < resampled.length; c++) {
        const ch = resampled[c] || new Float32Array(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.max(-1, Math.min(1, (ch[i] ?? 0) * volume));
      }
    }

    // Interleave and convert to Int16 PCM
    const interleaved = this.interleave(resampled);
    const pcm = Buffer.allocUnsafe(interleaved.length * 2);
    for (let i = 0; i < interleaved.length; i++) {
      const sample = interleaved[i] ?? 0;
      let s = Math.max(-1, Math.min(1, sample));
      pcm.writeInt16LE((s * 32767) | 0, i * 2);
    }

    return { pcm, duration };
  }

  private deinterleave(float: Float32Array, channels: number): Float32Array[] {
    if (channels <= 1) return [float];
    const frames = Math.floor((float?.length ?? 0) / channels);
    const out = Array.from({ length: channels }, () => new Float32Array(frames));
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < channels; c++) out[c]![i] = float[i * channels + c] ?? 0;
    }
    return out;
  }

  private mapChannels(input: Float32Array[], inChannels: number, outChannels: number): Float32Array[] {
    if (inChannels === outChannels) return input.map(ch => ch.slice());
    const frames = input[0]?.length || 0;
    if (inChannels === 1 && outChannels === 2) {
      const mono = input[0] || new Float32Array(0);
      return [mono.slice(), mono.slice()];
    }
    if (inChannels === 2 && outChannels === 1) {
      const out = new Float32Array(frames);
      const L = input[0] || new Float32Array(0), R = input[1] || new Float32Array(0);
      for (let i = 0; i < frames; i++) out[i] = (((L[i] ?? 0) + (R[i] ?? 0)) / 2);
      return [out];
    }
    // General N->M: repeat or truncate channels
    const out = Array.from({ length: outChannels }, (_, c) => (input[Math.min(c, inChannels - 1)] || new Float32Array(0)).slice());
    return out;
  }

  private resample(channels: Float32Array[], inRate: number, outRate: number): Float32Array[] {
    if (inRate === outRate) return channels.map(ch => ch.slice());
    const ratio = outRate / inRate;
    return channels.map(ch => {
      const inLen = ch.length;
      const outLen = Math.max(1, Math.floor(inLen * ratio));
      const out = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const t = i / ratio;
        const i0 = Math.floor(t);
        const i1 = Math.min(i0 + 1, inLen - 1);
        const frac = t - i0;
        const a = ch[i0] ?? 0;
        const b = ch[i1] ?? 0;
        out[i] = a * (1 - frac) + b * frac;
      }
      return out;
    });
  }

  private interleave(channels: Float32Array[]): Float32Array {
    const frames = channels[0]?.length || 0;
    const out = new Float32Array(frames * channels.length);
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < channels.length; c++) out[i * channels.length + c] = channels[c]?.[i] ?? 0;
    }
    return out;
  }

  private estimateDurationByExt(ext: string, size: number): number {
    if (ext === '.wav') {
      return size / (this.sampleRate * this.channels * 2);
    }
    // For compressed formats we can’t know duration synchronously; default 5 s for tests
    return 5;
  }

  private cleanup(): void {
    this.isPlaying = false;
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = null;
    if (this.passthrough) {
      this.passthrough.destroy();
      this.passthrough = null;
    }
    if (this.speaker) {
      this.speaker.close(true);
      this.speaker = null;
    }
  }
}
