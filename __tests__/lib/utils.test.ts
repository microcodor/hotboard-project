import { formatHotValue, formatTime, getRankColor, truncate } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('formatHotValue', () => {
    it('formats values under 10000', () => {
      expect(formatHotValue(9999)).toBe('9999');
    });

    it('formats values in 万 (10k)', () => {
      expect(formatHotValue(12345)).toBe('1.2万');
      expect(formatHotValue(100000)).toBe('10.0万');
    });

    it('formats values in 亿 (100M)', () => {
      expect(formatHotValue(100000000)).toBe('1.0亿');
      expect(formatHotValue(250000000)).toBe('2.5亿');
    });
  });

  describe('getRankColor', () => {
    it('returns red for rank 1', () => {
      expect(getRankColor(1)).toBe('text-red-500');
    });

    it('returns orange for rank 2', () => {
      expect(getRankColor(2)).toBe('text-orange-500');
    });

    it('returns yellow for rank 3', () => {
      expect(getRankColor(3)).toBe('text-yellow-500');
    });

    it('returns gray for rank > 3', () => {
      expect(getRankColor(4)).toBe('text-gray-500');
    });
  });

  describe('truncate', () => {
    it('returns original text if shorter than length', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates text and adds ellipsis', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });
  });
});
