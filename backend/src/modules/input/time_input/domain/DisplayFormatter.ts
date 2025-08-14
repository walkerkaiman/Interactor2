import { InteractorError } from '../../../../core/ErrorHandler';

export function convertTo12Hour(time24: string, includeSeconds: number | null = null): string {
  const parts = time24.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw InteractorError.validation(
      'Cannot convert invalid 24-hour time format',
      { provided: time24, expected: 'HH:MM format' },
      ['Use format like "14:30" for 2:30 PM', 'Ensure hours are 0-23 and minutes are 0-59']
    );
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const base = `${hours12}:${minutes.toString().padStart(2, '0')}`;
  if (includeSeconds != null) {
    return `${base}:${includeSeconds.toString().padStart(2, '0')} ${period}`;
  }
  return `${base} ${period}`;
}

export function convertTo24Hour(time12: string): string {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw InteractorError.validation(
      'Cannot convert invalid 12-hour time format',
      { provided: time12, expected: 'h:MM AM/PM format' },
      ['Use format like "2:30 PM"', 'Include AM/PM designation']
    );
  }
  const hoursStr = match[1] as string;
  const minutesStr = match[2] as string;
  const periodStr = match[3] as string;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const period = periodStr.toUpperCase();
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function getCountdownToTarget(now: Date, targetTime12: string): string {
  const targetTime24 = convertTo24Hour(targetTime12);
  const [h, m] = targetTime24.split(':').map(Number);
  if (h === undefined || m === undefined) return 'Invalid time';
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const diffMs = target.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  if (diffHours > 0) return `${diffHours}h ${diffMinutes}m ${diffSeconds}s`;
  if (diffMinutes > 0) return `${diffMinutes}m ${diffSeconds}s`;
  return `${diffSeconds}s`;
}

export function getMetronomeCountdown(nowMs: number, delayMs: number): string {
  const timeSinceLastPulse = nowMs % delayMs;
  const timeToNext = delayMs - timeSinceLastPulse;
  const seconds = Math.ceil(timeToNext / 1000);
  return seconds > 0 ? `${seconds}s to next` : 'Now!';
}


