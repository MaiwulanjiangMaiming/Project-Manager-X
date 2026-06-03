import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../webview/store/useProjectStore';
import { Project, Task, Tag, Settings, DEFAULT_SETTINGS } from '../types';

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test',
  path: '/test',
  tags: [],
  enabled: true,
  lastOpened: 0,
  type: 'any',
  lifecycle: 'active',
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  projectId: 'p1',
  title: 'Test',
  category: 'feature',
  priority: 'medium',
  status: 'todo',
  createdAt: 0,
  updatedAt: 0,
  tags: [],
  ...overrides,
});

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 'tag-1',
  name: 'Tag',
  color: '#FFF',
  order: 0,
  ...overrides,
});

const baseSettings: Settings = { ...DEFAULT_SETTINGS };

const makePayload = (projects: Project[] = []) => ({
  projects,
  tasks: [],
  milestones: [],
  changelog: [],
  snapshots: [],
  notes: [],
  tags: [makeTag()],
  settings: baseSettings,
});

describe('useProjectStore.loadState', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      tasks: [],
      milestones: [],
      changelog: [],
      snapshots: [],
      notes: [],
      tags: [],
      settings: DEFAULT_SETTINGS,
      selectedProjectId: null,
      searchQuery: '',
      selectedTag: null,
      sortBy: 'recent',
      viewMode: 'detailed',
      showGlobalTasks: false,
      isLoading: false,
      isManageMode: false,
      selectedProjectIds: new Set<string>(),
    });
  });

  it('replaces projects, tasks, and tags with the payload', () => {
    const p1 = makeProject({ id: 'p1' });
    const t1 = makeTask({ id: 't1' });
    useProjectStore.getState().loadState({
      ...makePayload([p1]),
      tasks: [t1],
    });

    const state = useProjectStore.getState();
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].id).toBe('p1');
    expect(state.tasks).toEqual([t1]);
    expect(state.tags).toHaveLength(1);
  });

  it('preserves selectedProjectId when the project still exists', () => {
    const p1 = makeProject({ id: 'p1' });
    useProjectStore.setState({ selectedProjectId: 'p1' });
    useProjectStore.getState().loadState(makePayload([p1]));
    expect(useProjectStore.getState().selectedProjectId).toBe('p1');
  });

  it('clears selectedProjectId when the project was removed in the new payload', () => {
    useProjectStore.setState({ selectedProjectId: 'gone' });
    useProjectStore.getState().loadState(makePayload([makeProject({ id: 'p1' })]));
    expect(useProjectStore.getState().selectedProjectId).toBeNull();
  });

  it('preserves searchQuery, selectedTag, sortBy, viewMode across refresh', () => {
    useProjectStore.setState({
      searchQuery: 'gpu',
      selectedTag: 'tag-1',
      sortBy: 'name',
      viewMode: 'compact',
    });
    useProjectStore.getState().loadState(makePayload([makeProject()]));
    const state = useProjectStore.getState();
    expect(state.searchQuery).toBe('gpu');
    expect(state.selectedTag).toBe('tag-1');
    expect(state.sortBy).toBe('name');
    expect(state.viewMode).toBe('compact');
  });

  it('preserves manage-mode selection but drops IDs that no longer exist', () => {
    useProjectStore.setState({
      isManageMode: true,
      selectedProjectIds: new Set(['p1', 'p-gone']),
    });
    useProjectStore.getState().loadState(makePayload([makeProject({ id: 'p1' })]));
    const state = useProjectStore.getState();
    expect(state.isManageMode).toBe(true);
    expect(state.selectedProjectIds.has('p1')).toBe(true);
    expect(state.selectedProjectIds.has('p-gone')).toBe(false);
    expect(state.selectedProjectIds.size).toBe(1);
  });

  it('preserves showGlobalTasks across refresh', () => {
    useProjectStore.setState({ showGlobalTasks: true });
    useProjectStore.getState().loadState(makePayload([makeProject()]));
    expect(useProjectStore.getState().showGlobalTasks).toBe(true);
  });
});
