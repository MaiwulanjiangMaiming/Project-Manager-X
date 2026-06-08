import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

export class BackupManager {
  private static MAX_BACKUPS = 10;
  private metadataPath: string | undefined;

  constructor(
    private dataPath: string,
    metadataPath?: string
  ) {
    this.metadataPath = metadataPath;
  }

  async backup(): Promise<string | null> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const mainBackup = await this.backupFile(this.dataPath, timestamp);
    if (this.metadataPath) {
      await this.backupFile(this.metadataPath, timestamp);
    }

    return mainBackup;
  }

  private async backupFile(filePath: string, timestamp: string): Promise<string | null> {
    if (!fs.existsSync(filePath)) return null;

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const backupPath = path.join(dir, `${base}.backup-${timestamp}${ext}.gz`);

    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
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
      // Restore the main file (projects.json)
      const mainOk = await this.restoreFile(this.dataPath, backupPath);
      if (!mainOk) return false;

      // Try to restore the matching metadata backup
      if (this.metadataPath) {
        const metadataBackupPath = this.findMatchingBackup(backupPath, this.metadataPath);
        if (metadataBackupPath) {
          await this.restoreFile(this.metadataPath, metadataBackupPath);
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async restoreFile(targetPath: string, backupPath: string): Promise<boolean> {
    try {
      if (backupPath.endsWith('.gz')) {
        const compressed = await fs.promises.readFile(backupPath);
        const data = (await gunzipAsync(compressed)) as Buffer;
        await fs.promises.writeFile(targetPath, data);
      } else {
        await fs.promises.copyFile(backupPath, targetPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Given a backup path for one file, find the backup with the same
   * timestamp for a different file (e.g. projects.json → metadata.json).
   */
  private findMatchingBackup(sourceBackupPath: string, targetFilePath: string): string | null {
    const dir = path.dirname(sourceBackupPath);
    const filename = path.basename(sourceBackupPath);

    // Extract the timestamp from the source backup filename
    const timestampMatch = filename.match(/\.backup-([^.]+)/);
    if (!timestampMatch) return null;

    const timestamp = timestampMatch[1];
    const targetExt = path.extname(targetFilePath);
    const targetBase = path.basename(targetFilePath, targetExt);
    const expectedName = `${targetBase}.backup-${timestamp}${targetExt}.gz`;
    const expectedPath = path.join(dir, expectedName);

    if (fs.existsSync(expectedPath)) {
      return expectedPath;
    }
    return null;
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
