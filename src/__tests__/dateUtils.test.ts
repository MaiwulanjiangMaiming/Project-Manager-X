import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatLastOpened } from '../utils/dateUtils';

describe('formatLastOpened', () => {
  let now: number;

  beforeEach(() => {
    now = 1700000000000; // 固定基准时间
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return undefined for undefined timestamp', () => {
    expect(formatLastOpened(undefined)).toBeUndefined();
  });

  it('should return undefined for zero timestamp', () => {
    expect(formatLastOpened(0)).toBeUndefined();
  });

  it('should return "Just now" for less than 1 minute ago', () => {
    expect(formatLastOpened(now - 30 * 1000)).toBe('Just now');
    expect(formatLastOpened(now - 59 * 1000)).toBe('Just now');
  });

  it('should return minutes ago for less than 1 hour ago', () => {
    expect(formatLastOpened(now - 60 * 1000)).toBe('1m ago');
    expect(formatLastOpened(now - 5 * 60 * 1000)).toBe('5m ago');
    expect(formatLastOpened(now - 59 * 60 * 1000)).toBe('59m ago');
  });

  it('should return hours ago for less than 24 hours ago', () => {
    expect(formatLastOpened(now - 60 * 60 * 1000)).toBe('1h ago');
    expect(formatLastOpened(now - 12 * 60 * 60 * 1000)).toBe('12h ago');
    expect(formatLastOpened(now - 23 * 60 * 60 * 1000)).toBe('23h ago');
  });

  it('should return "Yesterday" for 1 day ago', () => {
    expect(formatLastOpened(now - 24 * 60 * 60 * 1000)).toBe('Yesterday');
  });

  it('should return days ago for 2-6 days ago', () => {
    expect(formatLastOpened(now - 3 * 24 * 60 * 60 * 1000)).toBe('3 days ago');
    expect(formatLastOpened(now - 6 * 24 * 60 * 60 * 1000)).toBe('6 days ago');
  });

  it('should return weeks ago for 7-29 days ago', () => {
    expect(formatLastOpened(now - 10 * 24 * 60 * 60 * 1000)).toBe('1 weeks ago');
    expect(formatLastOpened(now - 20 * 24 * 60 * 60 * 1000)).toBe('2 weeks ago');
  });

  it('should return months ago for 30+ days ago', () => {
    expect(formatLastOpened(now - 60 * 24 * 60 * 60 * 1000)).toBe('2 months ago');
  });
});
