import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { Storage } from '../core/storage';
import {
  Project,
  Task,
  Milestone,
  ChangelogEntry,
  ContextSnapshot,
  Note,
  Tag,
  DATA_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_TAGS,
} from '../types';

vi.mock('fs', () => {
  const existsSync = vi.fn();
  const readFileSync = vi.fn();
  const mkdirSync = vi.fn();
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const rename = vi.fn().mockResolvedValue(undefined);
  const unlink = vi.fn().mockResolvedValue(undefined);
  return {
    existsSync,
    readFileSync,
    mkdirSync,
    promises: {
      writeFile,
      rename,
      unlink,
    },
    default: {
      existsSync,
      readFileSync,
      mkdirSync,
      promises: { writeFile, rename, unlink },
    },
  };
});

import * as fs from 'fs';

function createMockContext(globalStateData: Record<string, any> = {}): vscode.ExtensionContext {
  const store = { ...globalStateData };
  return {
    globalState: {
      get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined => {
        return store[key] !== undefined ? store[key] : defaultValue;
      }),
      update: vi.fn(async (key: string, value: any) => {
        store[key] = value;
      }),
      keys: vi.fn(() => Object.keys(store)),
    },
    workspaceState: {
      get: vi.fn(),
      update: vi.fn(),
      keys: vi.fn(),
    },
    subscriptions: [],
    extensionPath: '/mock/extension',
    extensionUri: { fsPath: '/mock/extension', path: '/mock/extension', scheme: 'file' } as any,
    environmentVariableCollection: {} as any,
    extensionMode: 1,
    globalStorageUri: { fsPath: '/mock/global', path: '/mock/global', scheme: 'file' } as any,
    logUri: { fsPath: '/mock/log', path: '/mock/log', scheme: 'file' } as any,
    storageUri: { fsPath: '/mock/storage', path: '/mock/storage', scheme: 'file' } as any,
    asAbsolutePath: vi.fn((p: string) => `/mock/extension/${p}`),
    secrets: {
      get: vi.fn(),
      store: vi.fn(),
      delete: vi.fn(),
    } as any,
  } as unknown as vscode.ExtensionContext;
}

const mockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Test Project',
  path: '/test/project',
  tags: [],
  enabled: true,
  lastOpened: 0,
  type: 'any',
  lifecycle: 'active',
  ...overrides,
});

const mockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  projectId: 'proj-1',
  title: 'Test Task',
  category: 'feature',
  priority: 'medium',
  status: 'todo',
  createdAt: 0,
  updatedAt: 0,
  tags: [],
  ...overrides,
});

const mockMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'ms-1',
  projectId: 'proj-1',
  title: 'Test Milestone',
  taskIds: [],
  completedTasks: 0,
  totalTasks: 0,
  progress: 0,
  status: 'upcoming',
  createdAt: 0,
  ...overrides,
});

const mockChangelog = (overrides: Partial<ChangelogEntry> = {}): ChangelogEntry => ({
  id: 'cl-1',
  projectId: 'proj-1',
  date: 0,
  visibility: 'private',
  ...overrides,
});

const mockSnapshot = (overrides: Partial<ContextSnapshot> = {}): ContextSnapshot => ({
  id: 'snap-1',
  projectId: 'proj-1',
  timestamp: 0,
  ...overrides,
});

const mockNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  projectId: 'proj-1',
  title: 'Test Note',
  content: '',
  createdAt: 0,
  updatedAt: 0,
  tags: [],
  ...overrides,
});

const mockTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 'tag-1',
  name: 'Test Tag',
  color: '#FF6B6B',
  order: 0,
  ...overrides,
});

describe('Storage', () => {
  let storage: Storage;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    vi.resetAllMocks();
    mockContext = createMockContext();
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn().mockReturnValue(''),
    });
    (fs.existsSync as any).mockReturnValue(false);
    storage = new Storage(mockContext);
  });

  it('should return empty array when projects file does not exist', () => {
    const projects = storage.getProjects();
    expect(projects).toEqual([]);
    expect(fs.existsSync).toHaveBeenCalled();
  });

  it('should load projects from valid projects.json', () => {
    const projectsJson = [
      {
        id: 'proj-1',
        name: 'Project One',
        path: '/path/one',
        tags: ['tag-1'],
        enabled: true,
        lastOpened: 123,
        type: 'git',
        lifecycle: 'active',
      },
      {
        id: 'proj-2',
        name: 'Project Two',
        path: '/path/two',
        tags: [],
        enabled: false,
        lastOpened: 456,
        type: 'vscode',
        lifecycle: 'planning',
      },
    ];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(projectsJson));

    const projects = storage.getProjects();
    expect(projects).toHaveLength(2);
    expect(projects[0].id).toBe('proj-1');
    expect(projects[0].name).toBe('Project One');
    expect(projects[1].enabled).toBe(false);
    expect(projects[1].lifecycle).toBe('planning');
  });

  it('should save projects to file', async () => {
    const projects: Project[] = [mockProject({ id: 'p1', name: 'Saved Project' })];

    (fs.existsSync as any).mockImplementation(() => false);
    (fs.mkdirSync as any).mockImplementation(() => undefined);
    (fs.promises.writeFile as any).mockResolvedValue(undefined);

    await storage.saveProjects(projects);

    expect(fs.promises.writeFile).toHaveBeenCalled();
    const written = JSON.parse((fs.promises.writeFile as any).mock.calls[0][1]);
    expect(written).toHaveLength(1);
    expect(written[0].id).toBe('p1');
  });

  it('should append project with addProject', async () => {
    const initialProjects: Project[] = [mockProject({ id: 'p1' })];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(initialProjects));
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdirSync as any).mockImplementation(() => undefined);

    storage = new Storage(mockContext);
    const newProject = mockProject({ id: 'p2', name: 'Second Project' });
    await storage.addProject(newProject);

    const projects = storage.getProjects();
    expect(projects).toHaveLength(2);
    expect(projects[1].id).toBe('p2');
  });

  it('should update project with updateProject', async () => {
    const initialProjects: Project[] = [mockProject({ id: 'p1', name: 'Old Name' })];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(initialProjects));
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdirSync as any).mockImplementation(() => undefined);

    storage = new Storage(mockContext);
    const updated = mockProject({ id: 'p1', name: 'New Name' });
    await storage.updateProject(updated);

    const projects = storage.getProjects();
    expect(projects[0].name).toBe('New Name');
  });

  it('should delete project and associated data', async () => {
    const projects: Project[] = [mockProject({ id: 'p1' }), mockProject({ id: 'p2' })];
    const tasks: Task[] = [
      mockTask({ id: 't1', projectId: 'p1' }),
      mockTask({ id: 't2', projectId: 'p2' }),
    ];
    const milestones: Milestone[] = [mockMilestone({ id: 'm1', projectId: 'p1' })];
    const changelog: ChangelogEntry[] = [mockChangelog({ id: 'c1', projectId: 'p1' })];
    const snapshots: ContextSnapshot[] = [mockSnapshot({ id: 's1', projectId: 'p1' })];
    const notes: Note[] = [
      mockNote({ id: 'n1', projectId: 'p1' }),
      mockNote({ id: 'n2', projectId: 'p2' }),
    ];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(projects));
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdirSync as any).mockImplementation(() => undefined);

    mockContext = createMockContext({
      projectManagerPro: {
        tasks,
        milestones,
        changelog,
        snapshots,
        notes,
        tags: [...DEFAULT_TAGS],
        settings: { ...DEFAULT_SETTINGS },
        dataVersion: DATA_VERSION,
      },
    });
    storage = new Storage(mockContext);

    await storage.deleteProject('p1');

    expect(storage.getProjects()).toHaveLength(1);
    expect(storage.getProjects()[0].id).toBe('p2');
    expect(storage.getTasks()).toHaveLength(1);
    expect(storage.getTasks()[0].id).toBe('t2');
    expect(storage.getMilestones()).toHaveLength(0);
    expect(storage.getChangelog()).toHaveLength(0);
    expect(storage.getSnapshots()).toHaveLength(0);
    expect(storage.getNotes()).toHaveLength(1);
    expect(storage.getNotes()[0].id).toBe('n2');
  });

  it('should delete tag and remove it from projects', async () => {
    const projects: Project[] = [
      mockProject({ id: 'p1', tags: ['tag-1', 'tag-2'] }),
      mockProject({ id: 'p2', tags: ['tag-2', 'tag-3'] }),
    ];
    const tags: Tag[] = [
      mockTag({ id: 'tag-1' }),
      mockTag({ id: 'tag-2' }),
      mockTag({ id: 'tag-3' }),
    ];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(projects));
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdirSync as any).mockImplementation(() => undefined);

    mockContext = createMockContext({
      projectManagerPro: {
        tasks: [],
        milestones: [],
        changelog: [],
        snapshots: [],
        notes: [],
        tags,
        settings: { ...DEFAULT_SETTINGS },
        dataVersion: DATA_VERSION,
      },
    });
    storage = new Storage(mockContext);

    await storage.deleteTag('tag-2');

    expect(storage.getTags()).toHaveLength(2);
    expect(storage.getTags().some((t) => t.id === 'tag-2')).toBe(false);

    const updatedProjects = storage.getProjects();
    expect(updatedProjects[0].tags).toEqual(['tag-1']);
    expect(updatedProjects[1].tags).toEqual(['tag-3']);
  });

  it('should use cache on second getData call', () => {
    const projectsJson = [mockProject({ id: 'p1' })];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(projectsJson));

    storage = new Storage(mockContext);

    const data1 = storage.getData();
    const data2 = storage.getData();

    expect(data1).toBe(data2);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache', () => {
    const projectsJson = [mockProject({ id: 'p1' })];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(projectsJson));

    storage = new Storage(mockContext);

    const data1 = storage.getData();
    storage.invalidateCache();
    const data2 = storage.getData();

    expect(data1).not.toBe(data2);
    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
  });

  it('should return empty array when data validation fails', () => {
    const invalidJson = [
      {
        id: 123,
        name: 456,
        path: true,
      },
    ];

    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify(invalidJson));

    storage = new Storage(mockContext);
    const projects = storage.getProjects();

    expect(projects).toEqual([]);
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Project data validation failed. Using empty project list.'
    );
  });

  it('should keep previous projects on partial-write JSON during sync read', () => {
    // Pre-seed the cache with one valid project so the partial-write catch path
    // has something to fall back to.
    const seeded = [mockProject({ id: 'p1', name: 'Seeded' })];
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValueOnce(JSON.stringify(seeded));
    storage = new Storage(mockContext);
    expect(storage.getProjects()).toHaveLength(1);

    // Now simulate another IDE writing the file mid-write: readFileSync returns
    // an unparseable blob. The old code would silently return [] here, which is
    // the bug we are fixing.
    (fs.readFileSync as any).mockReturnValueOnce('[ { "id": "p2", "name":');
    // No cache invalidation between the two reads; the file watcher is what
    // triggers the re-read, and it does not call invalidateCache in the
    // partial-write path.
    const projects = storage.getProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe('p1');
  });

  it('forceReloadProjects should read from disk and retry on partial JSON', async () => {
    const valid = [mockProject({ id: 'p1' }), mockProject({ id: 'p2' })];
    (fs.existsSync as any).mockReturnValue(true);
    // First two attempts: invalid JSON (simulating mid-write). Third: valid.
    (fs.readFileSync as any)
      .mockReturnValueOnce('[ { "id": "p1"')
      .mockReturnValueOnce('[ { "id": "p1"')
      .mockReturnValueOnce(JSON.stringify(valid));

    storage = new Storage(mockContext);
    const projects = await storage.forceReloadProjects({ attempts: 3, delayMs: 1 });

    expect(projects).toHaveLength(2);
    expect(fs.readFileSync).toHaveBeenCalledTimes(3);
  });

  it('forceReloadProjects should show error and keep cache after all attempts fail', async () => {
    const seeded = [mockProject({ id: 'p1' })];
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValueOnce(JSON.stringify(seeded));
    storage = new Storage(mockContext);
    storage.getProjects(); // warm cache

    (fs.readFileSync as any).mockReset();
    (fs.readFileSync as any).mockReturnValue('not even close to json');
    (vscode.window.showErrorMessage as any).mockClear();

    const projects = await storage.forceReloadProjects({ attempts: 2, delayMs: 1 });

    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe('p1');
    expect(vscode.window.showErrorMessage).toHaveBeenCalled();
  });

  it('saveProjects should write atomically via temp file + rename', async () => {
    (fs.existsSync as any).mockReturnValue(false);
    (fs.mkdirSync as any).mockImplementation(() => undefined);
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.promises.rename as any).mockResolvedValue(undefined);

    await storage.saveProjects([mockProject({ id: 'p1' })]);

    expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
    // The write must be to a .tmp file, not the final path directly.
    const writeArgs = (fs.promises.writeFile as any).mock.calls[0];
    expect(writeArgs[0]).toMatch(/\.tmp$/);
    expect(writeArgs[0]).not.toBe(storage.getProjectsFilePath());
    // The temp file must be renamed over the real path.
    expect(fs.promises.rename).toHaveBeenCalledTimes(1);
    const renameArgs = (fs.promises.rename as any).mock.calls[0];
    expect(renameArgs[0]).toMatch(/\.tmp$/);
    expect(renameArgs[1]).toBe(storage.getProjectsFilePath());
  });
});
