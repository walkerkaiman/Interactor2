import { Logger } from '../../../../core/Logger';

export class TimeEngine {
  private timer: NodeJS.Timeout | null = null;
  private lastTickTime = 0;
  private tickInterval = 1000; // Default 1 second
  private logger?: Logger;
  
  constructor(
    private readonly onTick: () => void,
    private readonly onTrigger: () => void,
    mode?: 'clock' | 'metronome', // Made optional
    targetTime?: string,
    logger?: Logger
  ) {
    this.mode = mode || 'clock';
    this.targetTime = targetTime;
    this.logger = logger;
    this.logger?.debug('TimeEngine initialized', { mode: this.mode });
  }

  start(intervalMs: number): void {
    this.stop();
    this.tickInterval = intervalMs;
    this.timer = setInterval(() => this.handleTick(), intervalMs);
    this.logger?.debug(`TimeEngine started with ${intervalMs}ms interval`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger?.debug('TimeEngine stopped');
    }
  }

  updateConfig(mode: 'clock' | 'metronome', targetTime?: string, intervalMs?: number): void {
    this.mode = mode;
    this.targetTime = targetTime;
    if (intervalMs) this.tickInterval = intervalMs;
    this.logger?.debug('TimeEngine config updated', { mode, targetTime, intervalMs });
  }

  private handleTick(): void {
    const now = Date.now();
    this.logger?.debug('TimeEngine tick', {
      lastTickTime: this.lastTickTime,
      currentTime: now,
      interval: this.tickInterval,
      mode: this.mode,
      targetTime: this.targetTime
    });

    // Prevent duplicate ticks if the interval fires early
    if (now - this.lastTickTime < this.tickInterval * 0.9) {
      this.logger?.debug('Skipping duplicate tick');
      return;
    }
    this.lastTickTime = now;

    this.onTick();
    
    const shouldTrigger = this.shouldTrigger();
    this.logger?.debug('TimeEngine post-tick', {
      shouldTrigger,
      nextTickIn: this.tickInterval - (now - this.lastTickTime)
    });

    if (shouldTrigger) {
      this.logger?.debug('Triggering time event');
      this.onTrigger();
    }
  }

  private shouldTrigger(): boolean {
    if (this.mode === 'metronome') {
      this.logger?.debug('Metronome mode trigger');
      return true;
    }
    
    if (this.mode === 'clock' && this.targetTime) {
      const current = new Date();
      const target = this.parseTargetTime(this.targetTime);
      const shouldTrigger = current.getHours() === target.getHours() && 
             current.getMinutes() === target.getMinutes();
      
      this.logger?.debug('Clock mode trigger check', { 
        current: `${current.getHours()}:${current.getMinutes()}`,
        target: `${target.getHours()}:${target.getMinutes()}`,
        shouldTrigger
      });
      
      return shouldTrigger;
    }
    
    return false;
  }

  private parseTargetTime(time12h: string): Date {
    // Implementation matches existing time parsing logic
    const [time, period] = time12h.split(' ');
    const [hoursStr, minutesStr] = time.split(':');
    
    let hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    // If target time has passed today, set it for tomorrow
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }
    
    return date;
  }
}


