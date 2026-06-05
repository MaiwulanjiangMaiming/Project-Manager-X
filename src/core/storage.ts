/**
 * Project Manager X
 * Copyright (c) 2026 Maiwulanjiang Maiming <mawlan.momin@gmail.com>
 * Licensed under GPL-3.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { z } from 'zod';
import {
  StorageData,
  Project,
  ProjectType,
  ProjectLifecycle,
  Tag,
  Settings,
  Task,
  Milestone,
  ChangelogEntry,
  ContextSnapshot,
  Note,
  DEFAULT_SETTINGS,
  DEFAULT_TAGS,
  DATA_VERSION,
} from '../types';
import { runMigrations } from './migrations';
import { BackupManager } from './backup';

interface RawProject {
  id?: string;
  name?: string;
  path?: string;
  rootPath?: string;
  tags?: string[];
  enabled?: boolean;
  lastOpened?: number;
  type?: string;
  lifecycle?: string;
  lifecycleOverride?: string;
  remote?: Project['remote'];
  health?: Project['health'];
}

interface StoredMetadata {
  tasks?: Task[];
  milestones?: Milestone[];
  changelog?: ChangelogEntry[];
  snapshots?: ContextSnapshot[];
  notes?: Note[];
  tags?: Tag[];
  settings?: Settings;
  dataVersion?: number;
}

const STORAGE_KEY = 'projectManagerPro';
const PROJECTS_FILE = 'projects.json';
const METADATA_FILE = 'metadata.json';

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  lastOpened: z.number().optional(),
  type: z.string().default('any'),
  lifecycle: z.string().default('active'),
  lifecycleOverride: z.string().optional(),
  remote: z.any().optional(),
  health: z.any().optional(),
});

const ProjectsFileSchema = z.array(ProjectSchema);

export class Storage {
  private cache: StorageData | null = null;
  private projectsFilePath: string;
  private metadataFilePath: string;
  backupManager?: BackupManager;
  /**
   * Called after a data file is successfully written to disk.
   * The key identifies which file ('projects' or 'metadata') and the
   * content is the raw JSON string — used by SmartFileWatcher to skip
   * self-writes.
   */
  onAfterWrite?: (key: string, content: string) => void;

  constructor(private context: vscode.ExtensionContext) {
    const configLocation = vscode.workspace
      .getConfiguration('projectManagerPro')
      .get<string>('projectsLocation', '');
    if (configLocation) {
      const base = expandHomePath(configLocation);
      this.projectsFilePath = path.join(base, PROJECTS_FILE);
      this.metadataFilePath = path.join(base, METADATA_FILE);
    } else {
      const base = getAppDataDir();
      this.projectsFilePath = path.join(base, PROJECTS_FILE);
      this.metadataFilePath = path.join(base, METADATA_FILE);
    }
  }

  setBackupManager(bm: BackupManager): void {
    this.backupManager = bm;
  }

  getProjectsFilePath(): string {
    return this.projectsFilePath;
  }

  getMetadataFilePath(): string {
    return this.metadataFilePath;
  }

  // ─── Projects file ──────────────────────────────────────────────

  private loadProjectsFromFile(): Project[] {
    if (!fs.existsSync(this.projectsFilePath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(this.projectsFilePath, 'utf-8');
      const raw = JSON.parse(content);
      if (!Array.isArray(raw)) return [];

      const result = ProjectsFileSchema.safeParse(raw);
      if (!result.success) {
        vscode.window.showErrorMessage('Project data validation failed. Using empty project list.');
        return [];
      }

      return result.data.map((item: RawProject) => ({
        id: item.id || Date.now().toString(),
        name: item.name || '',
        path: item.path || item.rootPath || '',
        tags: item.tags || [],
        enabled: item.enabled !== false,
        lastOpened: item.lastOpened || 0,
        type: (item.type || 'any') as ProjectType,
        lifecycle: (item.lifecycle || 'active') as ProjectLifecycle,
        lifecycleOverride: item.lifecycleOverride as ProjectLifecycle | undefined,
        remote: item.remote,
        health: item.health,
      }));
    } catch {
      return this.cache ? this.cache.projects : [];
    }
  }

  // ─── Metadata file ──────────────────────────────────────────────

  private loadMetadataFromFile(): StoredMetadata {
    if (!fs.existsSync(this.metadataFilePath)) {
      return {};
    }
    try {
      const content = fs.readFileSync(this.metadataFilePath, 'utf-8');
      return JSON.parse(content) as StoredMetadata;
    } catch {
      return this.cache
        ? {
            tasks: this.cache.tasks,
            milestones: this.cache.milestones,
            changelog: this.cache.changelog,
            snapshots: this.cache.snapshots,
            notes: this.cache.notes,
            tags: this.cache.tags,
            settings: this.cache.settings,
            dataVersion: DATA_VERSION,
          }
        : {};
    }
  }

  /**
   * One-time migration: if metadata.json does not exist yet but the old
   * globalState key has data, write it to metadata.json so other IDEs can
   * read it. After a successful write the globalState key is cleared to
   * avoid re-migrating on the next activation.
   */
  private async migrateGlobalStateToFile(): Promise<void> {
    if (fs.existsSync(this.metadataFilePath)) return;

    const legacy = this.context.globalState.get<StoredMetadata>(STORAGE_KEY);
    if (!legacy || Object.keys(legacy).length === 0) return;

    // Only migrate if there is real user data (not just the version stamp
    // that getDataInner writes on first activation).
    const hasRealData =
      (legacy.tasks && legacy.tasks.length > 0) ||
      (legacy.milestones && legacy.milestones.length > 0) ||
      (legacy.changelog && legacy.changelog.length > 0) ||
      (legacy.snapshots && legacy.snapshots.length > 0) ||
      (legacy.notes && legacy.notes.length > 0) ||
      (legacy.tags &&
        legacy.tags.length > 0 &&
        legacy.tags.some((t) => t.id !== 'personal' && t.id !== 'work' && t.id !== 'learning')) ||
      (legacy.settings && JSON.stringify(legacy.settings) !== JSON.stringify(DEFAULT_SETTINGS));

    if (!hasRealData) return;

    try {
      const dir = path.dirname(this.metadataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const content = JSON.stringify(
        {
          tasks: legacy.tasks || [],
          milestones: legacy.milestones || [],
          changelog: legacy.changelog || [],
          snapshots: legacy.snapshots || [],
          notes: legacy.notes || [],
          tags: legacy.tags || [...DEFAULT_TAGS],
          settings: { ...DEFAULT_SETTINGS, ...(legacy.settings || {}) },
          dataVersion: legacy.dataVersion || DATA_VERSION,
        },
        null,
        2
      );
      const tmpPath = `${this.metadataFilePath}.${process.pid}.${Date.now()}.tmp`;
      await fs.promises.writeFile(tmpPath, content, 'utf-8');
      await fs.promises.rename(tmpPath, this.metadataFilePath);
      // Clear globalState to avoid re-migrating
      await this.context.globalState.update(STORAGE_KEY, undefined);
      vscode.window.showInformationMessage(
        'Project Manager X: migrated metadata to shared file for cross-IDE sync.'
      );
    } catch {
      // Non-fatal: the next activation will try again.
    }
  }

  // ─── Force reload (with retry) ──────────────────────────────────

  async forceReloadProjects(options?: { attempts?: number; delayMs?: number }): Promise<Project[]> {
    const attempts = options?.attempts ?? 5;
    const delayMs = options?.delayMs ?? 50;

    let lastError: unknown = null;
    for (let i = 0; i < attempts; i++) {
      if (!fs.existsSync(this.projectsFilePath)) {
        if (this.cache) {
          this.cache = { ...this.cache, projects: [] };
        }
        return [];
      }
      try {
        const content = fs.readFileSync(this.projectsFilePath, 'utf-8');
        const raw = JSON.parse(content);
        if (!Array.isArray(raw)) {
          throw new Error('Root is not an array');
        }
        const result = ProjectsFileSchema.safeParse(raw);
        if (!result.success) {
          throw new Error('Schema validation failed');
        }
        const projects = result.data.map((item: RawProject) => ({
          id: item.id || Date.now().toString(),
          name: item.name || '',
          path: item.path || item.rootPath || '',
          tags: item.tags || [],
          enabled: item.enabled !== false,
          lastOpened: item.lastOpened || 0,
          type: (item.type || 'any') as ProjectType,
          lifecycle: (item.lifecycle || 'active') as ProjectLifecycle,
          lifecycleOverride: item.lifecycleOverride as ProjectLifecycle | undefined,
          remote: item.remote,
          health: item.health,
        }));
        if (this.cache) {
          this.cache.projects = projects;
        } else {
          this.cache = {
            projects,
            tasks: [],
            milestones: [],
            changelog: [],
            snapshots: [],
            notes: [],
            tags: [...DEFAULT_TAGS],
            settings: { ...DEFAULT_SETTINGS },
          };
        }
        return projects;
      } catch (e) {
        lastError = e;
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
    vscode.window.showErrorMessage(
      `Project Manager X: failed to read projects.json after ${attempts} attempts. Keeping previous data. (${String(
        lastError
      )})`
    );
    return this.cache ? this.cache.projects : [];
  }

  /**
   * Force-reload metadata.json from disk (with retry). Used when the
   * file watcher detects an external change.
   */
  async forceReloadMetadata(options?: { attempts?: number; delayMs?: number }): Promise<void> {
    const attempts = options?.attempts ?? 5;
    const delayMs = options?.delayMs ?? 50;

    let lastError: unknown = null;
    for (let i = 0; i < attempts; i++) {
      if (!fs.existsSync(this.metadataFilePath)) {
        if (this.cache) {
          this.cache.tasks = [];
          this.cache.milestones = [];
          this.cache.changelog = [];
          this.cache.snapshots = [];
          this.cache.notes = [];
          this.cache.tags = [...DEFAULT_TAGS];
          this.cache.settings = { ...DEFAULT_SETTINGS };
        }
        return;
      }
      try {
        const content = fs.readFileSync(this.metadataFilePath, 'utf-8');
        const raw = JSON.parse(content) as StoredMetadata;
        if (this.cache) {
          this.cache.tasks = raw.tasks || [];
          this.cache.milestones = raw.milestones || [];
          this.cache.changelog = raw.changelog || [];
          this.cache.snapshots = raw.snapshots || [];
          this.cache.notes = raw.notes || [];
          this.cache.tags = raw.tags || [...DEFAULT_TAGS];
          this.cache.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
        } else {
          this.cache = {
            projects: [],
            tasks: raw.tasks || [],
            milestones: raw.milestones || [],
            changelog: raw.changelog || [],
            snapshots: raw.snapshots || [],
            notes: raw.notes || [],
            tags: raw.tags || [...DEFAULT_TAGS],
            settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
          };
        }
        return;
      } catch (e) {
        lastError = e;
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
    vscode.window.showErrorMessage(
      `Project Manager X: failed to read metadata.json after ${attempts} attempts. (${String(
        lastError
      )})`
    );
  }

  // ─── Atomic file writes ─────────────────────────────────────────

  private async saveProjectsToFile(projects: Project[]): Promise<void> {
    const dir = path.dirname(this.projectsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(projects, null, 2);
    const tmpPath = `${this.projectsFilePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.promises.writeFile(tmpPath, content, 'utf-8');
      await fs.promises.rename(tmpPath, this.projectsFilePath);
      this.onAfterWrite?.('projects', content);
    } catch (e) {
      try {
        await fs.promises.unlink(tmpPath);
      } catch {
        // ignore
      }
      throw e;
    }
  }

  private async saveMetadataToFile(metadata: StoredMetadata): Promise<void> {
    const dir = path.dirname(this.metadataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(metadata, null, 2);
    const tmpPath = `${this.metadataFilePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.promises.writeFile(tmpPath, content, 'utf-8');
      await fs.promises.rename(tmpPath, this.metadataFilePath);
      this.onAfterWrite?.('metadata', content);
    } catch (e) {
      try {
        await fs.promises.unlink(tmpPath);
      } catch {
        // ignore
      }
      throw e;
    }
  }

  // ─── Cache / getData ────────────────────────────────────────────

  private getDataInner(): StorageData {
    let projects = this.loadProjectsFromFile();

    // On first activation, migrate legacy globalState data to metadata.json
    // so that tags/tasks/etc. are shared across IDEs.
    const fileMetadata = this.loadMetadataFromFile();
    const legacyMetadata = this.context.globalState.get<StoredMetadata>(STORAGE_KEY);

    // Determine which metadata source to use:
    // 1. If metadata.json exists and has data → use it (authoritative)
    // 2. Else if globalState has data → use it (and schedule migration)
    // 3. Else → use defaults
    let metadata: StoredMetadata;
    const fileHasData =
      (fileMetadata.tasks && fileMetadata.tasks.length > 0) ||
      (fileMetadata.milestones && fileMetadata.milestones.length > 0) ||
      (fileMetadata.changelog && fileMetadata.changelog.length > 0) ||
      (fileMetadata.snapshots && fileMetadata.snapshots.length > 0) ||
      (fileMetadata.notes && fileMetadata.notes.length > 0) ||
      (fileMetadata.tags && fileMetadata.tags.length > 0) ||
      fileMetadata.settings !== undefined;

    if (fileHasData) {
      metadata = fileMetadata;
    } else if (legacyMetadata && Object.keys(legacyMetadata).length > 0) {
      metadata = legacyMetadata;
      // Schedule async migration — don't block the initial load
      this.migrateGlobalStateToFile().catch(() => {});
    } else {
      metadata = {};
    }

    // Run migrations if needed
    const storedVersion = metadata.dataVersion;
    if (storedVersion !== undefined && storedVersion < DATA_VERSION) {
      const migrated = runMigrations(
        {
          projects,
          tasks: metadata.tasks || [],
          milestones: metadata.milestones || [],
          changelog: metadata.changelog || [],
          snapshots: metadata.snapshots || [],
          notes: metadata.notes || [],
          tags: metadata.tags || [...DEFAULT_TAGS],
          settings: { ...DEFAULT_SETTINGS, ...(metadata.settings || {}) },
        },
        storedVersion
      );
      projects = migrated.projects;
      // Write migrated data to metadata.json (fire-and-forget)
      this.saveMetadataToFile({
        tasks: migrated.tasks,
        milestones: migrated.milestones,
        changelog: migrated.changelog,
        snapshots: migrated.snapshots,
        notes: migrated.notes,
        tags: migrated.tags,
        settings: migrated.settings,
        dataVersion: DATA_VERSION,
      }).catch(() => {});
    }

    return {
      projects,
      tasks: metadata.tasks || [],
      milestones: metadata.milestones || [],
      changelog: metadata.changelog || [],
      snapshots: metadata.snapshots || [],
      notes: metadata.notes || [],
      tags: metadata.tags || [...DEFAULT_TAGS],
      settings: { ...DEFAULT_SETTINGS, ...(metadata.settings || {}) },
    };
  }

  getData(): StorageData {
    if (!this.cache) {
      this.cache = this.getDataInner();
    }
    return this.cache;
  }

  invalidateCache(): void {
    this.cache = null;
  }

  // ─── Save operations ────────────────────────────────────────────

  private async saveMetadata(data: StorageData): Promise<void> {
    this.cache = data;
    await this.saveMetadataToFile({
      tasks: data.tasks,
      milestones: data.milestones,
      changelog: data.changelog,
      snapshots: data.snapshots,
      notes: data.notes,
      tags: data.tags,
      settings: data.settings,
      dataVersion: DATA_VERSION,
    });
  }

  async saveData(data: StorageData): Promise<void> {
    if (this.backupManager) {
      await this.backupManager.backup();
    }
    await this.saveProjectsToFile(data.projects);
    await this.saveMetadata(data);
  }

  getProjects(): Project[] {
    return this.getData().projects;
  }

  async saveProjects(projects: Project[]): Promise<void> {
    await this.saveProjectsToFile(projects);
    if (this.cache) {
      this.cache.projects = projects;
    }
  }

  getTasks(): Task[] {
    return this.getData().tasks;
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    const data = this.getData();
    data.tasks = tasks;
    await this.saveMetadata(data);
  }

  getMilestones(): Milestone[] {
    return this.getData().milestones;
  }

  async saveMilestones(milestones: Milestone[]): Promise<void> {
    const data = this.getData();
    data.milestones = milestones;
    await this.saveMetadata(data);
  }

  getChangelog(): ChangelogEntry[] {
    return this.getData().changelog;
  }

  async saveChangelog(changelog: ChangelogEntry[]): Promise<void> {
    const data = this.getData();
    data.changelog = changelog;
    await this.saveMetadata(data);
  }

  getSnapshots(): ContextSnapshot[] {
    return this.getData().snapshots;
  }

  async saveSnapshots(snapshots: ContextSnapshot[]): Promise<void> {
    const data = this.getData();
    data.snapshots = snapshots;
    await this.saveMetadata(data);
  }

  getNotes(): Note[] {
    return this.getData().notes;
  }

  async saveNotes(notes: Note[]): Promise<void> {
    const data = this.getData();
    data.notes = notes;
    await this.saveMetadata(data);
  }

  getTags(): Tag[] {
    return this.getData().tags;
  }

  async saveTags(tags: Tag[]): Promise<void> {
    const data = this.getData();
    data.tags = tags;
    await this.saveMetadata(data);
  }

  getSettings(): Settings {
    return this.getData().settings;
  }

  async saveSettings(settings: Settings): Promise<void> {
    const data = this.getData();
    data.settings = settings;
    await this.saveMetadata(data);
  }

  async addProject(project: Project): Promise<void> {
    const projects = this.getProjects();
    projects.push(project);
    await this.saveProjects(projects);
  }

  async updateProject(project: Project): Promise<void> {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index !== -1) {
      projects[index] = project;
      await this.saveProjects(projects);
    }
  }

  async deleteProject(id: string): Promise<void> {
    const data = this.getData();
    data.projects = data.projects.filter((p) => p.id !== id);
    data.tasks = data.tasks.filter((t) => t.projectId !== id);
    data.milestones = data.milestones.filter((m) => m.projectId !== id);
    data.changelog = data.changelog.filter((c) => c.projectId !== id);
    data.snapshots = data.snapshots.filter((s) => s.projectId !== id);
    data.notes = data.notes.filter((n) => n.projectId !== id);
    await this.saveData(data);
  }

  async addTask(task: Task): Promise<void> {
    const tasks = this.getTasks();
    tasks.push(task);
    await this.saveTasks(tasks);
  }

  async updateTask(task: Task): Promise<void> {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === task.id);
    if (index !== -1) {
      tasks[index] = task;
      await this.saveTasks(tasks);
    }
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    await this.saveTasks(tasks);
  }

  async addMilestone(milestone: Milestone): Promise<void> {
    const milestones = this.getMilestones();
    milestones.push(milestone);
    await this.saveMilestones(milestones);
  }

  async updateMilestone(milestone: Milestone): Promise<void> {
    const milestones = this.getMilestones();
    const index = milestones.findIndex((m) => m.id === milestone.id);
    if (index !== -1) {
      milestones[index] = milestone;
      await this.saveMilestones(milestones);
    }
  }

  async deleteMilestone(id: string): Promise<void> {
    const milestones = this.getMilestones().filter((m) => m.id !== id);
    await this.saveMilestones(milestones);
  }

  async addChangelogEntry(entry: ChangelogEntry): Promise<void> {
    const changelog = this.getChangelog();
    changelog.push(entry);
    await this.saveChangelog(changelog);
  }

  async updateChangelogEntry(entry: ChangelogEntry): Promise<void> {
    const changelog = this.getChangelog();
    const index = changelog.findIndex((c) => c.id === entry.id);
    if (index !== -1) {
      changelog[index] = entry;
      await this.saveChangelog(changelog);
    }
  }

  async deleteChangelogEntry(id: string): Promise<void> {
    const changelog = this.getChangelog().filter((c) => c.id !== id);
    await this.saveChangelog(changelog);
  }

  async addSnapshot(snapshot: ContextSnapshot): Promise<void> {
    const snapshots = this.getSnapshots();
    snapshots.push(snapshot);
    await this.saveSnapshots(snapshots);
  }

  async addNote(note: Note): Promise<void> {
    const notes = this.getNotes();
    notes.push(note);
    await this.saveNotes(notes);
  }

  async updateNote(note: Note): Promise<void> {
    const notes = this.getNotes();
    const index = notes.findIndex((n) => n.id === note.id);
    if (index !== -1) {
      notes[index] = note;
      await this.saveNotes(notes);
    }
  }

  async deleteNote(id: string): Promise<void> {
    const notes = this.getNotes().filter((n) => n.id !== id);
    await this.saveNotes(notes);
  }

  async addTag(tag: Tag): Promise<void> {
    const tags = this.getTags();
    tags.push(tag);
    await this.saveTags(tags);
  }

  async updateTag(tag: Tag): Promise<void> {
    const tags = this.getTags();
    const index = tags.findIndex((t) => t.id === tag.id);
    if (index !== -1) {
      tags[index] = tag;
      await this.saveTags(tags);
    }
  }

  async deleteTag(id: string): Promise<void> {
    const tags = this.getTags().filter((t) => t.id !== id);
    const projects = this.getProjects().map((p) => ({
      ...p,
      tags: p.tags.filter((t) => t !== id),
    }));
    await this.saveData({ ...this.getData(), projects, tags });
  }
}

function expandHomePath(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function getAppDataDir(): string {
  const home = os.homedir();
  const dir = path.join(home, '.project-manager-pro');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
