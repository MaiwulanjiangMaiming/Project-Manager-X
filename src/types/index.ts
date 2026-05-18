/**
 * Project Manager X
 * Copyright (c) 2026 Maiwulanjiang Maiming <mawlan.momin@gmail.com>
 * Licensed under GPL-3.0
 */

export type ProjectType = 'git' | 'mercurial' | 'svn' | 'vscode' | 'any' | 'ssh' | 'docker' | 'wsl' | 'devcontainer' | 'codespaces';

export type ProjectLifecycle = 'idea' | 'planning' | 'active' | 'maintenance' | 'archived';

export type ProjectNature =
  | 'research'
  | 'personal'
  | 'public-oss'
  | 'vscode-extension'
  | 'mobile-app'
  | 'web-app'
  | 'library'
  | 'content'
  | 'client-work'
  | 'experiment'
  | 'template'
  | 'monorepo';

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  tags: string[];
  enabled: boolean;
  lastOpened?: number;
  type: ProjectType;
  nature?: ProjectNature;
  lifecycle: ProjectLifecycle;
  lifecycleOverride?: ProjectLifecycle;
  remote?: {
    type: 'ssh' | 'docker' | 'wsl' | 'devcontainer' | 'codespaces';
    host?: string;
    container?: string;
  };
  health?: ProjectHealth;
}

export interface ProjectHealth {
  lastActiveAt: number;
  status: 'active' | 'idle' | 'stalled' | 'archived';
  openTasks: number;
  completionRate: number;
  recentCommits: number;
}

// --- Task System ---

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled';
export type TaskCategory = 'bug' | 'feature' | 'refactor' | 'docs' | 'research' | 'chore' | 'experiment';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  estimatedMinutes?: number;
  actualMinutes?: number;
  tags: string[];
  subtasks?: SubTask[];
  relatedFiles?: string[];
  linkedBranch?: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

// --- Milestone ---

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate?: number;
  taskIds: string[];
  completedTasks: number;
  totalTasks: number;
  progress: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'overdue';
  createdAt: number;
}

// --- Changelog ---

export interface ChangelogEntry {
  id: string;
  projectId: string;
  version?: string;
  date: number;
  added?: string[];
  changed?: string[];
  fixed?: string[];
  removed?: string[];
  notes?: string;
  relatedTaskIds?: string[];
  visibility: 'private' | 'public';
}

// --- Context Snapshot ---

export interface ContextSnapshot {
  id: string;
  projectId: string;
  timestamp: number;
  activeFile?: string;
  openFiles?: string[];
  cursorPosition?: { file: string; line: number; column: number };
  lastThought?: string;
  nextStep?: string;
  gitBranch?: string;
  gitStatus?: string;
}

// --- Note ---

export interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

// --- Tag ---

export interface Tag {
  id: string;
  name: string;
  color: string;
  order: number;
}

// --- Settings ---

export interface Settings {
  sortBy: 'saved' | 'name' | 'path' | 'recent' | 'priority' | 'custom';
  groupByTag: boolean;
  showPath: boolean;
  autoDetectGit: boolean;
  autoDetectVSCode: boolean;
  gitBaseFolders: string[];
  gitMaxDepth: number;
  projectsFilePath?: string;
  cardDensity: 'compact' | 'normal' | 'spacious';
  showTaskCount: boolean;
  showProgressBar: boolean;
}

// --- Storage ---

export interface StorageData {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  changelog: ChangelogEntry[];
  snapshots: ContextSnapshot[];
  notes: Note[];
  tags: Tag[];
  settings: Settings;
}

// --- Messages ---

export const DATA_VERSION = 3;

export type MessageType =
  | 'stateUpdated'
  | 'openProject'
  | 'openInNewWindow'
  | 'saveProject'
  | 'deleteProject'
  | 'updateProject'
  | 'addTag'
  | 'updateTag'
  | 'deleteTag'
  | 'reorderProjects'
  | 'reorderTags'
  | 'showInFolder'
  | 'addToWorkspace'
  | 'refreshProjects'
  | 'addDetectFolder'
  | 'editProjectsFile'
  | 'importFromProjectManager'
  | 'moveProjectToTag'
  | 'removeProjectFromTag'
  | 'createTask'
  | 'updateTask'
  | 'deleteTask'
  | 'createMilestone'
  | 'updateMilestone'
  | 'deleteMilestone'
  | 'createChangelog'
  | 'updateChangelog'
  | 'deleteChangelog'
  | 'createNote'
  | 'updateNote'
  | 'deleteNote'
  | 'saveSnapshot'
  | 'getLatestSnapshot'
  | 'openProjectDetail'
  | 'showGlobalTasks'
  | 'batchDeleteTasks'
  | 'batchUpdateTaskStatus'
  | 'batchDeleteProjects'
  | 'openExternal'
  | 'quickSwitch'
  | 'autoMatchWorkspace'
  | 'exportProjects'
  | 'restoreBackup'
  | 'error:report'
  | 'ready';

export interface WebviewMessage {
  type: MessageType;
  data?: any;
  id?: string;
}

export interface ExtensionToWebview {
  type: string;
  data?: any;
  id?: string;
}

export interface WebviewToExtension {
  type: MessageType;
  data?: any;
  id?: string;
}

// --- Defaults ---

export const DEFAULT_SETTINGS: Settings = {
  sortBy: 'recent',
  groupByTag: true,
  showPath: true,
  autoDetectGit: true,
  autoDetectVSCode: true,
  gitBaseFolders: [],
  gitMaxDepth: 4,
  cardDensity: 'normal',
  showTaskCount: true,
  showProgressBar: true
};

export const DEFAULT_TAGS: Tag[] = [
  { id: 'personal', name: 'Personal', color: '#4ECDC4', order: 0 },
  { id: 'work', name: 'Work', color: '#FF6B6B', order: 1 },
  { id: 'learning', name: 'Learning', color: '#FFE66D', order: 2 }
];

export const PROJECT_ICONS: Record<string, { icon: string; label: string; svg?: string; svgViewBox?: string }> = {
  git: {
    icon: '',
    label: 'Git Repository',
    svgViewBox: '0 0 32 32',
    svg: '<path d="M13.172 2.828 11.78 4.22l1.91 1.91 2 2A2.986 2.986 0 0 1 20 10.81a3.25 3.25 0 0 1-.31 1.31l2.06 2a2.68 2.68 0 0 1 3.37.57 2.86 2.86 0 0 1 .88 2.117 3.02 3.02 0 0 1-.856 2.109A2.9 2.9 0 0 1 23 19.81a2.93 2.93 0 0 1-2.13-.87 2.694 2.694 0 0 1-.56-3.38l-2-2.06a3 3 0 0 1-.31.12V20a3 3 0 0 1 1.44 1.09 2.92 2.92 0 0 1 .56 1.72 2.88 2.88 0 0 1-.878 2.128 2.98 2.98 0 0 1-2.048.871 2.981 2.981 0 0 1-2.514-4.719A3 3 0 0 1 16 20v-6.38a2.96 2.96 0 0 1-1.44-1.09 2.9 2.9 0 0 1-.56-1.72 2.9 2.9 0 0 1 .31-1.31l-3.9-3.9-7.579 7.572a4 4 0 0 0-.001 5.658l10.342 10.342a4 4 0 0 0 5.656 0l10.344-10.344a4 4 0 0 0 0-5.656L18.828 2.828a4 4 0 0 0-5.656 0"/>'
  },
  mercurial: {
    icon: '',
    label: 'Mercurial Repository',
    svgViewBox: '0 0 24 24',
    svg: '<path d="M21.29 12.66c.287-4.983-3.45-10.35-9.202-9.68-2.588.288-4.121 1.63-4.792 3.067-1.15 2.397.095 5.56 3.834 6.614 2.3.67 2.78 1.63 2.492 2.78-.288 1.054-1.055 2.204-1.246 3.163-.096.287-.096.575-.096.862.096 2.109 4.409 2.972 7.764-2.684.766-1.15 1.15-2.587 1.246-4.121zM6.433 11.51v-.383c0-.096 0-.191-.096-.287-.192-.959-.958-1.534-1.917-1.438s-1.63.863-1.725 1.821v.48c.096 1.054 1.054 1.82 2.013 1.725 1.054-.192 1.725-.959 1.725-1.917z"/><path d="M10.65 16.59c-.383-1.533-1.917-2.491-3.45-2.012-1.246.287-2.013 1.342-2.109 2.588-.096.383 0 .767.096 1.15.383 1.534 2.013 2.492 3.546 2.013 1.342-.383 2.205-1.63 2.109-3.067-.096-.192-.096-.384-.192-.671z"/>'
  },
  svn: { icon: '🗂️', label: 'SVN Repository' },
  vscode: { icon: '💻', label: 'VS Code Workspace' },
  any: { icon: '📁', label: 'Folder' },
  ssh: { icon: '🔗', label: 'SSH Remote' },
  docker: {
    icon: '',
    label: 'Docker Container',
    svgViewBox: '0 0 24 24',
    svg: '<path d="M21.81 10.25c-.06-.04-.56-.43-1.64-.43-.28 0-.56.03-.84.08-.21-1.4-1.38-2.11-1.43-2.14l-.29-.17-.18.27c-.24.36-.43.77-.51 1.19-.2.8-.08 1.56.33 2.21-.49.28-1.29.35-1.46.35H2.62c-.34 0-.62.28-.62.63 0 1.15.18 2.3.58 3.38.45 1.19 1.13 2.07 2 2.61.98.6 2.59.94 4.42.94.79 0 1.61-.07 2.42-.22 1.12-.2 2.2-.59 3.19-1.16A8.3 8.3 0 0 0 16.78 16c1.05-1.17 1.67-2.5 2.12-3.65h.19c1.14 0 1.85-.46 2.24-.85.26-.24.45-.53.59-.87l.08-.24zm-17.96.99h1.76c.08 0 .16-.07.16-.16V9.5c0-.08-.07-.16-.16-.16H3.85c-.09 0-.16.07-.16.16v1.58c.01.09.07.16.16.16m2.43 0h1.76c.08 0 .16-.07.16-.16V9.5c0-.08-.07-.16-.16-.16H6.28c-.09 0-.16.07-.16.16v1.58c.01.09.07.16.16.16m2.47 0h1.75c.1 0 .17-.07.17-.16V9.5c0-.08-.06-.16-.17-.16H8.75c-.08 0-.15.07-.15.16v1.58c0 .09.06.16.15.16m2.44 0h1.77c.08 0 .15-.07.15-.16V9.5c0-.08-.06-.16-.15-.16h-1.77c-.08 0-.15.07-.15.16v1.58c0 .09.07.16.15.16M6.28 9h1.76c.08 0 .16-.09.16-.18V7.25c0-.09-.07-.16-.16-.16H6.28c-.09 0-.16.06-.16.16v1.57c.01.09.07.18.16.18m2.47 0h1.75c.1 0 .17-.09.17-.18V7.25c0-.09-.06-.16-.17-.16H8.75c-.08 0-.15.06-.15.16v1.57c0 .09.06.18.15.18m2.44 0h1.77c.08 0 .15-.09.15-.18V7.25c0-.09-.07-.16-.15-.16h-1.77c-.08 0-.15.06-.15.16v1.57c0 .09.07.18.15.18m0-2.28h1.77c.08 0 .15-.07.15-.16V5c0-.1-.07-.17-.15-.17h-1.77c-.08 0-.15.06-.15.17v1.56c0 .08.07.16.15.16m2.46 4.52h1.76c.09 0 .16-.07.16-.16V9.5c0-.08-.07-.16-.16-.16h-1.76c-.08 0-.15.07-.15.16v1.58c0 .09.07.16.15.16"/>'
  },
  wsl: { icon: '🐧', label: 'WSL' },
  devcontainer: { icon: '📦', label: 'Dev Container' },
  codespaces: { icon: '☁️', label: 'GitHub Codespaces' }
};

export const LIFECYCLE_COLORS: Record<ProjectLifecycle, string> = {
  idea: '#A8D8EA',
  planning: '#FFE66D',
  active: '#4ECDC4',
  maintenance: '#FF9F43',
  archived: '#858585'
};

export const LIFECYCLE_LABELS: Record<ProjectLifecycle, string> = {
  idea: '💡 Idea',
  planning: '📋 Planning',
  active: '🚀 Active',
  maintenance: '🔧 Maintenance',
  archived: '📦 Archived'
};

export function inferLifecycle(lastOpened?: number, lifecycleOverride?: ProjectLifecycle): ProjectLifecycle {
  if (lifecycleOverride) return lifecycleOverride;
  if (!lastOpened) return 'active';
  const daysSince = (Date.now() - lastOpened) / (1000 * 60 * 60 * 24);
  if (daysSince <= 7) return 'active';
  if (daysSince <= 30) return 'maintenance';
  return 'archived';
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#858585',
  todo: '#54A0FF',
  in_progress: '#FECA57',
  review: '#AA96DA',
  done: '#4ECDC4',
  blocked: '#FF6B6B',
  cancelled: '#3c3c3c'
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: '#FF0000',
  high: '#FF6B6B',
  medium: '#FFE66D',
  low: '#4ECDC4'
};

export const TAG_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181',
  '#AA96DA', '#FCBAD3', '#A8D8EA', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#10AC84', '#EE5A6F', '#C44569', '#F8B500', '#6C5CE7'
];
