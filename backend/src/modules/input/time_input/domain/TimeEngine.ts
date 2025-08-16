import { Logger } from '../../../../core/Logger';

export class TimeEngine {
  private timer: NodeJS.Timeout | null = null;
  private lastTickTime = 0;
  private displayInterval = 1000; // Always update display every 1 second
  private triggerInterval = 1000; // Trigger interval (can be different from display)
  private logger?: Logger;
  private mode: 'clock' | 'metronome' = 'clock';
  private targetTime?: string;
  
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
    this.logger?.debug('TimeEngine initialized with mode: ' + this.mode);
  }

  start(intervalMs: number): void {
    this.stop();
    this.triggerInterval = intervalMs;
    // Always update display every second, regardless of trigger interval
    this.timer = setInterval(() => this.handleTick(), this.displayInterval);
    this.logger?.debug(`TimeEngine started with ${intervalMs}ms trigger interval, ${this.displayInterval}ms display interval`);
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
    if (intervalMs) this.triggerInterval = intervalMs;
    this.logger?.debug(`TimeEngine config updated - mode: ${mode}, targetTime: ${targetTime}, intervalMs: ${intervalMs}`);
  }

  private handleTick(): void {
    const now = Date.now();
    
    // Always update the display
    this.onTick();
    
    // Check if we should trigger based on the trigger interval
    const shouldTrigger = this.shouldTrigger(now);
    
    if (shouldTrigger) {
      this.logger?.debug('Triggering time event');
      this.onTrigger();
    }
  }

  private shouldTrigger(now: number): boolean {
    if (this.mode === 'metronome') {
      // For metronome, trigger every triggerInterval milliseconds
      return (now % this.triggerInterval) < this.displayInterval;
    }
    
    if (this.mode === 'clock' && this.targetTime) {
      const current = new Date();
      const target = this.parseTargetTime(this.targetTime);
      
      const shouldTrigger = current.getHours() === target.getHours() && 
             current.getMinutes() === target.getMinutes() &&
             current.getSeconds() === 0; // Only trigger at the start of the minute
      
      this.logger?.debug(`Clock mode trigger check - current: ${current.getHours()}:${current.getMinutes()}:${current.getSeconds()}, target: ${target.getHours()}:${target.getMinutes()}, shouldTrigger: ${shouldTrigger}`);
      
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


