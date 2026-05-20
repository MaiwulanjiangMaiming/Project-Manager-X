import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { BackupManager } from '../core/backup';

vi.mock('fs', () => {
  const existsSync = vi.fn();
  const readFile = vi.fn().mockResolvedValue('');
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const readdir = vi.fn().mockResolvedValue([]);
  const unlink = vi.fn().mockResolvedValue(undefined);
  const copyFile = vi.fn().mockResolvedValue(undefined);
  return {
    existsSync,
    promises: {
      readFile,
      writeFile,
      readdir,
      unlink,
      copyFile,
    },
    default: { existsSync, promises: { readFile, writeFile, readdir, unlink, copyFile } },
  };
});

vi.mock('zlib', () => {
  const gzip = vi.fn((data, callback) => {
    callback(null, Buffer.from('compressed'));
  });
  const gunzip = vi.fn((data, callback) => {
    callback(null, Buffer.from('{"projects":[]}'));
  });
  return {
    gzip,
    gunzip,
    default: { gzip, gunzip },
  };
});

describe('BackupManager', () => {
  const dataPath = '/data/projects.json';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create compressed backup file with .gz suffix', async () => {
    const manager = new BackupManager(dataPath);
    const originalData = '{"projects":[]}';
    const compressedData = Buffer.from('compressed');

    (fs.existsSync as any).mockReturnValue(true);
    (fs.promises.readFile as any).mockResolvedValue(originalData);
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.promises.readdir as any).mockResolvedValue([]);

    const backupPath = await manager.backup();

    expect(backupPath).not.toBeNull();
    expect(backupPath).toMatch(/\.backup-.*\.json\.gz$/);
    expect(fs.promises.readFile).toHaveBeenCalledWith(dataPath, 'utf-8');
    expect(fs.promises.writeFile).toHaveBeenCalledWith(backupPath, compressedData);
  });

  it('should return null when backing up non-existent file', async () => {
    const manager = new BackupManager(dataPath);
    (fs.existsSync as any).mockReturnValue(false);

    const result = await manager.backup();

    expect(result).toBeNull();
    expect(fs.promises.readFile).not.toHaveBeenCalled();
  });

  it('should return sorted backup list in reverse chronological order', async () => {
    const manager = new BackupManager(dataPath);
    const files = [
      'projects.backup-2024-01-01T00-00-00-000Z.json.gz',
      'projects.backup-2024-01-02T00-00-00-000Z.json.gz',
      'projects.backup-2024-01-03T00-00-00-000Z.json.gz',
    ];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.promises.readdir as any).mockResolvedValue(files);

    const backups = await manager.listBackups();

    expect(backups).toHaveLength(3);
    expect(backups[0]).toContain('2024-01-03');
    expect(backups[1]).toContain('2024-01-02');
    expect(backups[2]).toContain('2024-01-01');
  });

  it('should delete oldest backups and keep only 10 most recent', async () => {
    const manager = new BackupManager(dataPath);
    let currentFiles: string[] = [];
    for (let i = 1; i <= 12; i++) {
      const day = i.toString().padStart(2, '0');
      currentFiles.push(`projects.backup-2024-01-${day}T00-00-00-000Z.json.gz`);
    }

    (fs.existsSync as any).mockReturnValue(true);
    (fs.promises.readFile as any).mockResolvedValue('{}');
    (fs.promises.writeFile as any).mockImplementation(async (filePath: string) => {
      const fileName = filePath.split('/').pop() || filePath;
      currentFiles.push(fileName);
    });
    (fs.promises.readdir as any).mockImplementation(async () => [...currentFiles]);
    (fs.promises.unlink as any).mockImplementation(async (filePath: string) => {
      currentFiles = currentFiles.filter((f) => !filePath.includes(f));
    });

    await manager.backup();

    expect(fs.promises.unlink).toHaveBeenCalledTimes(3);
    const deletedPaths = (fs.promises.unlink as any).mock.calls.map((call: any[]) => call[0]);
    expect(deletedPaths.some((p: string) => p.includes('2024-01-01'))).toBe(true);
    expect(deletedPaths.some((p: string) => p.includes('2024-01-02'))).toBe(true);
    expect(deletedPaths.some((p: string) => p.includes('2024-01-03'))).toBe(true);
  });

  it('should restore from gzip backup by decompressing', async () => {
    const manager = new BackupManager(dataPath);
    const compressedData = Buffer.from('compressed');
    const originalData = Buffer.from('{"projects":[]}');

    (fs.promises.readFile as any).mockResolvedValue(compressedData);
    (fs.promises.writeFile as any).mockResolvedValue(undefined);

    const success = await manager.restore('/data/projects.backup-2024-01-01T00-00-00-000Z.json.gz');

    expect(success).toBe(true);
    expect(fs.promises.readFile).toHaveBeenCalledWith(
      '/data/projects.backup-2024-01-01T00-00-00-000Z.json.gz'
    );
    expect(fs.promises.writeFile).toHaveBeenCalledWith(dataPath, originalData);
  });

  it('should restore from old uncompressed backup using copyFile', async () => {
    const manager = new BackupManager(dataPath);
    (fs.promises.copyFile as any).mockResolvedValue(undefined);

    const success = await manager.restore('/data/projects.backup-2024-01-01T00-00-00-000Z.json');

    expect(success).toBe(true);
    expect(fs.promises.copyFile).toHaveBeenCalledWith(
      '/data/projects.backup-2024-01-01T00-00-00-000Z.json',
      dataPath
    );
  });

  it('should keep only the 10 most recent backups after multiple backups', async () => {
    const manager = new BackupManager(dataPath);
    let currentFiles: string[] = [];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.promises.readFile as any).mockResolvedValue('{}');
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.promises.unlink as any).mockImplementation(async (filePath: string) => {
      currentFiles = currentFiles.filter((f) => !filePath.includes(f));
    });

    (fs.promises.readdir as any).mockImplementation(async () => [...currentFiles]);

    for (let i = 1; i <= 15; i++) {
      const day = i.toString().padStart(2, '0');
      const newFile = `projects.backup-2024-01-${day}T00-00-00-000Z.json.gz`;
      currentFiles.push(newFile);
      await manager.backup();
    }

    const finalBackups = await manager.listBackups();
    expect(finalBackups).toHaveLength(10);
    expect(finalBackups[0]).toContain('2024-01-15');
    expect(finalBackups[9]).toContain('2024-01-06');
  });
});
