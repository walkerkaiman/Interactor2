import { EventEmitter } from 'events';
import { convertTo12Hour, convertTo24Hour, getCountdownToTarget, getMetronomeCountdown } from './DisplayFormatter';

export interface TimeEngineOptions {
  mode: 'clock' | 'metronome';
  targetTime?: string;        // 12-hour string e.g. "2:30 PM" - optional for metronome mode
  delayMs: number;           // metronome delay
  enabled: boolean;
}

export interface TickPayload {
  currentTime: string;   // already formatted string
  countdown: string;     // already formatted string
}

/**
 * Pure scheduling engine. Emits:
 *  - 'pulse'   (metronome)
 *  - 'clockHit' (target reached)
 *  - 'tick'    (once per second with display strings)
 */
export class TimeEngine extends EventEmitter {
  private intervalId?: NodeJS.Timeout;
  private displayIntervalId?: NodeJS.Timeout;
  private opts: TimeEngineOptions;

  private currentTime = '';
  private countdown = '';

  constructor(opts: TimeEngineOptions) {
    super();
    this.opts = { ...opts };
  }

  /** Start scheduling based on current opts. */
  start(): void {
    if (!this.opts.enabled) return;
    this.stop();

    if (this.opts.mode === 'clock') {
      this.startClockMode();
    } else {
      this.startMetronomeMode();
    }
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.displayIntervalId) clearInterval(this.displayIntervalId);
    this.intervalId = undefined;
    this.displayIntervalId = undefined;
  }

  update(opts: Partial<TimeEngineOptions>): void {
    this.opts = { ...this.opts, ...opts } as TimeEngineOptions;
    this.start(); // restart with new parameters
  }

  /* ---------------- private helpers ---------------- */

  private startClockMode(): void {
    // initial tick
    this.handleDisplayTick();

    // check every second
    this.intervalId = setInterval(() => {
      this.handleDisplayTick();
      if (!this.opts.enabled || this.opts.mode !== 'clock') return;

      if (this.isClockHit()) {
        this.emit('clockHit');
      }
    }, 1000);
  }

  private startMetronomeMode(): void {
    // initial pulse
    this.handleDisplayTick();
    this.emit('pulse');

    this.intervalId = setInterval(() => {
      if (!this.opts.enabled || this.opts.mode !== 'metronome') {
        this.stop();
        return;
      }
      this.handleDisplayTick();
      this.emit('pulse');
    }, this.opts.delayMs);

    // Display updates only once per second for UI consistency
    this.displayIntervalId = setInterval(() => {
      if (this.opts.enabled && this.opts.mode === 'metronome') this.handleDisplayTick();
    }, 1000); // Fixed at 1 second for display updates
  }

  private handleDisplayTick(): void {
    const now = new Date();
    // current time string (include seconds)
    this.currentTime = convertTo12Hour(convertTo24(now), now.getSeconds());

    // countdown
    if (this.opts.mode === 'clock' && this.opts.targetTime) {
      this.countdown = getCountdownToTarget(now, this.opts.targetTime);
    } else {
      this.countdown = getMetronomeCountdown(Date.now(), this.opts.delayMs);
    }

    this.emit('tick', { currentTime: this.currentTime, countdown: this.countdown } as TickPayload);
  }

  private isClockHit(): boolean {
    if (!this.opts.targetTime) return false;
    const now = new Date();
    const current24 = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return current24 === convertTo24Hour(this.opts.targetTime);
  }
}

function convertTo24(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
