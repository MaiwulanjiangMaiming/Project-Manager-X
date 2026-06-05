import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ProjectManager } from '../core/projectManager';
import { Storage } from '../core/storage';
import { Project, Task, Tag, Settings, ContextSnapshot } from '../types';

function createMockStorage(): Storage {
  let projects: Project[] = [];
  let tasks: Task[] = [];
  let tags: Tag[] = [];
  let settings: Settings = {
    sortBy: 'recent',
    groupByTag: true,
    showPath: true,
    autoDetectGit: true,
    autoDetectVSCode: true,
    gitBaseFolders: [],
    gitMaxDepth: 4,
    cardDensity: 'normal',
    showTaskCount: true,
    showProgressBar: true,
  };
  let snapshots: ContextSnapshot[] = [];

  const storage = {
    getProjects: vi.fn(() => projects),
    saveProjects: vi.fn(async (newProjects: Project[]) => {
      projects = newProjects;
    }),
    getTasks: vi.fn(() => tasks),
    addTask: vi.fn(async (task: Task) => {
      tasks.push(task);
    }),
    updateTask: vi.fn(async (task: Task) => {
      const index = tasks.findIndex((t) => t.id === task.id);
      if (index !== -1) tasks[index] = task;
    }),
    deleteTask: vi.fn(async (id: string) => {
      tasks = tasks.filter((t) => t.id !== id);
    }),
    getTags: vi.fn(() => tags),
    addTag: vi.fn(async (tag: Tag) => {
      tags.push(tag);
    }),
    updateTag: vi.fn(async (tag: Tag) => {
      const index = tags.findIndex((t) => t.id === tag.id);
      if (index !== -1) tags[index] = tag;
    }),
    deleteTag: vi.fn(async (id: string) => {
      tags = tags.filter((t) => t.id !== id);
      projects = projects.map((p) => ({
        ...p,
        tags: p.tags.filter((t) => t !== id),
      }));
    }),
    saveTags: vi.fn(async (newTags: Tag[]) => {
      tags = newTags;
    }),
    getSettings: vi.fn(() => settings),
    saveSettings: vi.fn(async (newSettings: Settings) => {
      settings = newSettings;
    }),
    getSnapshots: vi.fn(() => snapshots),
    saveSnapshots: vi.fn(async (newSnapshots: ContextSnapshot[]) => {
      snapshots = newSnapshots;
    }),
    addSnapshot: vi.fn(async (snapshot: ContextSnapshot) => {
      snapshots.push(snapshot);
    }),
    getProjectsFilePath: vi.fn(() => '/mock/projects.json'),
    getMetadataFilePath: vi.fn(() => '/mock/metadata.json'),
    invalidateCache: vi.fn(),
    forceReloadProjects: vi.fn(async () => projects),
    forceReloadMetadata: vi.fn(async () => {}),
    getData: vi.fn(() => ({
      projects,
      tasks,
      tags,
      settings,
      snapshots,
      milestones: [],
      changelog: [],
      notes: [],
    })),
    saveData: vi.fn(),
    getMilestones: vi.fn(() => []),
    saveMilestones: vi.fn(),
    getChangelog: vi.fn(() => []),
    saveChangelog: vi.fn(),
    getNotes: vi.fn(() => []),
    saveNotes: vi.fn(),
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    saveTasks: vi.fn(),
    addMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    addChangelogEntry: vi.fn(),
    updateChangelogEntry: vi.fn(),
    deleteChangelogEntry: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    setBackupManager: vi.fn(),
  } as unknown as Storage;

  return storage;
}

function createMockContext(): vscode.ExtensionContext {
  return {
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn(() => []),
    },
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn(() => []),
    },
    subscriptions: [],
    extensionPath: '/mock/extension',
    extensionUri: { fsPath: '/mock/extension', scheme: 'file' } as vscode.Uri,
    environmentVariableCollection: {} as any,
    storageUri: { fsPath: '/mock/storage', scheme: 'file' } as vscode.Uri,
    globalStorageUri: { fsPath: '/mock/globalStorage', scheme: 'file' } as vscode.Uri,
    logUri: { fsPath: '/mock/log', scheme: 'file' } as vscode.Uri,
    extensionMode: 1,
    asAbsolutePath: vi.fn((p: string) => `/mock/extension/${p}`),
    secrets: {
      get: vi.fn(),
      store: vi.fn(),
      delete: vi.fn(),
    },
    logger: {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
    },
  } as unknown as vscode.ExtensionContext;
}

describe('ProjectManager', () => {
  let manager: ProjectManager;
  let mockStorage: Storage;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
    mockStorage = createMockStorage();
    manager = new ProjectManager(mockContext, mockStorage);
  });

  describe('getProjects', () => {
    it('should return project list', () => {
      const projects: Project[] = [
        {
          id: 'proj-1',
          name: 'Project 1',
          path: '/home/user/project1',
          tags: [],
          enabled: true,
          type: 'git',
          lifecycle: 'active',
        },
        {
          id: 'proj-2',
          name: 'Project 2',
          path: '/home/user/project2',
          tags: [],
          enabled: true,
          type: 'any',
          lifecycle: 'planning',
        },
      ];
      mockStorage.saveProjects(projects);
      expect(manager.getProjects()).toHaveLength(2);
      expect(manager.getProjects()[0].name).toBe('Project 1');
    });
  });

  describe('openProject', () => {
    it('should build file:// URI for local project', async () => {
      const project: Project = {
        id: 'proj-local',
        name: 'Local Project',
        path: '/home/user/local-project',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      await mockStorage.saveProjects([project]);

      await manager.openProject('proj-local', false);

      expect(vscode.Uri.file).toHaveBeenCalledWith('/home/user/local-project');
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openFolder',
        expect.anything(),
        false
      );
    });

    it('should build vscode-remote:// URI for SSH remote project', async () => {
      const project: Project = {
        id: 'proj-ssh',
        name: 'SSH Project',
        path: '/home/remote/project',
        tags: [],
        enabled: true,
        type: 'ssh',
        lifecycle: 'active',
        remote: {
          type: 'ssh',
          host: 'my-server',
        },
      };
      await mockStorage.saveProjects([project]);

      await manager.openProject('proj-ssh', true);

      expect(vscode.Uri.parse).toHaveBeenCalledWith(
        'vscode-remote://ssh-remote+my-server/home/remote/project'
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openFolder',
        expect.anything(),
        true
      );
    });
  });

  describe('forceReloadProjects', () => {
    it('should delegate to storage and return the reloaded list', async () => {
      const reloaded: Project[] = [
        {
          id: 'p1',
          name: 'Reloaded',
          path: '/p1',
          tags: [],
          enabled: true,
          lastOpened: 0,
          type: 'any',
          lifecycle: 'active',
        },
      ];
      (mockStorage.forceReloadProjects as any).mockResolvedValueOnce(reloaded);

      const result = await manager.forceReloadProjects();

      expect(mockStorage.forceReloadProjects).toHaveBeenCalledTimes(1);
      expect(result).toEqual(reloaded);
    });

    it('refreshProjects should also force a disk reload (not just toast)', async () => {
      (mockStorage.forceReloadProjects as any).mockClear();
      await manager.refreshProjects();
      expect(mockStorage.forceReloadProjects).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveCurrentProject', () => {
    it('should save current workspace as project', async () => {
      (vscode.workspace as any).workspaceFolders = [
        {
          uri: { fsPath: '/home/user/my-project' },
          name: 'my-project',
          index: 0,
        },
      ];

      const result = await manager.saveCurrentProject();

      expect(mockStorage.saveProjects).toHaveBeenCalled();
      const savedProjects = (mockStorage.saveProjects as any).mock.calls[0][0];
      expect(savedProjects).toHaveLength(1);
      expect(savedProjects[0].name).toBe('my-project');
      expect(savedProjects[0].path).toBe('/home/user/my-project');
      expect(result).toBe('my-project');
    });

    it('should warn when no workspace is open', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const result = await manager.saveCurrentProject();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No workspace folder open');
      expect(mockStorage.saveProjects).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should inform when project already saved', async () => {
      const existing: Project = {
        id: 'proj-existing',
        name: 'existing',
        path: '/home/user/existing',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      await mockStorage.saveProjects([existing]);
      (vscode.workspace as any).workspaceFolders = [
        {
          uri: { fsPath: '/home/user/existing' },
          name: 'existing',
          index: 0,
        },
      ];

      const result = await manager.saveCurrentProject();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Project already saved');
      expect(result).toBeUndefined();
    });
  });

  describe('deleteProject', () => {
    it('should delete project and its tasks', async () => {
      const project: Project = {
        id: 'proj-del',
        name: 'Delete Me',
        path: '/home/user/del',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      const task: Task = {
        id: 'task-1',
        projectId: 'proj-del',
        title: 'Task to delete',
        category: 'feature',
        priority: 'medium',
        status: 'backlog',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
      };
      await mockStorage.saveProjects([project]);
      await mockStorage.addTask(task);

      await manager.deleteProject('proj-del');

      expect(manager.getProjects()).toHaveLength(0);
      expect(manager.getTasks()).toHaveLength(0);
    });
  });

  describe('reorderProjects', () => {
    it('should reorder projects', async () => {
      const p1: Project = {
        id: 'proj-a',
        name: 'A',
        path: '/a',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      const p2: Project = {
        id: 'proj-b',
        name: 'B',
        path: '/b',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      const p3: Project = {
        id: 'proj-c',
        name: 'C',
        path: '/c',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      await mockStorage.saveProjects([p1, p2, p3]);

      await manager.reorderProjects([p3, p1]);

      const result = manager.getProjects();
      expect(result.map((p) => p.id)).toEqual(['proj-c', 'proj-a', 'proj-b']);
    });
  });

  describe('addTag / deleteTag', () => {
    it('should add a tag', async () => {
      await manager.addTag('New Tag', '#FF0000');

      expect(manager.getTags()).toHaveLength(1);
      expect(manager.getTags()[0].name).toBe('New Tag');
    });

    it('should delete a tag and remove it from projects', async () => {
      const tag: Tag = { id: 'tag-1', name: 'Work', color: '#FF6B6B', order: 0 };
      await mockStorage.addTag(tag);
      const project: Project = {
        id: 'proj-tagged',
        name: 'Tagged',
        path: '/tagged',
        tags: ['tag-1'],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      await mockStorage.saveProjects([project]);

      await manager.deleteTag('tag-1');

      expect(manager.getTags()).toHaveLength(0);
      expect(manager.getProjects()[0].tags).toHaveLength(0);
    });
  });

  describe('createTask / updateTask / deleteTask', () => {
    it('should create a task with string signature', async () => {
      await manager.createTask('proj-1', 'My Task', 'bug', 'high');

      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('My Task');
      expect(tasks[0].category).toBe('bug');
      expect(tasks[0].priority).toBe('high');
    });

    it('should create a task with object signature', async () => {
      await manager.createTask('proj-1', { title: 'Obj Task', status: 'in_progress' });

      const tasks = manager.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Obj Task');
      expect(tasks[0].status).toBe('in_progress');
    });

    it('should update a task', async () => {
      const task: Task = {
        id: 'task-up',
        projectId: 'proj-1',
        title: 'Old Title',
        category: 'feature',
        priority: 'medium',
        status: 'backlog',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
      };
      await mockStorage.addTask(task);

      task.title = 'New Title';
      await manager.updateTask(task);

      expect(manager.getTasks()[0].title).toBe('New Title');
      expect(manager.getTasks()[0].updatedAt).toBeGreaterThanOrEqual(task.createdAt);
    });

    it('should delete a task', async () => {
      const task: Task = {
        id: 'task-del',
        projectId: 'proj-1',
        title: 'Delete Me',
        category: 'feature',
        priority: 'medium',
        status: 'backlog',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [],
      };
      await mockStorage.addTask(task);

      await manager.deleteTask('task-del');

      expect(manager.getTasks()).toHaveLength(0);
    });
  });

  describe('batchDeleteProjects', () => {
    it('should delete multiple projects', async () => {
      const p1: Project = {
        id: 'proj-1',
        name: 'P1',
        path: '/p1',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      const p2: Project = {
        id: 'proj-2',
        name: 'P2',
        path: '/p2',
        tags: [],
        enabled: true,
        type: 'git',
        lifecycle: 'active',
      };
      await mockStorage.saveProjects([p1, p2]);

      await manager.batchDeleteProjects(['proj-1', 'proj-2']);

      expect(manager.getProjects()).toHaveLength(0);
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      await manager.updateSettings({ sortBy: 'name', showPath: false });

      const settings = manager.getSettings();
      expect(settings.sortBy).toBe('name');
      expect(settings.showPath).toBe(false);
      expect(settings.groupByTag).toBe(true);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return the latest snapshot for a project', () => {
      const snapshots: ContextSnapshot[] = [
        {
          id: 'snap-1',
          projectId: 'proj-1',
          timestamp: 1000,
          activeFile: 'old.ts',
        },
        {
          id: 'snap-2',
          projectId: 'proj-1',
          timestamp: 3000,
          activeFile: 'newest.ts',
        },
        {
          id: 'snap-3',
          projectId: 'proj-1',
          timestamp: 2000,
          activeFile: 'middle.ts',
        },
      ];
      snapshots.forEach((s) => mockStorage.addSnapshot(s));

      const latest = manager.getLatestSnapshot('proj-1');
      expect(latest).toBeDefined();
      expect(latest!.id).toBe('snap-2');
      expect(latest!.activeFile).toBe('newest.ts');
    });

    it('should return undefined when no snapshots exist', () => {
      const latest = manager.getLatestSnapshot('proj-none');
      expect(latest).toBeUndefined();
    });
  });
});
