import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

export class BackupManager {
  private static MAX_BACKUPS = 10;

  constructor(private dataPath: string) {}

  async backup(): Promise<string | null> {
    if (!fs.existsSync(this.dataPath)) return null;

    const dir = path.dirname(this.dataPath);
    const ext = path.extname(this.dataPath);
    const base = path.basename(this.dataPath, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}.gz`);

    try {
      const data = await fs.promises.readFile(this.dataPath, 'utf-8');
      const compressed = (await gzipAsync(data)) as Buffer;
      await fs.promises.writeFile(backupPath, compressed);
      await this.pruneOldBackups(dir, base, ext);
      return backupPath;
    } catch {
      return null;
    }
  }

  async restore(backupPath: string): Promise<boolean> {
    try {
      if (backupPath.endsWith('.gz')) {
        const compressed = await fs.promises.readFile(backupPath);
        const data = (await gunzipAsync(compressed)) as Buffer;
        await fs.promises.writeFile(this.dataPath, data);
      } else {
        await fs.promises.copyFile(backupPath, this.dataPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  async listBackups(): Promise<string[]> {
    const dir = path.dirname(this.dataPath);
    const ext = path.extname(this.dataPath);
    const base = path.basename(this.dataPath, ext);

    if (!fs.existsSync(dir)) return [];

    try {
      const files = await fs.promises.readdir(dir);
      return files
        .filter(
          (f) => f.startsWith(`${base}.backup-`) && (f.endsWith(ext) || f.endsWith(`${ext}.gz`))
        )
        .sort()
        .reverse()
        .map((f) => path.join(dir, f));
    } catch {
      return [];
    }
  }

  private async pruneOldBackups(dir: string, base: string, ext: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(dir);
      const backups = files
        .filter(
          (f) => f.startsWith(`${base}.backup-`) && (f.endsWith(ext) || f.endsWith(`${ext}.gz`))
        )
        .sort();

      while (backups.length > BackupManager.MAX_BACKUPS) {
        const toDelete = backups.shift()!;
        await fs.promises.unlink(path.join(dir, toDelete));
      }
    } catch {
      /* ignore */
    }
  }
}
