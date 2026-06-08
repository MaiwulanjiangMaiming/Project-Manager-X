/**
 * Project Manager X
 * Copyright (c) 2026 Maiwulanjiang Maiming <mawlan.momin@gmail.com>
 * Licensed under GPL-3.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { Storage } from './storage';
import {
  Project,
  Task,
  TaskStatus,
  Settings,
  Tag,
  Milestone,
  ChangelogEntry,
  ContextSnapshot,
  Note,
  StorageData,
  inferLifecycle,
} from '../types';

export class ProjectManager {
  private context: vscode.ExtensionContext;
  private storage: Storage;

  constructor(context: vscode.ExtensionContext, storage?: Storage) {
    this.context = context;
    this.storage = storage || new Storage(context);
  }

  getProjects(): Project[] {
    return this.storage.getProjects();
  }

  getTasks(projectId?: string): Task[] {
    const tasks = this.storage.getTasks();
    if (projectId) {
      return tasks.filter((t) => t.projectId === projectId);
    }
    return tasks;
  }

  getTags(): Tag[] {
    return this.storage.getTags();
  }

  getSettings(): Settings {
    return this.storage.getSettings();
  }

  getProjectsFilePath(): string {
    return this.storage.getProjectsFilePath();
  }

  getMetadataFilePath(): string {
    return this.storage.getMetadataFilePath();
  }

  invalidateCache(): void {
    this.storage.invalidateCache();
  }

  /**
   * Force a re-read of projects.json from disk, retrying through the
   * brief partial-write window that happens when another IDE saves the
   * same file. Replaces the old `refreshProjects` placeholder that only
   * invalidated the cache and showed a toast. The caller is responsible
   * for pushing the result to the webview.
   */
  async forceReloadProjects(): Promise<Project[]> {
    return this.storage.forceReloadProjects();
  }

  /**
   * Force a re-read of metadata.json from disk (with retry). Used when
   * the file watcher detects an external change to tags/tasks/etc.
   */
  async forceReloadMetadata(): Promise<void> {
    return this.storage.forceReloadMetadata();
  }

  getStorage(): Storage {
    return this.storage;
  }

  getStorageData(): StorageData {
    return this.storage.getData();
  }

  async openProject(projectId: string, newWindow: boolean): Promise<void> {
    const project = this.getProjects().find((p) => p.id === projectId);
    if (!project) return;

    let uri: vscode.Uri;
    if (project.remote) {
      switch (project.remote.type) {
        case 'ssh':
          uri = vscode.Uri.parse(
            `vscode-remote://ssh-remote+${project.remote.host}${project.path}`
          );
          break;
        case 'docker':
          uri = vscode.Uri.parse(
            `vscode-remote://attached-container+${project.remote.container}${project.path}`
          );
          break;
        case 'wsl':
          uri = vscode.Uri.parse(`vscode-remote://wsl+${project.remote.host}${project.path}`);
          break;
        case 'devcontainer':
          uri = vscode.Uri.parse(
            `vscode-remote://dev-container+${project.remote.container}${project.path}`
          );
          break;
        case 'codespaces':
          uri = vscode.Uri.parse(
            `vscode-remote://codespaces+${project.remote.host}${project.path}`
          );
          break;
        default:
          uri = vscode.Uri.file(project.path);
      }
    } else if (['ssh', 'docker', 'wsl', 'devcontainer', 'codespaces'].includes(project.type)) {
      switch (project.type) {
        case 'ssh':
          uri = vscode.Uri.parse(`vscode-remote://ssh-remote+${project.path}`);
          break;
        case 'docker':
          uri = vscode.Uri.parse(`vscode-remote://attached-container+${project.path}`);
          break;
        case 'wsl':
          uri = vscode.Uri.parse(`vscode-remote://wsl+${project.path}`);
          break;
        case 'devcontainer':
          uri = vscode.Uri.parse(`vscode-remote://dev-container+${project.path}`);
          break;
        case 'codespaces':
          uri = vscode.Uri.parse(`vscode-remote://codespaces+${project.path}`);
          break;
        default:
          uri = vscode.Uri.file(project.path);
      }
    } else {
      uri = vscode.Uri.file(project.path);
    }

    if (newWindow) {
      await vscode.commands.executeCommand('vscode.openFolder', uri, true);
    } else {
      await vscode.commands.executeCommand('vscode.openFolder', uri, false);
    }

    project.lastOpened = Date.now();
    await this.updateProject(project);
  }

  async saveCurrentProject(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('No workspace folder open');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const name = path.basename(rootPath);

    const existing = this.getProjects();
    if (existing.some((p) => p.path === rootPath)) {
      vscode.window.showInformationMessage('Project already saved');
      return;
    }

    const project: Project = {
      id: `proj-${nanoid()}`,
      name,
      path: rootPath,
      tags: [],
      enabled: true,
      type: this.detectProjectType(rootPath),
      lifecycle: 'active',
      lastOpened: Date.now(),
    };

    const projects = [...existing, project];
    await this.storage.saveProjects(projects);
    return name;
  }

  async deleteProject(projectId: string): Promise<void> {
    // Use storage's bulk delete which filters all associated data in one pass
    await this.storage.deleteProject(projectId);
  }

  async updateProject(project: Project): Promise<void> {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index === -1) return;

    projects[index] = { ...projects[index], ...project };
    await this.storage.saveProjects(projects);
  }

  async reorderProjects(reorderedProjects: Project[]): Promise<void> {
    const allProjects = this.getProjects();
    const reorderedIds = new Set(reorderedProjects.map((p) => p.id));
    const untouched = allProjects.filter((p) => !reorderedIds.has(p.id));
    const finalProjects = [...reorderedProjects, ...untouched];
    await this.storage.saveProjects(finalProjects);
  }

  async moveProjectToTag(projectId: string, tagId: string): Promise<void> {
    const project = this.getProjects().find((p) => p.id === projectId);
    if (!project) return;
    if (!project.tags.includes(tagId)) {
      project.tags.push(tagId);
      await this.updateProject(project);
    }
  }

  async removeProjectFromTag(projectId: string, tagId: string): Promise<void> {
    const project = this.getProjects().find((p) => p.id === projectId);
    if (!project) return;
    project.tags = project.tags.filter((t) => t !== tagId);
    await this.updateProject(project);
  }

  async addTag(name: string, color: string): Promise<void> {
    const tag: Tag = {
      id: `tag-${nanoid()}`,
      name,
      color,
      order: this.getTags().length,
    };
    await this.storage.addTag(tag);
  }

  async updateTag(tag: Tag): Promise<void> {
    await this.storage.updateTag(tag);
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.storage.deleteTag(tagId);

    const projects = this.getProjects();
    for (const project of projects) {
      if (project.tags.includes(tagId)) {
        project.tags = project.tags.filter((t) => t !== tagId);
        await this.updateProject(project);
      }
    }
  }

  async reorderTags(tags: Tag[]): Promise<void> {
    await this.storage.saveTags(tags);
  }

  async showInFolder(projectId: string): Promise<void> {
    const project = this.getProjects().find((p) => p.id === projectId);
    if (!project) return;
    await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(project.path));
  }

  async addToWorkspace(projectId: string): Promise<void> {
    const project = this.getProjects().find((p) => p.id === projectId);
    if (!project) return;
    await vscode.workspace.updateWorkspaceFolders(
      vscode.workspace.workspaceFolders?.length || 0,
      0,
      { uri: vscode.Uri.file(project.path), name: project.name }
    );
  }

  async editProjectsFile(): Promise<void> {
    const filePath = this.getProjectsFilePath();
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  }

  async createTask(projectId: string, task: Partial<Task>): Promise<void>;
  async createTask(projectId: string, title: string, category: any, priority: any): Promise<void>;
  async createTask(
    projectId: string,
    titleOrTask: string | Partial<Task>,
    category?: any,
    priority?: any
  ): Promise<void> {
    if (typeof titleOrTask === 'string') {
      const newTask: Task = {
        id: `task-${nanoid()}`,
        projectId,
        title: titleOrTask,
        description: '',
        status: 'backlog',
        priority: priority || 'medium',
        category: category || 'feature',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.storage.addTask(newTask);
    } else {
      const newTask: Task = {
        id: `task-${nanoid()}`,
        projectId,
        title: titleOrTask.title || 'New Task',
        description: titleOrTask.description || '',
        status: titleOrTask.status || 'backlog',
        priority: titleOrTask.priority || 'medium',
        category: titleOrTask.category || 'feature',
        tags: titleOrTask.tags || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.storage.addTask(newTask);
    }
  }

  async updateTask(task: Task): Promise<void> {
    task.updatedAt = Date.now();
    await this.storage.updateTask(task);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.storage.deleteTask(taskId);
  }

  async createMilestone(milestone: Milestone): Promise<void>;
  async createMilestone(projectId: string, title: string, description: string): Promise<void>;
  async createMilestone(
    milestoneOrProjectId: Milestone | string,
    title?: string,
    description?: string
  ): Promise<void> {
    if (typeof milestoneOrProjectId === 'string') {
      const milestone: Milestone = {
        id: `milestone-${nanoid()}`,
        projectId: milestoneOrProjectId,
        title: title || '',
        description: description || '',
        taskIds: [],
        completedTasks: 0,
        totalTasks: 0,
        progress: 0,
        status: 'upcoming',
        createdAt: Date.now(),
      };
      await this.storage.addMilestone(milestone);
    } else {
      await this.storage.addMilestone(milestoneOrProjectId);
    }
  }

  async updateMilestone(milestone: Milestone): Promise<void> {
    await this.storage.updateMilestone(milestone);
  }

  async deleteMilestone(milestoneId: string): Promise<void> {
    await this.storage.deleteMilestone(milestoneId);
  }

  async addChangelogEntry(entry: ChangelogEntry): Promise<void> {
    await this.storage.addChangelogEntry(entry);
  }

  async createChangelog(projectId: string, version: string, changes: string): Promise<void> {
    const entry: ChangelogEntry = {
      id: `changelog-${nanoid()}`,
      projectId,
      version,
      date: Date.now(),
      added: changes ? [changes] : [],
      visibility: 'private',
    };
    await this.storage.addChangelogEntry(entry);
  }

  async updateChangelog(changelog: ChangelogEntry): Promise<void> {
    await this.storage.updateChangelogEntry(changelog);
  }

  async deleteChangelog(changelogId: string): Promise<void> {
    await this.storage.deleteChangelogEntry(changelogId);
  }

  async createNote(projectId: string, title: string, content: string): Promise<void> {
    const note: Note = {
      id: `note-${nanoid()}`,
      projectId,
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
    };
    await this.storage.addNote(note);
  }

  async updateNote(note: Note): Promise<void> {
    await this.storage.updateNote(note);
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.storage.deleteNote(noteId);
  }

  async saveContextSnapshot(snapshot: ContextSnapshot): Promise<void> {
    await this.storage.addSnapshot(snapshot);
  }

  async saveSnapshot(projectId: string, snapshot: ContextSnapshot): Promise<void> {
    snapshot.projectId = projectId;
    await this.storage.addSnapshot(snapshot);
  }

  private latestSnapshotCache = new Map<string, { snapshot: ContextSnapshot; timestamp: number }>();
  private static SNAPSHOT_CACHE_TTL = 5000; // 5 seconds

  getLatestSnapshot(projectId: string): ContextSnapshot | undefined {
    const cached = this.latestSnapshotCache.get(projectId);
    if (cached && Date.now() - cached.timestamp < ProjectManager.SNAPSHOT_CACHE_TTL) {
      return cached.snapshot;
    }

    const snapshots = this.storage.getSnapshots().filter((s) => s.projectId === projectId);
    if (snapshots.length === 0) {
      this.latestSnapshotCache.delete(projectId);
      return undefined;
    }
    const latest = snapshots.sort((a, b) => b.timestamp - a.timestamp)[0];
    this.latestSnapshotCache.set(projectId, { snapshot: latest, timestamp: Date.now() });
    return latest;
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const current = this.getSettings();
    await this.storage.saveSettings({ ...current, ...settings });
  }

  async batchDeleteTasks(taskIds: string[]): Promise<void> {
    const idSet = new Set(taskIds);
    const tasks = this.storage.getTasks().filter((t) => !idSet.has(t.id));
    await this.storage.saveTasks(tasks);
  }

  async batchUpdateTaskStatus(taskIds: string[], status: TaskStatus): Promise<void> {
    const idSet = new Set(taskIds);
    const tasks = this.storage
      .getTasks()
      .map((t) => (idSet.has(t.id) ? { ...t, status, updatedAt: Date.now() } : t));
    await this.storage.saveTasks(tasks);
  }

  async batchDeleteProjects(projectIds: string[]): Promise<void> {
    const idSet = new Set(projectIds);
    const data = this.storage.getData();
    data.projects = data.projects.filter((p) => !idSet.has(p.id));
    data.tasks = data.tasks.filter((t) => !idSet.has(t.projectId));
    data.milestones = data.milestones.filter((m) => !idSet.has(m.projectId));
    data.changelog = data.changelog.filter((c) => !idSet.has(c.projectId));
    data.snapshots = data.snapshots.filter((s) => !idSet.has(s.projectId));
    data.notes = data.notes.filter((n) => !idSet.has(n.projectId));
    await this.storage.saveData(data);
  }

  async restoreProject(
    project: Project,
    tasks: Task[],
    milestones?: Milestone[],
    changelog?: ChangelogEntry[],
    snapshots?: ContextSnapshot[],
    notes?: Note[]
  ): Promise<void> {
    const projects = this.getProjects();
    if (!projects.some((p) => p.id === project.id)) {
      projects.push(project);
      await this.storage.saveProjects(projects);
    }
    for (const task of tasks) {
      const existing = this.getTasks().find((t) => t.id === task.id);
      if (!existing) {
        await this.storage.addTask(task);
      }
    }
    if (milestones) {
      const existingMilestones = this.storage.getMilestones();
      const newMilestones = milestones.filter(
        (m) => !existingMilestones.some((e) => e.id === m.id)
      );
      if (newMilestones.length > 0) {
        await this.storage.saveMilestones([...existingMilestones, ...newMilestones]);
      }
    }
    if (changelog) {
      const existingChangelog = this.storage.getChangelog();
      const newChangelog = changelog.filter((c) => !existingChangelog.some((e) => e.id === c.id));
      if (newChangelog.length > 0) {
        await this.storage.saveChangelog([...existingChangelog, ...newChangelog]);
      }
    }
    if (snapshots) {
      const existingSnapshots = this.storage.getSnapshots();
      const newSnapshots = snapshots.filter((s) => !existingSnapshots.some((e) => e.id === s.id));
      if (newSnapshots.length > 0) {
        await this.storage.saveSnapshots([...existingSnapshots, ...newSnapshots]);
      }
    }
    if (notes) {
      const existingNotes = this.storage.getNotes();
      const newNotes = notes.filter((n) => !existingNotes.some((e) => e.id === n.id));
      if (newNotes.length > 0) {
        await this.storage.saveNotes([...existingNotes, ...newNotes]);
      }
    }
  }

  private detectProjectType(rootPath: string): Project['type'] {
    if (fs.existsSync(path.join(rootPath, '.git'))) return 'git';
    if (fs.existsSync(path.join(rootPath, '.hg'))) return 'mercurial';
    if (fs.existsSync(path.join(rootPath, '.svn'))) return 'svn';
    if (fs.existsSync(path.join(rootPath, '.vscode'))) return 'vscode';
    if (fs.existsSync(path.join(rootPath, 'package.json'))) return 'node';
    if (fs.existsSync(path.join(rootPath, 'Cargo.toml'))) return 'rust';
    if (fs.existsSync(path.join(rootPath, 'go.mod'))) return 'go';
    if (
      fs.existsSync(path.join(rootPath, 'requirements.txt')) ||
      fs.existsSync(path.join(rootPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(rootPath, 'setup.py'))
    )
      return 'python';
    if (
      fs.existsSync(path.join(rootPath, 'pom.xml')) ||
      fs.existsSync(path.join(rootPath, 'build.gradle')) ||
      fs.existsSync(path.join(rootPath, 'build.gradle.kts'))
    )
      return 'java';
    return 'any';
  }

  private getSuggestedFolders(): string[] {
    const home = os.homedir();
    const suggestions: string[] = [];

    const commonFolders = [
      'Projects',
      'projects',
      'Workspace',
      'workspace',
      'Code',
      'code',
      'Dev',
      'dev',
      'Development',
      'development',
      'GitHub',
      'github',
      'GitLab',
      'gitlab',
      'Source',
      'source',
      'Repos',
      'repos',
      'Repositories',
    ];

    for (const folder of commonFolders) {
      const fullPath = path.join(home, folder);
      if (fs.existsSync(fullPath)) {
        suggestions.push(fullPath);
      }
    }

    return suggestions;
  }

  private async findGitRepos(
    dir: string,
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<Project[]> {
    if (currentDepth >= maxDepth) return [];

    if (fs.existsSync(path.join(dir, '.git'))) {
      const name = path.basename(dir);
      return [
        {
          id: `git-${nanoid()}`,
          name,
          path: dir,
          tags: [],
          enabled: true,
          type: 'git',
          lifecycle: inferLifecycle(Date.now()),
        },
      ];
    }

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const subDirs: string[] = [];
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'vendor' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          entry.name !== 'out' &&
          entry.name !== '__pycache__'
        ) {
          subDirs.push(path.join(dir, entry.name));
        }
      }
      const results = await Promise.all(
        subDirs.map((subDir) => this.findGitRepos(subDir, maxDepth, currentDepth + 1))
      );
      return results.flat();
    } catch {
      return [];
    }
  }

  private async findVSCodeWorkspaces(
    dir: string,
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<Project[]> {
    if (currentDepth >= maxDepth) return [];

    const projects: Project[] = [];

    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.code-workspace')) {
          const workspacePath = path.join(dir, entry.name);
          const name = entry.name.replace('.code-workspace', '');
          projects.push({
            id: `vscode-${nanoid()}`,
            name,
            path: workspacePath,
            tags: [],
            enabled: true,
            type: 'vscode',
            lifecycle: inferLifecycle(Date.now()),
          });
        } else if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules'
        ) {
          const subDir = path.join(dir, entry.name);
          const subProjects = await this.findVSCodeWorkspaces(subDir, maxDepth, currentDepth + 1);
          projects.push(...subProjects);
        }
      }
    } catch {
      /* ignore */
    }

    return projects;
  }

  async autoDetectProjects(): Promise<Project[]> {
    const settings = this.getSettings();
    const detected: Project[] = [];
    const detectedPaths = new Set<string>();

    let foldersToScan: string[];

    if (settings.gitBaseFolders.length > 0) {
      foldersToScan = settings.gitBaseFolders.map((f) => f.replace(/^~/, os.homedir()));
    } else {
      foldersToScan = this.getSuggestedFolders();
    }

    if (foldersToScan.length === 0) {
      const home = os.homedir();
      try {
        const entries = await fs.promises.readdir(home, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const fullPath = path.join(home, entry.name);
            foldersToScan.push(fullPath);
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (settings.autoDetectGit) {
      for (const folder of foldersToScan) {
        if (fs.existsSync(folder)) {
          const gitProjects = await this.findGitRepos(folder, settings.gitMaxDepth);
          for (const project of gitProjects) {
            if (!detectedPaths.has(project.path)) {
              detectedPaths.add(project.path);
              detected.push(project);
            }
          }
        }
      }
    }

    if (settings.autoDetectVSCode) {
      for (const folder of foldersToScan) {
        if (fs.existsSync(folder)) {
          const vscodeProjects = await this.findVSCodeWorkspaces(folder, 2);
          for (const project of vscodeProjects) {
            if (!detectedPaths.has(project.path)) {
              detectedPaths.add(project.path);
              detected.push(project);
            }
          }
        }
      }
    }

    return detected;
  }

  async refreshProjects(): Promise<void> {
    // Real reload: force a disk read with retry for both projects and
    // metadata, so a partial-write window doesn't surface an empty list.
    // The caller (extension.ts handler) pushes the result to the webview
    // after this returns.
    await Promise.all([this.storage.forceReloadProjects(), this.storage.forceReloadMetadata()]);
  }

  async addDetectFolder(): Promise<void> {
    const home = os.homedir();
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: vscode.Uri.file(home),
      openLabel: 'Select Folder to Scan',
    });

    if (!result || result.length === 0) return;

    const folderPath = result[0].fsPath;

    const detected = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Scanning ${path.basename(folderPath)}...`,
        cancellable: false,
      },
      async () => {
        return this.findGitRepos(folderPath, 3);
      }
    );

    if (detected.length === 0) {
      vscode.window.showInformationMessage('No Git repositories found in selected folder');
      return;
    }

    const existing = this.getProjects();
    const newDetected = detected.filter((d) => !existing.some((e) => e.path === d.path));

    if (newDetected.length === 0) {
      vscode.window.showInformationMessage('All detected projects are already saved');
      return;
    }

    const items = newDetected.map((p) => ({
      label: `$(repo) ${p.name}`,
      description: p.path,
      picked: true,
      project: p,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      placeHolder: `Select projects to add (${newDetected.length} found)`,
    });

    if (!selected || selected.length === 0) return;

    const projectsToAdd = selected.map((s) => s.project);
    const allProjects = [...existing, ...projectsToAdd];
    await this.storage.saveProjects(allProjects);

    vscode.window.showInformationMessage(
      `Added ${projectsToAdd.length} project${projectsToAdd.length !== 1 ? 's' : ''}`
    );
  }

  private getIDEPaths(): { name: string; paths: string[] }[] {
    const home = os.homedir();
    const platform = os.platform();

    if (platform === 'darwin') {
      return [
        {
          name: 'VS Code',
          paths: [
            path.join(
              home,
              'Library',
              'Application Support',
              'Code',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'VS Code Insiders',
          paths: [
            path.join(
              home,
              'Library',
              'Application Support',
              'Code - Insiders',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'Trae',
          paths: [
            path.join(
              home,
              'Library',
              'Application Support',
              'Trae',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
            path.join(
              home,
              'Library',
              'Application Support',
              'Trae CN',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'Cursor',
          paths: [
            path.join(
              home,
              'Library',
              'Application Support',
              'Cursor',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'Windsurf',
          paths: [
            path.join(
              home,
              'Library',
              'Application Support',
              'Windsurf',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
      ];
    } else if (platform === 'win32') {
      return [
        {
          name: 'VS Code',
          paths: [
            path.join(
              home,
              'AppData',
              'Roaming',
              'Code',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'VS Code Insiders',
          paths: [
            path.join(
              home,
              'AppData',
              'Roaming',
              'Code - Insiders',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'Trae',
          paths: [
            path.join(
              home,
              'AppData',
              'Roaming',
              'Trae',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
            path.join(
              home,
              'AppData',
              'Roaming',
              'Trae CN',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
      ];
    } else {
      return [
        {
          name: 'VS Code',
          paths: [
            path.join(
              home,
              '.config',
              'Code',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'VS Code Insiders',
          paths: [
            path.join(
              home,
              '.config',
              'Code - Insiders',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
        {
          name: 'Trae',
          paths: [
            path.join(
              home,
              '.config',
              'Trae',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
            path.join(
              home,
              '.config',
              'Trae CN',
              'User',
              'globalStorage',
              'alefragnani.project-manager'
            ),
          ],
        },
      ];
    }
  }

  async importFromProjectManager(): Promise<void> {
    const idePaths = this.getIDEPaths();
    const foundSources: { name: string; path: string }[] = [];

    for (const ide of idePaths) {
      for (const dir of ide.paths) {
        const projectsJsonPath = path.join(dir, 'projects.json');
        if (fs.existsSync(projectsJsonPath)) {
          foundSources.push({ name: ide.name, path: projectsJsonPath });
        }
      }
    }

    let foundPath: string | undefined;
    let sourceName: string | undefined;

    if (foundSources.length === 1) {
      foundPath = foundSources[0].path;
      sourceName = foundSources[0].name;
    } else if (foundSources.length > 1) {
      const picked = await vscode.window.showQuickPick(
        foundSources.map((s) => ({ label: s.name, description: s.path, path: s.path })),
        { placeHolder: 'Select IDE to import from' }
      );
      if (picked) {
        foundPath = picked.path;
        sourceName = picked.label;
      }
    }

    if (!foundPath) {
      const home = os.homedir();
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: vscode.Uri.file(home),
        filters: { JSON: ['json'] },
        openLabel: 'Select projects.json',
      });

      if (result && result.length > 0) {
        foundPath = result[0].fsPath;
        sourceName = 'Custom';
      }
    }

    if (!foundPath) {
      vscode.window.showWarningMessage('Could not find Project Manager data file');
      return;
    }

    try {
      const content = await fs.promises.readFile(foundPath, 'utf8');
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        vscode.window.showErrorMessage('Invalid Project Manager data format');
        return;
      }

      const existing = this.getProjects();
      const candidates: Project[] = [];
      let skippedCount = 0;

      const ImportedItemSchema = z.object({
        name: z.string().min(1),
        rootPath: z.string().min(1),
        enabled: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        groupName: z.string().optional(),
        lastOpened: z.number().optional(),
      });

      for (const item of data) {
        const parsed = ImportedItemSchema.safeParse(item);
        if (!parsed.success) {
          skippedCount++;
          continue;
        }

        let projectPath = parsed.data.rootPath
          .replace(/^~/, os.homedir())
          .replace(/^\$home/, os.homedir());
        if (existing.some((e) => e.path === projectPath)) continue;

        let projectType: Project['type'] = 'any';
        let remoteInfo: Project['remote'] = undefined;

        if (parsed.data.groupName === 'Favorites') {
          projectType = 'git';
        }

        if (projectPath.startsWith('vscode-remote://')) {
          const remoteMatch = projectPath.match(/^vscode-remote:\/\/([^+]+)\+(.+)$/);
          if (remoteMatch) {
            const remoteScheme = remoteMatch[1];
            const remotePath = remoteMatch[2];
            let remoteType: NonNullable<Project['remote']>['type'] = 'ssh';
            let host: string | undefined = undefined;
            let container: string | undefined = undefined;
            let fsPath = projectPath;

            switch (remoteScheme) {
              case 'ssh-remote': {
                remoteType = 'ssh';
                const firstSlash = remotePath.indexOf('/');
                if (firstSlash > 0) {
                  host = remotePath.substring(0, firstSlash);
                  fsPath = remotePath.substring(firstSlash);
                } else {
                  host = remotePath;
                  fsPath = '/';
                }
                break;
              }
              case 'attached-container': {
                remoteType = 'docker';
                const firstSlash = remotePath.indexOf('/');
                if (firstSlash > 0) {
                  container = remotePath.substring(0, firstSlash);
                  fsPath = remotePath.substring(firstSlash);
                } else {
                  container = remotePath;
                  fsPath = '/';
                }
                break;
              }
              case 'wsl': {
                remoteType = 'wsl';
                const firstSlash = remotePath.indexOf('/');
                if (firstSlash > 0) {
                  host = remotePath.substring(0, firstSlash);
                  fsPath = remotePath.substring(firstSlash);
                } else {
                  host = remotePath;
                  fsPath = '/';
                }
                break;
              }
              case 'dev-container': {
                remoteType = 'devcontainer';
                const firstSlash = remotePath.indexOf('/');
                if (firstSlash > 0) {
                  container = remotePath.substring(0, firstSlash);
                  fsPath = remotePath.substring(firstSlash);
                } else {
                  container = remotePath;
                  fsPath = '/';
                }
                break;
              }
              case 'codespaces': {
                remoteType = 'codespaces';
                const firstSlash = remotePath.indexOf('/');
                if (firstSlash > 0) {
                  host = remotePath.substring(0, firstSlash);
                  fsPath = remotePath.substring(firstSlash);
                } else {
                  host = remotePath;
                  fsPath = '/';
                }
                break;
              }
            }

            remoteInfo = { type: remoteType, host, container };
            projectType = remoteType;
            projectPath = fsPath;
          }
        } else if (fs.existsSync(path.join(projectPath, '.git'))) {
          projectType = 'git';
        }

        const project: Project = {
          id: `imported-${nanoid()}`,
          name: parsed.data.name,
          path: projectPath,
          tags: [],
          enabled: parsed.data.enabled !== false,
          type: projectType,
          remote: remoteInfo,
          lifecycle: inferLifecycle(Date.now()),
          lastOpened: parsed.data.lastOpened,
        };

        if (parsed.data.tags && Array.isArray(parsed.data.tags) && parsed.data.tags.length > 0) {
          const currentTags = this.getTags();
          for (const tagName of parsed.data.tags) {
            let tag = currentTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
            if (!tag) {
              tag = {
                id: `tag-${nanoid()}`,
                name: tagName,
                color: this.getRandomColor(),
                order: currentTags.length,
              };
              await this.storage.addTag(tag);
            }
            project.tags.push(tag.id);
          }
        }

        candidates.push(project);
      }

      if (candidates.length === 0) {
        vscode.window.showInformationMessage('No new projects to import');
        return;
      }

      const items = candidates.map((p) => ({
        label: `$(repo) ${p.name}`,
        description: p.path,
        picked: true,
        project: p,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: `Select projects to import from ${sourceName} (${candidates.length} found)`,
      });

      if (!selected || selected.length === 0) return;

      const imported = selected.map((s) => s.project);
      const allProjects = [...existing, ...imported];
      await this.storage.saveProjects(allProjects);
      let msg = `Imported ${imported.length} project${imported.length !== 1 ? 's' : ''} from ${sourceName}`;
      if (skippedCount > 0) {
        msg += ` (${skippedCount} skipped due to invalid data)`;
      }
      vscode.window.showInformationMessage(msg);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import: ${error}`);
    }
  }

  private getRandomColor(): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#FFE66D',
      '#95E1D3',
      '#F38181',
      '#AA96DA',
      '#FCBAD3',
      '#A8D8EA',
      '#96CEB4',
      '#FECA57',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
