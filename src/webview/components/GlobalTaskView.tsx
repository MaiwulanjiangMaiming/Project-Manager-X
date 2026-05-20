import React, { useState, useMemo } from 'react';
import {
  Task,
  Project,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  STATUS_COLORS,
  PRIORITY_COLORS,
  LIFECYCLE_COLORS,
} from '../../types';

const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

const ALL_STATUSES: TaskStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'review',
  'done',
  'blocked',
  'cancelled',
];

const CATEGORY_EMOJI: Record<TaskCategory, string> = {
  bug: '🐛',
  feature: '✨',
  refactor: '🔧',
  docs: '📄',
  research: '🔬',
  chore: '🧹',
  experiment: '🧪',
};

interface GlobalTaskViewProps {
  tasks: Task[];
  projects: Project[];
  onBack: () => void;
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
}

type FilterMode = 'all' | 'today' | 'blocked' | 'in_progress';

export default function GlobalTaskView({
  tasks,
  projects,
  onBack,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onBatchDeleteTasks,
  onBatchUpdateTaskStatus,
}: GlobalTaskViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('feature');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newProjectId, setNewProjectId] = useState<string>(projects[0]?.id ?? '');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchStatusDropdownOpen, setBatchStatusDropdownOpen] = useState(false);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

    switch (activeFilter) {
      case 'today':
        return tasks.filter(
          (t) => t.dueDate != null && t.dueDate >= todayStart && t.dueDate <= todayEnd
        );
      case 'blocked':
        return tasks.filter((t) => t.status === 'blocked');
      case 'in_progress':
        return tasks.filter((t) => t.status === 'in_progress');
      default:
        return tasks;
    }
  }, [tasks, activeFilter]);

  const groupedByPriority = useMemo(() => {
    const groups = new Map<TaskPriority, Task[]>();
    for (const priority of PRIORITY_ORDER) {
      groups.set(priority, []);
    }
    for (const task of filteredTasks) {
      groups.get(task.priority)?.push(task);
    }
    return groups;
  }, [filteredTasks]);

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    onUpdateTask({ ...task, status: newStatus, updatedAt: Date.now() });
    setStatusDropdownTaskId(null);
  };

  const handleCreateTask = () => {
    if (newTitle.trim() && newProjectId) {
      onCreateTask(newProjectId, newTitle.trim(), newCategory, newPriority);
      setNewTitle('');
      setShowCreateForm(false);
    }
  };

  const formatDueDate = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days}d`;
    return date.toLocaleDateString();
  };

  const isOverdue = (task: Task) => {
    return (
      task.dueDate != null &&
      task.dueDate < Date.now() &&
      task.status !== 'done' &&
      task.status !== 'cancelled'
    );
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => !prev);
    setSelectedTaskIds(new Set());
    setBatchStatusDropdownOpen(false);
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
    setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)));
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

  const handleBatchStatusChange = (status: TaskStatus) => {
    if (selectedTaskIds.size > 0) {
      onBatchUpdateTaskStatus(Array.from(selectedTaskIds), status);
      setBatchStatusDropdownOpen(false);
    }
  };

  return (
    <div className="global-task-view">
      <div className="detail-header">
        <div className="detail-header-top">
          <button className="back-btn" onClick={onBack} data-tip="Back to projects">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" />
            </svg>
          </button>
          <div className="detail-title">
            <h3>All Tasks</h3>
          </div>
          <div className="detail-header-actions">
            <button
              className={`manage-toggle-btn ${isSelectMode ? 'active' : ''}`}
              onClick={toggleSelectMode}
              data-tip={isSelectMode ? 'Exit manage mode' : 'Manage tasks'}
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {isSelectMode ? 'Done' : 'Manage'}
            </button>
            <button
              className="open-project-btn"
              onClick={() => setShowCreateForm(!showCreateForm)}
              data-tip="Create task"
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="detail-header-bottom">
          <span className="detail-path">
            {filteredTasks.length} tasks across {projects.length} projects
          </span>
        </div>
      </div>

      {isSelectMode && (
        <div className="batch-action-bar">
          <div className="batch-action-left">
            <button className="batch-action-btn" onClick={selectAll} data-tip="Select all tasks">
              Select All
            </button>
            <button
              className="batch-action-btn"
              onClick={deselectAll}
              data-tip="Deselect all tasks"
            >
              Deselect All
            </button>
            <span className="batch-selected-badge">{selectedTaskIds.size} selected</span>
          </div>
          <div className="batch-action-right">
            <div className="batch-status-dropdown-wrapper">
              <button
                className="batch-action-btn batch-status-btn"
                onClick={() => setBatchStatusDropdownOpen((prev) => !prev)}
                disabled={selectedTaskIds.size === 0}
                data-tip="Set status for selected tasks"
              >
                Set Status
              </button>
              {batchStatusDropdownOpen && selectedTaskIds.size > 0 && (
                <div className="batch-status-dropdown">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      className="batch-status-option"
                      style={{ color: STATUS_COLORS[s] }}
                      onClick={() => handleBatchStatusChange(s)}
                    >
                      <span className="group-dot" style={{ backgroundColor: STATUS_COLORS[s] }} />
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="batch-action-btn batch-delete-btn"
              onClick={handleBatchDelete}
              disabled={selectedTaskIds.size === 0}
              data-tip="Delete selected tasks"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="global-task-create-form">
          <div className="create-form-row">
            <select
              className="create-form-select"
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="todo-input"
              placeholder="Task title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              autoFocus
            />
          </div>
          <div className="create-form-row">
            <select
              className="create-form-select"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
            >
              {(
                [
                  'bug',
                  'feature',
                  'refactor',
                  'docs',
                  'research',
                  'chore',
                  'experiment',
                ] as TaskCategory[]
              ).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_EMOJI[c]} {c}
                </option>
              ))}
            </select>
            <select
              className="create-form-select"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            >
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={handleCreateTask}>
              Create
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowCreateForm(false);
                setNewTitle('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="global-task-filters">
        {[
          { key: 'all' as FilterMode, label: 'All' },
          { key: 'today' as FilterMode, label: 'Today Due' },
          { key: 'blocked' as FilterMode, label: 'Blocked' },
          { key: 'in_progress' as FilterMode, label: 'In Progress' },
        ].map((f) => (
          <button
            key={f.key}
            className={`detail-tab ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="global-task-content">
        {filteredTasks.length === 0 ? (
          <div className="empty-section">
            <p>No tasks match the current filter.</p>
          </div>
        ) : (
          PRIORITY_ORDER.map((priority) => {
            const group = groupedByPriority.get(priority);
            if (!group || group.length === 0) return null;
            return (
              <div key={priority} className="global-task-priority-group">
                <div className="project-group-header" style={{ color: PRIORITY_COLORS[priority] }}>
                  <span
                    className="group-dot"
                    style={{ backgroundColor: PRIORITY_COLORS[priority] }}
                  />
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  <span
                    className="group-count"
                    data-tip={`${group.length} task${group.length !== 1 ? 's' : ''}`}
                  >
                    {group.length}
                  </span>
                </div>
                <div className="global-task-list">
                  {group.map((task) => {
                    const project = projectMap.get(task.projectId);
                    const dropdownOpen = statusDropdownTaskId === task.id;
                    const isSelected = selectedTaskIds.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`global-task-item ${isOverdue(task) ? 'overdue' : ''} ${task.status === 'done' ? 'completed' : ''} ${isSelectMode && isSelected ? 'selected' : ''}`}
                        onClick={isSelectMode ? () => toggleTaskSelection(task.id) : undefined}
                        style={isSelectMode ? { cursor: 'pointer' } : undefined}
                      >
                        {isSelectMode && (
                          <div
                            className="global-task-checkbox"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={`custom-checkbox ${isSelected ? 'checked' : ''}`}
                              onClick={() => toggleTaskSelection(task.id)}
                            >
                              {isSelected && (
                                <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                        <div
                          className="global-task-priority-indicator"
                          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                        />
                        <div className="global-task-body">
                          <div className="global-task-top-row">
                            <span
                              className="global-task-project-badge"
                              style={{
                                backgroundColor:
                                  (project ? LIFECYCLE_COLORS[project.lifecycle] : '#858585') +
                                  '22',
                                color: project ? LIFECYCLE_COLORS[project.lifecycle] : '#858585',
                              }}
                            >
                              {project?.name ?? 'Unknown'}
                            </span>
                            <span className="global-task-title">{task.title}</span>
                          </div>
                          <div className="global-task-badges">
                            <span
                              className="global-task-category-badge"
                              style={{
                                backgroundColor: STATUS_COLORS[task.status] + '22',
                                color: STATUS_COLORS[task.status],
                              }}
                            >
                              {CATEGORY_EMOJI[task.category]} {task.category}
                            </span>
                            {task.dueDate != null && (
                              <span
                                className={`global-task-due ${isOverdue(task) ? 'overdue-text' : ''}`}
                              >
                                {formatDueDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="global-task-status-area">
                          <button
                            className="global-task-status-btn"
                            style={{
                              backgroundColor: STATUS_COLORS[task.status] + '33',
                              color: STATUS_COLORS[task.status],
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusDropdownTaskId(dropdownOpen ? null : task.id);
                            }}
                            data-tip={`Change status (current: ${task.status.replace('_', ' ')})`}
                          >
                            {task.status.replace('_', ' ')}
                          </button>
                          {dropdownOpen && (
                            <div className="global-task-status-dropdown">
                              {ALL_STATUSES.map((s) => (
                                <button
                                  key={s}
                                  className={`global-task-status-option ${s === task.status ? 'current' : ''}`}
                                  style={{ color: STATUS_COLORS[s] }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(task, s);
                                  }}
                                >
                                  <span
                                    className="group-dot"
                                    style={{ backgroundColor: STATUS_COLORS[s] }}
                                  />
                                  {s.replace('_', ' ')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          className="global-task-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id);
                          }}
                          data-tip="Delete task"
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
