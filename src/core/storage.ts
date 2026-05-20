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
  backupManager?: BackupManager;

  constructor(private context: vscode.ExtensionContext) {
    const configLocation = vscode.workspace
      .getConfiguration('projectManagerPro')
      .get<string>('projectsLocation', '');
    if (configLocation) {
      this.projectsFilePath = path.join(expandHomePath(configLocation), PROJECTS_FILE);
    } else {
      this.projectsFilePath = path.join(getAppDataDir(), PROJECTS_FILE);
    }
  }

  setBackupManager(bm: BackupManager): void {
    this.backupManager = bm;
  }

  getProjectsFilePath(): string {
    return this.projectsFilePath;
  }

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
      return [];
    }
  }

  private async saveProjectsToFile(projects: Project[]): Promise<void> {
    const dir = path.dirname(this.projectsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(this.projectsFilePath, JSON.stringify(projects, null, 2), 'utf-8');
  }

  private getDataInner(): StorageData {
    const data = this.context.globalState.get<StoredMetadata>(STORAGE_KEY);
    let projects = this.loadProjectsFromFile();

    const storedVersion = data?.dataVersion;
    if (storedVersion !== undefined && storedVersion < DATA_VERSION) {
      const migrated = runMigrations(
        {
          projects,
          tasks: data?.tasks || [],
          milestones: data?.milestones || [],
          changelog: data?.changelog || [],
          snapshots: data?.snapshots || [],
          notes: data?.notes || [],
          tags: data?.tags || [...DEFAULT_TAGS],
          settings: { ...DEFAULT_SETTINGS, ...(data?.settings || {}) },
        },
        storedVersion
      );
      projects = migrated.projects;
      this.context.globalState.update(STORAGE_KEY, {
        ...migrated,
        dataVersion: DATA_VERSION,
      });
    } else if (storedVersion === undefined) {
      this.context.globalState.update(STORAGE_KEY, {
        tasks: data?.tasks || [],
        milestones: data?.milestones || [],
        changelog: data?.changelog || [],
        snapshots: data?.snapshots || [],
        notes: data?.notes || [],
        tags: data?.tags || [...DEFAULT_TAGS],
        settings: { ...DEFAULT_SETTINGS, ...(data?.settings || {}) },
        dataVersion: DATA_VERSION,
      });
    }

    return {
      projects,
      tasks: data?.tasks || [],
      milestones: data?.milestones || [],
      changelog: data?.changelog || [],
      snapshots: data?.snapshots || [],
      notes: data?.notes || [],
      tags: data?.tags || [...DEFAULT_TAGS],
      settings: { ...DEFAULT_SETTINGS, ...(data?.settings || {}) },
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

  private async saveMetadata(data: StorageData): Promise<void> {
    this.cache = data;
    await this.context.globalState.update(STORAGE_KEY, {
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
    await this.saveMetadata(this.getData());
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
