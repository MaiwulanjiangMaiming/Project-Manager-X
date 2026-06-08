import React, { useState, useMemo } from 'react';
import {
  Project,
  Task,
  TaskStatus,
  TaskCategory,
  TaskPriority,
  Milestone,
  ChangelogEntry,
  ContextSnapshot,
  Note,
  Tag,
  STATUS_COLORS,
  PRIORITY_COLORS,
  LIFECYCLE_COLORS,
  LIFECYCLE_LABELS,
  PROJECT_ICONS,
} from '../../types';

type DetailTab = 'overview' | 'tasks' | 'milestones' | 'changelog' | 'notes';

const ALL_STATUSES: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
  'blocked',
  'cancelled',
];
const ALL_CATEGORIES: TaskCategory[] = [
  'bug',
  'feature',
  'refactor',
  'docs',
  'research',
  'chore',
  'experiment',
];
const ALL_PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

interface ProjectDetailProps {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  changelog: ChangelogEntry[];
  snapshots: ContextSnapshot[];
  notes: Note[];
  tags: Tag[];
  onBack: () => void;
  onOpenProject: (id: string) => void;
  onUpdateProject: (project: Project) => void;
  onCreateTask: (
    projectId: string,
    title: string,
    category: TaskCategory,
    priority: TaskPriority
  ) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onBatchDeleteTasks: (taskIds: string[]) => void;
  onBatchUpdateTaskStatus: (taskIds: string[], status: TaskStatus) => void;
  onCreateMilestone: (
    projectId: string,
    title: string,
    description?: string,
    dueDate?: number
  ) => void;
  onUpdateMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (milestoneId: string) => void;
  onCreateChangelog: (projectId: string, version: string, changes: Partial<ChangelogEntry>) => void;
  onDeleteChangelog: (changelogId: string) => void;
  onCreateNote: (projectId: string, title: string, content: string) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export default function ProjectDetail({
  project,
  tasks,
  milestones,
  changelog,
  snapshots,
  notes,
  tags,
  onBack,
  onOpenProject,
  onUpdateProject,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onBatchDeleteTasks,
  onBatchUpdateTaskStatus,
  onCreateMilestone,
  onUpdateMilestone: _onUpdateMilestone,
  onDeleteMilestone,
  onCreateChangelog,
  onDeleteChangelog,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [showLifecyclePicker, setShowLifecyclePicker] = useState(false);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.projectId === project.id),
    [tasks, project.id]
  );
  const projectMilestones = useMemo(
    () => milestones.filter((m) => m.projectId === project.id),
    [milestones, project.id]
  );
  const projectChangelog = useMemo(
    () => changelog.filter((c) => c.projectId === project.id),
    [changelog, project.id]
  );
  const projectSnapshots = useMemo(
    () => snapshots.filter((s) => s.projectId === project.id),
    [snapshots, project.id]
  );
  const projectNotes = useMemo(
    () => notes.filter((n) => n.projectId === project.id),
    [notes, project.id]
  );

  const latestSnapshot = useMemo(
    () =>
      projectSnapshots.length > 0
        ? projectSnapshots.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
        : null,
    [projectSnapshots]
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {} as any;
    for (const s of ALL_STATUSES) {
      grouped[s] = [];
    }
    for (const task of projectTasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [projectTasks]);

  const completionRate = useMemo(() => {
    if (projectTasks.length === 0) return 0;
    const done = projectTasks.filter((t) => t.status === 'done').length;
    return Math.round((done / projectTasks.length) * 100);
  }, [projectTasks]);

  const TAB_CONFIG: { key: DetailTab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'tasks', label: 'Tasks', count: projectTasks.length },
    { key: 'milestones', label: 'Milestones', count: projectMilestones.length },
    { key: 'changelog', label: 'Changelog', count: projectChangelog.length },
    { key: 'notes', label: 'Notes', count: projectNotes.length },
  ];

  const typeInfo = PROJECT_ICONS[project.type] || PROJECT_ICONS.any;
  const lifecycleColor = LIFECYCLE_COLORS[project.lifecycle];

  return (
    <div className="project-detail">
      <div className="detail-header">
        <div className="detail-header-top">
          <button className="back-btn" onClick={onBack} data-tip="Back to projects">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" />
            </svg>
          </button>
          <div className="detail-title">
            <h3>
              <span className="detail-type-icon" data-tip={typeInfo.label}>
                {typeInfo.paths ? (
                  <svg viewBox={typeInfo.viewBox || '0 0 16 16'} fill="currentColor">
                    {typeInfo.paths.map((d, i) => (
                      <path key={i} d={d} />
                    ))}
                  </svg>
                ) : (
                  typeInfo.icon
                )}
              </span>
              {project.name}
            </h3>
            <div className="detail-badges">
              <span
                className="lifecycle-indicator"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLifecyclePicker(!showLifecyclePicker);
                }}
                data-tip="Click to change lifecycle"
              >
                <span className="lifecycle-dot" style={{ backgroundColor: lifecycleColor }} />
                <span className="lifecycle-text">{project.lifecycle}</span>
                <svg viewBox="0 0 16 16" fill="currentColor" className="lifecycle-chevron">
                  <path d="M4.5 6l3.5 3.5L11.5 6" />
                </svg>
              </span>
              {showLifecyclePicker && (
                <div className="lifecycle-picker" onClick={(e) => e.stopPropagation()}>
                  {(['idea', 'planning', 'active', 'maintenance', 'archived'] as const).map(
                    (lc) => (
                      <button
                        key={lc}
                        className={`lifecycle-option ${project.lifecycle === lc ? 'current' : ''}`}
                        onClick={() => {
                          onUpdateProject({
                            ...project,
                            lifecycle: lc,
                            lifecycleOverride: lc,
                          });
                          setShowLifecyclePicker(false);
                        }}
                      >
                        <span
                          className="lifecycle-dot"
                          style={{ backgroundColor: LIFECYCLE_COLORS[lc] }}
                        />
                        {LIFECYCLE_LABELS[lc]}
                      </button>
                    )
                  )}
                </div>
              )}
              {tags
                .filter((t) => project.tags.includes(t.id))
                .map((tag) => (
                  <span
                    key={tag.id}
                    className="detail-tag-badge"
                    style={{
                      backgroundColor: tag.color + '22',
                      color: tag.color,
                      borderColor: tag.color + '55',
                    }}
                    data-tip={`Tag: ${tag.name}`}
                  >
                    <span className="detail-tag-dot" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </span>
                ))}
            </div>
          </div>
          <button
            className="open-project-btn"
            onClick={() => onOpenProject(project.id)}
            data-tip="Open project"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.53 3.22a.75.75 0 00-1.06 1.06L10.19 7H2.75a.75.75 0 000 1.5h7.44l-2.97 2.97a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06L8.53 3.22z" />
            </svg>
          </button>
        </div>
        <div className="detail-header-bottom">
          <span className="detail-path">{project.path}</span>
        </div>
      </div>

      <div className="detail-tabs">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            className={`detail-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tab-count" data-tip={`${tab.count} ${tab.label.toLowerCase()}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="detail-content">
        {activeTab === 'overview' && (
          <OverviewTab
            project={project}
            tasks={projectTasks}
            completionRate={completionRate}
            latestSnapshot={latestSnapshot}
            lifecycleColor={lifecycleColor}
            onUpdateProject={onUpdateProject}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTab
            project={project}
            tasksByStatus={tasksByStatus}
            onCreateTask={onCreateTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onBatchDeleteTasks={onBatchDeleteTasks}
            onBatchUpdateTaskStatus={onBatchUpdateTaskStatus}
          />
        )}
        {activeTab === 'milestones' && (
          <MilestonesTab
            project={project}
            milestones={projectMilestones}
            tasks={projectTasks}
            onCreateMilestone={onCreateMilestone}
            onDeleteMilestone={onDeleteMilestone}
          />
        )}
        {activeTab === 'changelog' && (
          <ChangelogTab
            project={project}
            changelog={projectChangelog}
            onCreateChangelog={onCreateChangelog}
            onDeleteChangelog={onDeleteChangelog}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            project={project}
            notes={projectNotes}
            onCreateNote={onCreateNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  project,
  tasks,
  completionRate,
  latestSnapshot,
  lifecycleColor,
  onUpdateProject,
}: {
  project: Project;
  tasks: Task[];
  completionRate: number;
  latestSnapshot: ContextSnapshot | null;
  lifecycleColor: string;
  onUpdateProject: (project: Project) => void;
}) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState('');
  const lastActive = project.health?.lastActiveAt || project.lastOpened;
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<TaskStatus, number>> = {};
    for (const t of tasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tasks]);

  return (
    <div className="overview-tab">
      <div className="overview-health">
        <div className="stat-card">
          <span className="stat-value">{tasks.length}</span>
          <span className="stat-label">Total Tasks</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{completionRate}%</span>
          <span className="stat-label">Completion</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{statusCounts.in_progress || 0}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{lastActive ? timeAgo(lastActive) : '—'}</span>
          <span className="stat-label">Last Active</span>
        </div>
      </div>

      <div className="overview-progress">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${completionRate}%`, backgroundColor: lifecycleColor }}
          />
        </div>
      </div>

      {latestSnapshot && (
        <div className="snapshot-card">
          <h4 className="snapshot-title">Latest Context</h4>
          <div className="snapshot-fields">
            {latestSnapshot.lastThought && (
              <div className="snapshot-field">
                <span className="snapshot-label">Last Thought</span>
                <span className="snapshot-value">{latestSnapshot.lastThought}</span>
              </div>
            )}
            {latestSnapshot.nextStep && (
              <div className="snapshot-field">
                <span className="snapshot-label">Next Step</span>
                <span className="snapshot-value">{latestSnapshot.nextStep}</span>
              </div>
            )}
            {latestSnapshot.activeFile && (
              <div className="snapshot-field">
                <span className="snapshot-label">Active File</span>
                <span className="snapshot-value snapshot-file">{latestSnapshot.activeFile}</span>
              </div>
            )}
            {latestSnapshot.gitBranch && (
              <div className="snapshot-field">
                <span className="snapshot-label">Branch</span>
                <span className="snapshot-value">{latestSnapshot.gitBranch}</span>
              </div>
            )}
          </div>
          <span className="snapshot-time">{timeAgo(latestSnapshot.timestamp)}</span>
        </div>
      )}

      <div className="overview-description">
        <h4>Description</h4>
        {isEditingDescription ? (
          <div className="description-editor">
            <textarea
              value={editDescriptionValue}
              onChange={(e) => setEditDescriptionValue(e.target.value)}
              placeholder="Add a description..."
              autoFocus
              rows={3}
            />
            <div className="description-editor-actions">
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  onUpdateProject({
                    ...project,
                    description: editDescriptionValue.trim() || undefined,
                  });
                  setIsEditingDescription(false);
                }}
              >
                Save
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  setIsEditingDescription(false);
                  setEditDescriptionValue(project.description || '');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="description-display"
            onClick={() => {
              setEditDescriptionValue(project.description || '');
              setIsEditingDescription(true);
            }}
          >
            {project.description || (
              <span className="description-placeholder">Click to add a description...</span>
            )}
          </p>
        )}
      </div>

      <div className="overview-status-breakdown">
        <h4>Task Breakdown</h4>
        <div className="breakdown-bars">
          {ALL_STATUSES.map((status) => {
            const count = statusCounts[status] || 0;
            if (count === 0) return null;
            const pct = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
            return (
              <div key={status} className="breakdown-row">
                <span className="breakdown-label" style={{ color: STATUS_COLORS[status] }}>
                  {status}
                </span>
                <div className="breakdown-bar-track">
                  <div
                    className="breakdown-bar-fill"
                    style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] }}
                  />
                </div>
                <span className="breakdown-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TasksTab({
  project,
  tasksByStatus,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onBatchDeleteTasks,
  onBatchUpdateTaskStatus,
}: {
  project: Project;
  tasksByStatus: Record<TaskStatus, Task[]>;
  onCreateTask: (
    projectId: string,
    title: string,
    category: TaskCategory,
    priority: TaskPriority
  ) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onBatchDeleteTasks: (taskIds: string[]) => void;
  onBatchUpdateTaskStatus: (taskIds: string[], status: TaskStatus) => void;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('feature');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [showForm, setShowForm] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<TaskStatus>('todo');

  const handleAdd = () => {
    if (newTitle.trim()) {
      onCreateTask(project.id, newTitle.trim(), newCategory, newPriority);
      setNewTitle('');
      setShowForm(false);
    }
  };

  const allTaskIds = useMemo(() => {
    const ids: string[] = [];
    for (const status of ALL_STATUSES) {
      for (const task of tasksByStatus[status]) {
        ids.push(task.id);
      }
    }
    return ids;
  }, [tasksByStatus]);

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => !prev);
    setSelectedTaskIds(new Set());
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTaskIds(new Set(allTaskIds));
  };

  const deselectAll = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedTaskIds.size > 0) {
      onBatchDeleteTasks(Array.from(selectedTaskIds));
      setSelectedTaskIds(new Set());
    }
  };

  const handleBatchStatusChange = () => {
    if (selectedTaskIds.size > 0) {
      onBatchUpdateTaskStatus(Array.from(selectedTaskIds), batchStatus);
      setSelectedTaskIds(new Set());
    }
  };

  const orderedStatuses: TaskStatus[] = [
    'in_progress',
    'todo',
    'backlog',
    'review',
    'blocked',
    'done',
    'cancelled',
  ];

  return (
    <div className="tasks-tab">
      <div className="tasks-toolbar">
        {!showForm ? (
          <button
            className="btn-primary add-entity-btn"
            onClick={() => setShowForm(true)}
            data-tip="Create new task"
          >
            + New Task
          </button>
        ) : (
          <div className="add-task-form">
            <input
              type="text"
              className="task-input"
              placeholder="Task title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div className="task-form-row">
              <select
                className="task-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="task-select"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              >
                {ALL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="task-form-actions">
              <button className="btn-primary" onClick={handleAdd}>
                Create
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setNewTitle('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <button
          className={`manage-toggle-btn ${isSelectMode ? 'active' : ''}`}
          onClick={toggleSelectMode}
          data-tip={isSelectMode ? 'Exit manage mode' : 'Manage tasks'}
        >
          {isSelectMode ? 'Done' : 'Manage'}
        </button>
      </div>

      {isSelectMode && (
        <div className="batch-action-bar">
          <div className="batch-action-left">
            <button
              className="btn-secondary batch-select-btn"
              onClick={selectedTaskIds.size === allTaskIds.length ? deselectAll : selectAll}
              data-tip={
                selectedTaskIds.size === allTaskIds.length
                  ? 'Deselect all tasks'
                  : 'Select all tasks'
              }
            >
              {selectedTaskIds.size === allTaskIds.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="batch-selected-count">{selectedTaskIds.size} selected</span>
          </div>
          <div className="batch-action-right">
            <div className="batch-status-group">
              <select
                className="task-select batch-status-select"
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value as TaskStatus)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary batch-status-btn"
                onClick={handleBatchStatusChange}
                disabled={selectedTaskIds.size === 0}
                data-tip="Set status for selected tasks"
              >
                Set Status
              </button>
            </div>
            <button
              className="btn-danger batch-delete-btn"
              onClick={handleBatchDelete}
              disabled={selectedTaskIds.size === 0}
              data-tip="Delete selected tasks"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {orderedStatuses.map((status) => {
        const group = tasksByStatus[status];
        if (group.length === 0) return null;
        return (
          <div key={status} className="task-status-group">
            <div className="status-group-header">
              <span className="status-dot" style={{ backgroundColor: STATUS_COLORS[status] }} />
              <span className="status-group-label" style={{ color: STATUS_COLORS[status] }}>
                {status.replace('_', ' ')}
              </span>
              <span
                className="status-group-count"
                data-tip={`${group.length} task${group.length !== 1 ? 's' : ''}`}
              >
                {group.length}
              </span>
            </div>
            <div className="task-list">
              {group.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-main">
                    {isSelectMode && (
                      <input
                        type="checkbox"
                        className="task-checkbox"
                        checked={selectedTaskIds.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                      />
                    )}
                    <span className="task-title">{task.title}</span>
                    <span
                      className="task-badge"
                      style={{
                        backgroundColor: PRIORITY_COLORS[task.priority] + '33',
                        color: PRIORITY_COLORS[task.priority],
                      }}
                      data-tip={`Priority: ${task.priority}`}
                    >
                      {task.priority}
                    </span>
                    <span
                      className="task-badge task-category-badge"
                      data-tip={`Category: ${task.category}`}
                    >
                      {task.category}
                    </span>
                  </div>
                  <div className="task-actions">
                    <div className="status-dropdown-wrapper">
                      <button
                        className="status-toggle-btn"
                        style={{
                          borderColor: STATUS_COLORS[task.status],
                          color: STATUS_COLORS[task.status],
                        }}
                        onClick={() => setOpenDropdown(openDropdown === task.id ? null : task.id)}
                        data-tip={`Change status (current: ${task.status.replace('_', ' ')})`}
                      >
                        {task.status.replace('_', ' ')}
                      </button>
                      {openDropdown === task.id && (
                        <div className="status-dropdown">
                          {ALL_STATUSES.map((s) => (
                            <button
                              key={s}
                              className={`status-option ${s === task.status ? 'current' : ''}`}
                              style={{ color: STATUS_COLORS[s] }}
                              onClick={() => {
                                onUpdateTask({ ...task, status: s });
                                setOpenDropdown(null);
                              }}
                            >
                              <span
                                className="status-dot"
                                style={{ backgroundColor: STATUS_COLORS[s] }}
                              />
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="task-delete-btn"
                      onClick={() => onDeleteTask(task.id)}
                      data-tip="Delete"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.71 10.29L10.29 11.71L8 9.41L5.71 11.71L4.29 10.29L6.59 8L4.29 5.71L5.71 4.29L8 6.59L10.29 4.29L11.71 5.71L9.41 8L11.71 10.29Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {orderedStatuses.every((s) => tasksByStatus[s].length === 0) && (
        <div className="empty-section">
          <p>No tasks yet. Create one above!</p>
        </div>
      )}
    </div>
  );
}

function MilestonesTab({
  project,
  milestones,
  tasks,
  onCreateMilestone,
  onDeleteMilestone,
}: {
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
  onCreateMilestone: (
    projectId: string,
    title: string,
    description?: string,
    dueDate?: number
  ) => void;
  onDeleteMilestone: (milestoneId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleAdd = () => {
    if (title.trim()) {
      const due = dueDate ? new Date(dueDate).getTime() : undefined;
      onCreateMilestone(project.id, title.trim(), description.trim() || undefined, due);
      setTitle('');
      setDescription('');
      setDueDate('');
      setShowForm(false);
    }
  };

  const getLinkedTaskCount = (taskIds: string[]) => {
    return taskIds.filter((id) => tasks.some((t) => t.id === id)).length;
  };

  return (
    <div className="milestones-tab">
      {!showForm ? (
        <button
          className="btn-primary add-entity-btn"
          onClick={() => setShowForm(true)}
          data-tip="Create new milestone"
        >
          + New Milestone
        </button>
      ) : (
        <div className="add-milestone-form">
          <input
            type="text"
            className="task-input"
            placeholder="Milestone title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="note-textarea"
            placeholder="Description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <input
            type="date"
            className="task-input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="task-form-actions">
            <button className="btn-primary" onClick={handleAdd}>
              Create
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                setTitle('');
                setDescription('');
                setDueDate('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="empty-section">
          <p>No milestones yet. Create one above!</p>
        </div>
      ) : (
        <div className="milestones-list">
          {milestones.map((ms) => (
            <div key={ms.id} className="milestone-item">
              <div className="milestone-header">
                <span className={`milestone-status-dot ${ms.status}`} />
                <h4 className="milestone-title">{ms.title}</h4>
                <span
                  className="milestone-status-badge"
                  data-tip={`Status: ${ms.status.replace('_', ' ')}`}
                >
                  {ms.status.replace('_', ' ')}
                </span>
                <button
                  className="task-delete-btn"
                  onClick={() => onDeleteMilestone(ms.id)}
                  data-tip="Delete milestone"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.71 10.29L10.29 11.71L8 9.41L5.71 11.71L4.29 10.29L6.59 8L4.29 5.71L5.71 4.29L8 6.59L10.29 4.29L11.71 5.71L9.41 8L11.71 10.29Z" />
                  </svg>
                </button>
              </div>
              {ms.description && <p className="milestone-desc">{ms.description}</p>}
              <div className="milestone-progress">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${ms.progress}%` }} />
                </div>
                <span className="progress-label">
                  {ms.completedTasks}/{ms.totalTasks} tasks
                </span>
              </div>
              <div className="milestone-meta">
                <span className="milestone-linked">
                  {getLinkedTaskCount(ms.taskIds)} linked tasks
                </span>
                {ms.dueDate && (
                  <span className="milestone-due">
                    Due: {new Date(ms.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangelogTab({
  project,
  changelog,
  onCreateChangelog,
  onDeleteChangelog,
}: {
  project: Project;
  changelog: ChangelogEntry[];
  onCreateChangelog: (projectId: string, version: string, changes: Partial<ChangelogEntry>) => void;
  onDeleteChangelog: (changelogId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [version, setVersion] = useState('');
  const [addedText, setAddedText] = useState('');
  const [changedText, setChangedText] = useState('');
  const [fixedText, setFixedText] = useState('');
  const [removedText, setRemovedText] = useState('');
  const [changelogNotes, setChangelogNotes] = useState('');

  const handleAdd = () => {
    if (version.trim()) {
      const changes: Partial<ChangelogEntry> = {};
      if (addedText.trim()) changes.added = addedText.trim().split('\n').filter(Boolean);
      if (changedText.trim()) changes.changed = changedText.trim().split('\n').filter(Boolean);
      if (fixedText.trim()) changes.fixed = fixedText.trim().split('\n').filter(Boolean);
      if (removedText.trim()) changes.removed = removedText.trim().split('\n').filter(Boolean);
      if (changelogNotes.trim()) changes.notes = changelogNotes.trim();
      onCreateChangelog(project.id, version.trim(), changes);
      setVersion('');
      setAddedText('');
      setChangedText('');
      setFixedText('');
      setRemovedText('');
      setChangelogNotes('');
      setShowForm(false);
    }
  };

  const sorted = useMemo(() => [...changelog].sort((a, b) => b.date - a.date), [changelog]);

  return (
    <div className="changelog-tab">
      {!showForm ? (
        <button
          className="btn-primary add-entity-btn"
          onClick={() => setShowForm(true)}
          data-tip="Create changelog entry"
        >
          + New Entry
        </button>
      ) : (
        <div className="add-changelog-form">
          <input
            type="text"
            className="task-input"
            placeholder="Version (e.g. 1.2.0)..."
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            autoFocus
          />
          <textarea
            className="note-textarea"
            placeholder="Added (one per line)..."
            value={addedText}
            onChange={(e) => setAddedText(e.target.value)}
            rows={2}
          />
          <textarea
            className="note-textarea"
            placeholder="Changed (one per line)..."
            value={changedText}
            onChange={(e) => setChangedText(e.target.value)}
            rows={2}
          />
          <textarea
            className="note-textarea"
            placeholder="Fixed (one per line)..."
            value={fixedText}
            onChange={(e) => setFixedText(e.target.value)}
            rows={2}
          />
          <textarea
            className="note-textarea"
            placeholder="Removed (one per line)..."
            value={removedText}
            onChange={(e) => setRemovedText(e.target.value)}
            rows={2}
          />
          <textarea
            className="note-textarea"
            placeholder="Notes..."
            value={changelogNotes}
            onChange={(e) => setChangelogNotes(e.target.value)}
            rows={2}
          />
          <div className="task-form-actions">
            <button className="btn-primary" onClick={handleAdd}>
              Create
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                setVersion('');
                setAddedText('');
                setChangedText('');
                setFixedText('');
                setRemovedText('');
                setChangelogNotes('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="empty-section">
          <p>No changelog entries yet. Create one above!</p>
        </div>
      ) : (
        <div className="changelog-list">
          {sorted.map((entry) => (
            <div key={entry.id} className="changelog-item">
              <div className="changelog-header">
                {entry.version && (
                  <span className="changelog-version" data-tip={`Version ${entry.version}`}>
                    {entry.version}
                  </span>
                )}
                <span className="changelog-date" data-tip={new Date(entry.date).toLocaleString()}>
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                <button
                  className="task-delete-btn"
                  onClick={() => onDeleteChangelog(entry.id)}
                  data-tip="Delete changelog entry"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.71 10.29L10.29 11.71L8 9.41L5.71 11.71L4.29 10.29L6.59 8L4.29 5.71L5.71 4.29L8 6.59L10.29 4.29L11.71 5.71L9.41 8L11.71 10.29Z" />
                  </svg>
                </button>
              </div>
              <div className="changelog-sections">
                {entry.added && entry.added.length > 0 && (
                  <div className="changelog-section">
                    <span className="section-label section-added">Added</span>
                    <ul className="section-list">
                      {entry.added.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.changed && entry.changed.length > 0 && (
                  <div className="changelog-section">
                    <span className="section-label section-changed">Changed</span>
                    <ul className="section-list">
                      {entry.changed.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.fixed && entry.fixed.length > 0 && (
                  <div className="changelog-section">
                    <span className="section-label section-fixed">Fixed</span>
                    <ul className="section-list">
                      {entry.fixed.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.removed && entry.removed.length > 0 && (
                  <div className="changelog-section">
                    <span className="section-label section-removed">Removed</span>
                    <ul className="section-list">
                      {entry.removed.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.notes && <p className="changelog-notes">{entry.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab({
  project,
  notes,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: {
  project: Project;
  notes: Note[];
  onCreateNote: (projectId: string, title: string, content: string) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = () => {
    if (newTitle.trim()) {
      onCreateNote(project.id, newTitle.trim(), newContent);
      setNewTitle('');
      setNewContent('');
      setShowForm(false);
    }
  };

  return (
    <div className="notes-tab">
      {!showForm ? (
        <button
          className="btn-primary add-entity-btn"
          onClick={() => setShowForm(true)}
          data-tip="Create new note"
        >
          + New Note
        </button>
      ) : (
        <div className="note-form">
          <input
            type="text"
            className="note-input"
            placeholder="Note title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="note-textarea"
            placeholder="Note content..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
          />
          <div className="note-form-actions">
            <button className="btn-primary" onClick={handleAdd}>
              Save
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                setNewTitle('');
                setNewContent('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="empty-section">
          <p>No notes yet. Create one above!</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className="note-item">
              <div className="note-header">
                <h4 className="note-title">{note.title}</h4>
                <div className="note-actions">
                  <button
                    className="note-action-btn"
                    onClick={() => {
                      if (editingNote === note.id) {
                        onUpdateNote({ ...note, content: editContent });
                        setEditingNote(null);
                      } else {
                        setEditingNote(note.id);
                        setEditContent(note.content);
                      }
                    }}
                    data-tip={editingNote === note.id ? 'Save' : 'Edit'}
                  >
                    {editingNote === note.id ? (
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.067.108l-.97 3.394 3.394-.97a.249.249 0 00.108-.067L11.19 6.25z" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="note-action-btn danger"
                    onClick={() => onDeleteNote(note.id)}
                    data-tip="Delete"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.71 10.29L10.29 11.71L8 9.41L5.71 11.71L4.29 10.29L6.59 8L4.29 5.71L5.71 4.29L8 6.59L10.29 4.29L11.71 5.71L9.41 8L11.71 10.29Z" />
                    </svg>
                  </button>
                </div>
              </div>
              {editingNote === note.id ? (
                <textarea
                  className="note-edit-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  autoFocus
                />
              ) : (
                <p className="note-content">{note.content || 'No content'}</p>
              )}
              <span className="note-date">{new Date(note.updatedAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
