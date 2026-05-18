import * as fs from 'fs';
import * as path from 'path';

export class BackupManager {
  private static MAX_BACKUPS = 5;

  constructor(private dataPath: string) {}

  backup(): string | null {
    if (!fs.existsSync(this.dataPath)) return null;

    const dir = path.dirname(this.dataPath);
    const ext = path.extname(this.dataPath);
    const base = path.basename(this.dataPath, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}`);

    try {
      fs.copyFileSync(this.dataPath, backupPath);
      this.pruneOldBackups(dir, base, ext);
      return backupPath;
    } catch {
      return null;
    }
  }

  restore(backupPath: string): boolean {
    try {
      fs.copyFileSync(backupPath, this.dataPath);
      return true;
    } catch {
      return false;
    }
  }

  listBackups(): string[] {
    const dir = path.dirname(this.dataPath);
    const ext = path.extname(this.dataPath);
    const base = path.basename(this.dataPath, ext);

    if (!fs.existsSync(dir)) return [];

    try {
      return fs
        .readdirSync(dir)
        .filter(f => f.startsWith(`${base}.backup-`) && f.endsWith(ext))
        .sort()
        .reverse()
        .map(f => path.join(dir, f));
    } catch {
      return [];
    }
  }

  private pruneOldBackups(dir: string, base: string, ext: string): void {
    try {
      const backups = fs
        .readdirSync(dir)
        .filter(f => f.startsWith(`${base}.backup-`) && f.endsWith(ext))
        .sort();

      while (backups.length > BackupManager.MAX_BACKUPS) {
        const toDelete = backups.shift()!;
        fs.unlinkSync(path.join(dir, toDelete));
      }
    } catch {}
  }
}
