import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmartFileWatcher } from '../core/smartWatcher';

describe('SmartFileWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces a burst of notifications into a single trailing callback', () => {
    const cb = vi.fn();
    const w = new SmartFileWatcher({ debounceMs: 500, maxWaitMs: 1500 });
    w.onChange = cb;

    // Simulate 5 file events in quick succession.
    w.notifyChange();
    vi.advanceTimersByTime(100);
    w.notifyChange();
    vi.advanceTimersByTime(100);
    w.notifyChange();
    vi.advanceTimersByTime(100);
    w.notifyChange();
    vi.advanceTimersByTime(100);
    w.notifyChange();

    // Nothing should have fired yet - the burst keeps resetting the timer.
    expect(cb).not.toHaveBeenCalled();

    // Wait past debounceMs of quiet.
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('fires on maxWait even if the burst never quiets down', () => {
    const cb = vi.fn();
    const w = new SmartFileWatcher({ debounceMs: 500, maxWaitMs: 1500 });
    w.onChange = cb;

    // First event arms the maxWait timer.
    w.notifyChange();

    // Continuous stream of events every 100ms for 5 seconds.
    for (let i = 0; i < 50; i++) {
      vi.advanceTimersByTime(100);
      w.notifyChange();
    }

    // The maxWait timer (1500ms after the first event) must have fired by now.
    // We don't care exactly when, only that it did - subsequent notifications
    // are coalesced into the existing pending call until it actually fires.
    expect(cb).toHaveBeenCalled();
  });

  it('fires immediately on leading edge when leading=true', () => {
    const cb = vi.fn();
    const w = new SmartFileWatcher({ debounceMs: 500, maxWaitMs: 1500, leading: true });
    w.onChange = cb;

    w.notifyChange();
    expect(cb).toHaveBeenCalledTimes(1);

    // Subsequent calls in the same burst should NOT re-fire leading.
    w.notifyChange();
    w.notifyChange();
    expect(cb).toHaveBeenCalledTimes(1);

    // After the burst quiets down, the trailing callback fires once.
    vi.advanceTimersByTime(500);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('flush() fires immediately and resets state', () => {
    const cb = vi.fn();
    const w = new SmartFileWatcher({ debounceMs: 500, maxWaitMs: 1500, leading: true });
    w.onChange = cb;

    w.notifyChange();
    expect(cb).toHaveBeenCalledTimes(1);

    w.flush();
    expect(cb).toHaveBeenCalledTimes(2);
    expect(w.isPending()).toBe(false);

    // A fresh burst after flush should fire leading edge again.
    w.notifyChange();
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('write() skips identical payloads', () => {
    const writeFn = vi.fn();
    const w = new SmartFileWatcher();

    w.write('hello', writeFn);
    w.write('hello', writeFn);
    w.write('hello', writeFn);
    expect(writeFn).toHaveBeenCalledTimes(1);

    w.write('world', writeFn);
    expect(writeFn).toHaveBeenCalledTimes(2);
  });

  it('dispose() clears all pending timers', () => {
    const cb = vi.fn();
    const w = new SmartFileWatcher({ debounceMs: 500, maxWaitMs: 1500 });
    w.onChange = cb;

    w.notifyChange();
    w.notifyChange();
    expect(w.isPending()).toBe(true);

    w.dispose();
    expect(w.isPending()).toBe(false);

    // Advancing time after dispose must not fire anything.
    vi.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('multiple bursts fire multiple times', () => {
    const cb = vi.fn();
    const w = new SmartFileWatcher({ debounceMs: 200, maxWaitMs: 800 });
    w.onChange = cb;

    // First burst
    w.notifyChange();
    vi.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledTimes(1);

    // Quiet period
    vi.advanceTimersByTime(500);

    // Second burst
    w.notifyChange();
    vi.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
