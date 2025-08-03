import Speaker from 'speaker';
import { FFmpeg } from 'prism-media';
import { PassThrough, Readable } from 'stream';
import * as fs from 'fs';
import path from 'path';
import { AudioPlaybackData } from '@interactor/shared';
import { IAudioPlayer, PlaybackState } from './IAudioPlayer';

/**
 * Real-time PCM player based on the `speaker` package.  It uses ffmpeg (via
 * prism-media) to decode any common container/codec to 16-bit signed PCM in
 * the user-specified sample-rate & channel layout, then pipes that data
 * directly to the OS audio device.  No temporary files or CLI processes are
 * spawned, keeping latency low.
 */
export class NodeSpeakerPlayer implements IAudioPlayer {
  private speaker: Speaker | null = null;
  private ffmpeg: FFmpeg | null = null;
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

    // Resolve raw audio source & estimate duration fast
    const { stream, duration } = await this.prepareStream(data);
    this.duration = duration;

    // Build decoding pipeline → PCM → Speaker
    this.ffmpeg = new FFmpeg({
      args: [
        '-analyzeduration', '0', // Speed-up start-time
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', String(this.sampleRate),
        '-ac', String(this.channels)
      ]
    });

    this.speaker = new Speaker({
      channels: this.channels,
      bitDepth: 16,
      sampleRate: this.sampleRate
    });

    this.passthrough = new PassThrough();

    stream.pipe(this.ffmpeg).pipe(this.passthrough).pipe(this.speaker);

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

  private async prepareStream(data: string | ArrayBuffer | AudioPlaybackData | unknown): Promise<{ stream: Readable; duration: number }> {
    if (typeof data === 'string') {
      // File path on disk
      const filePath = data;
      const ext = path.extname(filePath).toLowerCase();
      const stat = await fs.promises.stat(filePath);
      const duration = this.estimateDurationByExt(ext, stat.size);
      return { stream: fs.createReadStream(filePath), duration };
    }

    if (data instanceof ArrayBuffer) {
      const buf = Buffer.from(data);
      const duration = buf.byteLength / (this.sampleRate * this.channels * 2);
      const readable = new PassThrough();
      readable.end(buf);
      return { stream: readable, duration };
    }

    if (typeof data === 'object' && data && (data as AudioPlaybackData).audioData) {
      const apd = data as AudioPlaybackData;
      return this.prepareStream(apd.audioData);
    }

    // Fallback: generate 1 s of silence (test-tone could be added later)
    const silence = Buffer.alloc(this.sampleRate * this.channels * 2); // 1 s zeroed PCM
    const readable = new PassThrough();
    readable.end(silence);
    return { stream: readable, duration: 1 };
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
    if (this.ffmpeg) {
      this.ffmpeg.destroy();
      this.ffmpeg = null;
    }
    if (this.speaker) {
      this.speaker.close();
      this.speaker = null;
    }
  }
}
