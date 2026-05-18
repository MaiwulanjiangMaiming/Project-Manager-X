import * as crypto from 'crypto';

export class SmartFileWatcher {
  private lastHash: string = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 500;
  onChange?: () => void;

  write(data: string, writeFn: (data: string) => void): void {
    const hash = crypto.createHash('md5').update(data).digest('hex');
    if (hash === this.lastHash) return;
    this.lastHash = hash;
    writeFn(data);
  }

  notifyChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.onChange?.();
    }, this.debounceMs);
  }

  updateHash(data: string): void {
    this.lastHash = crypto.createHash('md5').update(data).digest('hex');
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}
