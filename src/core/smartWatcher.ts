/**
 * Project Manager X
 * Copyright (c) 2026 Maiwulanjiang Maiming <mawlan.momin@gmail.com>
 * Licensed under GPL-3.0
 */

import * as crypto from 'crypto';

export interface SmartWatcherOptions {
  /** Trailing-edge debounce window after the last notification. */
  debounceMs?: number;
  /**
   * Maximum total time the debounce can be delayed by repeated notifications.
   * After this many ms have elapsed since the first notification in a burst,
   * the callback fires regardless of further notifications. Prevents the
   * "burst of events resets the timer forever" bug seen with multi-event
   * file saves on macOS.
   */
  maxWaitMs?: number;
  /**
   * If true, the first notification fires immediately (leading edge), and
   * any further notifications within the same burst are coalesced into a
   * single trailing callback. Default false.
   */
  leading?: boolean;
}

/**
 * A smart file-change debouncer.
 *
 * The original implementation only had a simple trailing debounce, which
 * breaks when a single save triggers multiple file events in quick
 * succession (very common on macOS FSEvents and with editors that
 * write-then-rename). The repeated `clearTimeout` calls would postpone the
 * callback indefinitely, so the UI never refreshed.
 *
 * `SmartFileWatcher` adds two safety nets:
 *  1. `maxWaitMs` - hard cap on how long the callback can be delayed.
 *  2. Optional `leading` edge - fire immediately on the first notification.
 */
export class SmartFileWatcher {
  private lastHash: string = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  private leadingFired = false;

  private readonly debounceMs: number;
  private readonly maxWaitMs: number;
  private readonly leading: boolean;

  onChange?: () => void;

  constructor(options: SmartWatcherOptions = {}) {
    this.debounceMs = options.debounceMs ?? 500;
    this.maxWaitMs = options.maxWaitMs ?? 1500;
    this.leading = options.leading ?? false;
  }

  /**
   * Write `data` via `writeFn` only if it differs from the last value.
   * Hashing is cheap; this avoids spurious disk writes when the caller
   * re-saves identical data.
   */
  write(data: string, writeFn: (data: string) => void): void {
    const hash = crypto.createHash('md5').update(data).digest('hex');
    if (hash === this.lastHash) return;
    this.lastHash = hash;
    writeFn(data);
  }

  /**
   * Schedule the onChange callback. Coalesces a burst of notifications:
   *  - if `leading` is true and this is the first call in a burst, fires
   *    immediately,
   *  - always fires after `debounceMs` of quiet,
   *  - always fires no later than `debounceMs + maxWaitMs` after the first
   *    call in a burst, so a busy stream still terminates.
   */
  notifyChange(): void {
    // Leading edge: fire once per burst, immediately.
    if (this.leading && !this.leadingFired && this.onChange) {
      this.leadingFired = true;
      this.onChange();
    }

    // Reset the trailing debounce.
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);

    // Arm the maxWait safety net if not already armed.
    if (!this.maxWaitTimer) {
      this.maxWaitTimer = setTimeout(() => {
        this.flush();
      }, this.maxWaitMs);
    }
  }

  /**
   * Force-fire the onChange callback right now and reset all timers. Used
   * by tests and by the explicit refresh command.
   */
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.leadingFired = false;
    this.onChange?.();
  }

  /**
   * Update the dedup hash without firing onChange. Useful after we have
   * already read a file synchronously and want to skip the next event for
   * the same content.
   */
  updateHash(data: string): void {
    this.lastHash = crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * True if there is a pending callback. Used by the tests to assert
   * back-pressure behaviour.
   */
  isPending(): boolean {
    return this.debounceTimer !== null || this.maxWaitTimer !== null;
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.leadingFired = false;
  }
}
