import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Project,
  Task,
  Milestone,
  ChangelogEntry,
  ContextSnapshot,
  Note,
  Tag,
  Settings,
  DEFAULT_SETTINGS,
  inferLifecycle,
} from '../../types';

interface StateUpdateData {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  changelog: ChangelogEntry[];
  snapshots: ContextSnapshot[];
  notes: Note[];
  tags: Tag[];
  settings: Settings;
}

interface ProjectStore {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  changelog: ChangelogEntry[];
  snapshots: ContextSnapshot[];
  notes: Note[];
  tags: Tag[];
  settings: Settings;

  selectedProjectId: string | null;
  searchQuery: string;
  selectedTag: string | null;
  sortBy: 'saved' | 'name' | 'path' | 'recent' | 'priority' | 'custom';
  viewMode: 'detailed' | 'compact';
  showGlobalTasks: boolean;
  isLoading: boolean;

  isManageMode: boolean;
  selectedProjectIds: Set<string>;

  setProjects: (projects: Project[]) => void;
  setTasks: (tasks: Task[]) => void;
  setMilestones: (milestones: Milestone[]) => void;
  setChangelog: (changelog: ChangelogEntry[]) => void;
  setSnapshots: (snapshots: ContextSnapshot[]) => void;
  setNotes: (notes: Note[]) => void;
  setTags: (tags: Tag[]) => void;
  setSettings: (settings: Settings) => void;

  selectProject: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTag: (tagId: string | null) => void;
  setSortBy: (sortBy: 'saved' | 'name' | 'path' | 'recent' | 'priority' | 'custom') => void;
  setViewMode: (mode: 'detailed' | 'compact') => void;
  setShowGlobalTasks: (show: boolean) => void;
  setLoading: (loading: boolean) => void;

  toggleManageMode: () => void;
  toggleProjectSelection: (projectId: string) => void;
  selectAllProjects: (projectIds?: string[]) => void;
  deselectAllProjects: () => void;
  exitManageMode: () => void;

  updateTask: (projectId: string, task: Task) => void;

  loadState: (data: StateUpdateData) => void;
}

export const useProjectStore = create<ProjectStore>()(
  subscribeWithSelector((set, get) => ({
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

    setProjects: (projects) => set({ projects }),
    setTasks: (tasks) => set({ tasks }),
    setMilestones: (milestones) => set({ milestones }),
    setChangelog: (changelog) => set({ changelog }),
    setSnapshots: (snapshots) => set({ snapshots }),
    setNotes: (notes) => set({ notes }),
    setTags: (tags) => set({ tags }),
    setSettings: (settings) => set({ settings }),

    selectProject: (id) => set({ selectedProjectId: id, showGlobalTasks: false }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSelectedTag: (tagId) => set({ selectedTag: tagId }),
    setSortBy: (sortBy) => {
      const current = get();
      if (sortBy === 'custom' && current.sortBy !== 'custom') {
        const projects = [...current.projects];
        set({ sortBy, projects });
      } else if (sortBy !== 'custom' && current.sortBy === 'custom') {
        set({ sortBy });
      } else {
        set({ sortBy });
      }
    },
    setViewMode: (mode) => set({ viewMode: mode }),
    setShowGlobalTasks: (show) =>
      set({ showGlobalTasks: show, selectedProjectId: show ? null : get().selectedProjectId }),
    setLoading: (loading) => set({ isLoading: loading }),

    toggleManageMode: () => {
      const current = get();
      set({
        isManageMode: !current.isManageMode,
        selectedProjectIds: new Set<string>(),
      });
    },

    toggleProjectSelection: (projectId) => {
      const current = get().selectedProjectIds;
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      set({ selectedProjectIds: next });
    },

    selectAllProjects: (projectIds) => {
      if (projectIds) {
        set({ selectedProjectIds: new Set(projectIds) });
      } else {
        set({ selectedProjectIds: new Set(get().projects.map((p) => p.id)) });
      }
    },

    deselectAllProjects: () => {
      set({ selectedProjectIds: new Set<string>() });
    },

    exitManageMode: () => {
      set({ isManageMode: false, selectedProjectIds: new Set<string>() });
    },

    updateTask: (projectId, task) =>
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
      })),

    loadState: (data) => {
      const projects = (data.projects || []).map((p: Project) => ({
        ...p,
        lifecycle: inferLifecycle(p.lastOpened, p.lifecycleOverride),
      }));
      set({
        projects,
        tasks: data.tasks || [],
        milestones: data.milestones || [],
        changelog: data.changelog || [],
        snapshots: data.snapshots || [],
        notes: data.notes || [],
        tags: data.tags || [],
        settings: data.settings || DEFAULT_SETTINGS,
      });
    },
  }))
);
