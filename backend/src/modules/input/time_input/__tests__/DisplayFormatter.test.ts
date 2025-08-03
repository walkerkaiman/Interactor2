import { convertTo12Hour, convertTo24Hour, getCountdownToTarget, getMetronomeCountdown } from '../DisplayFormatter';

describe('DisplayFormatter', () => {
  describe('convertTo12Hour', () => {
    it('converts midnight', () => {
      expect(convertTo12Hour('00:00')).toBe('12:00 AM');
    });

    it('converts afternoon', () => {
      expect(convertTo12Hour('14:05')).toBe('2:05 PM');
    });
  });

  describe('convertTo24Hour', () => {
    it('converts noon', () => {
      expect(convertTo24Hour('12:00 PM')).toBe('12:00');
    });

    it('converts 1:30 AM', () => {
      expect(convertTo24Hour('1:30 AM')).toBe('01:30');
    });
  });

  describe('getCountdownToTarget', () => {
    it('returns seconds diff less than a minute', () => {
      const now = new Date('2025-01-01T12:00:50');
      expect(getCountdownToTarget(now, '12:01 PM')).toBe('10s');
    });
  });

  describe('getMetronomeCountdown', () => {
    it('counts down correctly', () => {
      // delay 1000ms, 300ms after last pulse → 700 left → ceil => 1s
      expect(getMetronomeCountdown(1300, 1000)).toBe('1s to next');
    });
  });
});
