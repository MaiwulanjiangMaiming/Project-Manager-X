/**
 * Project Manager X
 * Copyright (c) 2026 Maiwulanjiang Maiming <mawlan.momin@gmail.com>
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, Task, TaskStatus, Milestone, Note, Tag } from '../types';
import { useProjectStore } from './store/useProjectStore';
import { rpc } from './rpc/webviewRPC';
import SearchBar from './components/SearchBar';
import TagFilter from './components/TagFilter';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import EmptyState from './components/EmptyState';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initTooltip } from './utils/tooltip';
import './styles/global.css';

let GlobalTaskView: React.ComponentType<any> | null = null;
try {
  GlobalTaskView = require('./components/GlobalTaskView').default;
} catch {
  GlobalTaskView = null;
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as any;
}

export default function App() {
  const projects = useProjectStore((s) => s.projects);
  const tasks = useProjectStore((s) => s.tasks);
  const milestones = useProjectStore((s) => s.milestones);
  const changelog = useProjectStore((s) => s.changelog);
  const snapshots = useProjectStore((s) => s.snapshots);
  const notes = useProjectStore((s) => s.notes);
  const tags = useProjectStore((s) => s.tags);
  const settings = useProjectStore((s) => s.settings);
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId);
  const searchQuery = useProjectStore((s) => s.searchQuery);
  const selectedTag = useProjectStore((s) => s.selectedTag);
  const sortBy = useProjectStore((s) => s.sortBy);
  const viewMode = useProjectStore((s) => s.viewMode);
  const showGlobalTasks = useProjectStore((s) => s.showGlobalTasks);
  const isLoading = useProjectStore((s) => s.isLoading);

  const selectProject = useProjectStore((s) => s.selectProject);
  const setSearchQuery = useProjectStore((s) => s.setSearchQuery);
  const setSelectedTag = useProjectStore((s) => s.setSelectedTag);
  const setSortBy = useProjectStore((s) => s.setSortBy);
  const setViewMode = useProjectStore((s) => s.setViewMode);
  const setShowGlobalTasks = useProjectStore((s) => s.setShowGlobalTasks);
  const setLoading = useProjectStore((s) => s.setLoading);
  const loadState = useProjectStore((s) => s.loadState);
  const isManageMode = useProjectStore((s) => s.isManageMode);
  const selectedProjectIds = useProjectStore((s) => s.selectedProjectIds);
  const toggleManageMode = useProjectStore((s) => s.toggleManageMode);
  const toggleProjectSelection = useProjectStore((s) => s.toggleProjectSelection);
  const selectAllProjects = useProjectStore((s) => s.selectAllProjects);
  const deselectAllProjects = useProjectStore((s) => s.deselectAllProjects);
  const exitManageMode = useProjectStore((s) => s.exitManageMode);

  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [inputSearchValue, setInputSearchValue] = useState('');

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.path.toLowerCase().includes(query) ||
          p.tags.some((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            return tag?.name.toLowerCase().includes(query);
          })
      );
    }
    if (selectedTag) {
      result = result.filter((p) => p.tags.includes(selectedTag));
    }
    if (sortBy !== 'custom') {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'path':
            return a.path.localeCompare(b.path);
          case 'recent':
            return (b.lastOpened || 0) - (a.lastOpened || 0);
          default:
            return 0;
        }
      });
    }
    return result;
  }, [projects, tags, searchQuery, selectedTag, sortBy]);

  useEffect(() => {
    const cleanupTooltip = initTooltip();
    return cleanupTooltip;
  }, []);

  useEffect(() => {
    rpc.send('ready');
  }, []);

  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const el = e.target as HTMLElement;
      const item = el.closest('.project-item');
      if (item) {
        const id = item.getAttribute('data-project-id');
        if (id) setDraggedProjectId(id);
      }
    };
    const handleDragEnd = () => {
      setDraggedProjectId(null);
    };
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'stateUpdated') {
        loadState(message.data);
        setLoading(false);
      }
      if (message.type === 'themeChange') {
        const kind = message.data.kind;
        const isDark = kind === 1 || kind === 3; // dark or high contrast dark
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
      if (message._rpcId) {
        rpc.handleResponse(message._rpcId, message.data, message.error);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadState, setLoading]);

  const debouncedSetSearchQuery = useMemo(
    () => debounce((q: string) => setSearchQuery(q), 300),
    [setSearchQuery]
  );

  const sendMessage = useCallback((type: string, data?: any) => {
    rpc.send(type, data);
  }, []);

  const handleOpenProject = useCallback(
    (projectId: string) => {
      sendMessage('openProject', { projectId });
    },
    [sendMessage]
  );

  const handleOpenInNewWindow = useCallback(
    (projectId: string) => {
      sendMessage('openInNewWindow', { projectId });
    },
    [sendMessage]
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      sendMessage('deleteProject', { projectId });
    },
    [sendMessage]
  );

  const handleUpdateProject = useCallback(
    (project: Project) => {
      sendMessage('updateProject', { project });
    },
    [sendMessage]
  );

  const handleReorderProjects = useCallback(
    (reorderedProjects: Project[], _autoSwitchToCustom?: boolean) => {
      const store = useProjectStore.getState();
      const allProjects = store.projects;
      const reorderedIds = new Set(reorderedProjects.map((p) => p.id));
      const untouched = allProjects.filter((p) => !reorderedIds.has(p.id));
      const finalProjects = [...reorderedProjects, ...untouched];
      useProjectStore.setState({ projects: finalProjects, sortBy: 'custom' });
      sendMessage('reorderProjects', { projects: reorderedProjects });
    },
    [sendMessage]
  );

  const handleMoveProjectToTag = useCallback(
    (projectId: string, tagId: string) => {
      sendMessage('moveProjectToTag', { projectId, tagId });
    },
    [sendMessage]
  );

  const handleRemoveProjectFromTag = useCallback(
    (projectId: string, tagId: string) => {
      sendMessage('removeProjectFromTag', { projectId, tagId });
    },
    [sendMessage]
  );

  const handleAddTag = useCallback(
    (name: string, color: string) => {
      sendMessage('addTag', { name, color });
    },
    [sendMessage]
  );

  const handleUpdateTag = useCallback(
    (tag: Tag) => {
      sendMessage('updateTag', { tag });
    },
    [sendMessage]
  );

  const handleDeleteTag = useCallback(
    (tagId: string) => {
      sendMessage('deleteTag', { tagId });
    },
    [sendMessage]
  );

  const handleReorderTags = useCallback(
    (tags: Tag[]) => {
      sendMessage('reorderTags', { tags });
    },
    [sendMessage]
  );

  const handleShowInFolder = useCallback(
    (projectId: string) => {
      sendMessage('showInFolder', { projectId });
    },
    [sendMessage]
  );

  const handleAddToWorkspace = useCallback(
    (projectId: string) => {
      sendMessage('addToWorkspace', { projectId });
    },
    [sendMessage]
  );

  const handleRefresh = useCallback(() => {
    sendMessage('refreshProjects');
  }, [sendMessage]);

  const handleAddDetectFolder = useCallback(() => {
    sendMessage('addDetectFolder');
  }, [sendMessage]);

  const handleEditProjectsFile = useCallback(() => {
    sendMessage('editProjectsFile');
  }, [sendMessage]);

  const handleImportFromProjectManager = useCallback(() => {
    sendMessage('importFromProjectManager');
  }, [sendMessage]);

  const handleCreateTask = useCallback(
    (projectId: string, task: Partial<Task>) => {
      sendMessage('createTask', { projectId, ...task });
    },
    [sendMessage]
  );

  const handleUpdateTask = useCallback(
    (task: Task) => {
      sendMessage('updateTask', { task });
    },
    [sendMessage]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      sendMessage('deleteTask', { taskId });
    },
    [sendMessage]
  );

  const handleBatchDeleteTasks = useCallback(
    (taskIds: string[]) => {
      sendMessage('batchDeleteTasks', { taskIds });
    },
    [sendMessage]
  );

  const handleBatchUpdateTaskStatus = useCallback(
    (taskIds: string[], status: TaskStatus) => {
      sendMessage('batchUpdateTaskStatus', { taskIds, status });
    },
    [sendMessage]
  );

  const handleUpdateMilestone = useCallback(
    (milestone: Milestone) => {
      sendMessage('updateMilestone', { milestone });
    },
    [sendMessage]
  );

  const handleDeleteMilestone = useCallback(
    (milestoneId: string) => {
      sendMessage('deleteMilestone', { milestoneId });
    },
    [sendMessage]
  );

  const handleDeleteChangelog = useCallback(
    (entryId: string) => {
      sendMessage('deleteChangelog', { entryId });
    },
    [sendMessage]
  );

  const handleCreateNote = useCallback(
    (projectId: string, title: string, content: string) => {
      sendMessage('createNote', { projectId, title, content });
    },
    [sendMessage]
  );

  const handleUpdateNote = useCallback(
    (note: Note) => {
      sendMessage('updateNote', { note });
    },
    [sendMessage]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      sendMessage('deleteNote', { noteId });
    },
    [sendMessage]
  );

  const handleOpenProjectDetail = useCallback(
    (projectId: string) => {
      selectProject(projectId);
    },
    [selectProject]
  );

  const handleShowGlobalTasksView = useCallback(() => {
    setShowGlobalTasks(true);
  }, [setShowGlobalTasks]);

  const handleBackToList = useCallback(() => {
    selectProject(null);
    setShowGlobalTasks(false);
    exitManageMode();
  }, [selectProject, setShowGlobalTasks, exitManageMode]);

  const handleBatchDeleteProjects = useCallback(() => {
    if (selectedProjectIds.size === 0) return;
    sendMessage('batchDeleteProjects', { projectIds: Array.from(selectedProjectIds) });
    exitManageMode();
  }, [sendMessage, selectedProjectIds, exitManageMode]);

  const selectedProjectData = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  const appContent = (() => {
    if (isLoading) {
      return (
        <div className="app">
          <div className="app-header">
            <div className="skeleton skeleton-search" />
            <div className="skeleton skeleton-tags" />
          </div>
          <div className="app-content">
            <div className="skeleton skeleton-list" />
          </div>
        </div>
      );
    }

    if (showGlobalTasks) {
      if (GlobalTaskView) {
        return (
          <GlobalTaskView
            tasks={tasks}
            projects={projects}
            tags={tags}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onBatchDeleteTasks={handleBatchDeleteTasks}
            onBatchUpdateTaskStatus={handleBatchUpdateTaskStatus}
            onOpenProjectDetail={handleOpenProjectDetail}
            onBack={handleBackToList}
          />
        );
      }
      return (
        <div className="app">
          <div className="app-header">
            <button className="btn-secondary" onClick={handleBackToList}>
              ← Back to Projects
            </button>
          </div>
          <div className="app-content">
            <div className="empty-state">
              <p className="empty-title">Global Tasks</p>
              <p className="empty-subtitle">GlobalTaskView component is not available yet.</p>
            </div>
          </div>
        </div>
      );
    }

    if (selectedProjectData) {
      return (
        <ProjectDetail
          project={selectedProjectData}
          tasks={tasks}
          milestones={milestones}
          changelog={changelog}
          snapshots={snapshots}
          notes={notes}
          tags={tags}
          onBack={handleBackToList}
          onOpenProject={handleOpenProject}
          onUpdateProject={handleUpdateProject}
          onCreateTask={(projectId, title, category, priority) =>
            sendMessage('createTask', { projectId, title, category, priority })
          }
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onBatchDeleteTasks={handleBatchDeleteTasks}
          onBatchUpdateTaskStatus={handleBatchUpdateTaskStatus}
          onCreateMilestone={(projectId, title, description, dueDate) =>
            sendMessage('createMilestone', { projectId, title, description, dueDate })
          }
          onUpdateMilestone={handleUpdateMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onCreateChangelog={(projectId, version, changes) =>
            sendMessage('createChangelog', { projectId, version, ...changes })
          }
          onDeleteChangelog={handleDeleteChangelog}
          onCreateNote={handleCreateNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
        />
      );
    }

    return (
      <div className="app">
        <div className="app-header">
          <SearchBar
            value={inputSearchValue}
            onChange={(v) => {
              setInputSearchValue(v);
              debouncedSetSearchQuery(v);
            }}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onRefresh={handleRefresh}
            onSaveCurrentProject={() => sendMessage('saveProject')}
            onAddDetectFolder={handleAddDetectFolder}
            onEditProjectsFile={handleEditProjectsFile}
            onImportFromProjectManager={handleImportFromProjectManager}
          />
          <TagFilter
            tags={tags}
            projects={projects}
            draggedProjectId={draggedProjectId}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            onAddTag={handleAddTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
            onReorderTags={handleReorderTags}
            onDropProject={(projectId: string, tagId: string) => {
              handleMoveProjectToTag(projectId, tagId);
            }}
            onRemoveProjectFromTag={(projectId: string, tagId: string) => {
              handleRemoveProjectFromTag(projectId, tagId);
            }}
          />
        </div>
        <div className="app-content">
          <div
            className="global-tasks-bar"
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            <button
              className="btn-secondary global-tasks-btn"
              onClick={handleShowGlobalTasksView}
              data-tip="View all tasks across projects"
              data-tip-pos="bottom"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                <path d="M2 3.75A.75.75 0 012.75 3h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4A.75.75 0 012.75 7h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 7.75zm0 4a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" />
              </svg>
              Global Tasks
            </button>
            <button
              className={`manage-toggle-btn ${isManageMode ? 'active' : ''}`}
              onClick={toggleManageMode}
              data-tip={isManageMode ? 'Exit manage mode' : 'Manage projects'}
              data-tip-pos="bottom"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {isManageMode ? 'Done' : 'Manage'}
            </button>
          </div>
          {isManageMode && (
            <div className="batch-action-bar">
              <div className="batch-action-left">
                <button
                  className="batch-action-btn"
                  onClick={() => selectAllProjects(filteredProjects.map((p) => p.id))}
                >
                  Select All
                </button>
                <button className="batch-action-btn" onClick={deselectAllProjects}>
                  Deselect All
                </button>
                <span className="batch-selected-badge">{selectedProjectIds.size} selected</span>
              </div>
              <div className="batch-action-right">
                <button
                  className="batch-action-btn batch-delete-btn"
                  onClick={handleBatchDeleteProjects}
                  disabled={selectedProjectIds.size === 0}
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}
          {filteredProjects.length === 0 ? (
            <EmptyState
              hasProjects={projects.length > 0}
              searchQuery={searchQuery}
              onAddDetectFolder={handleAddDetectFolder}
              onImportFromProjectManager={handleImportFromProjectManager}
            />
          ) : (
            <ProjectList
              projects={filteredProjects}
              tags={tags}
              groupByTag={settings.groupByTag && !selectedTag && !searchQuery}
              viewMode={viewMode}
              isManageMode={isManageMode}
              selectedProjectIds={selectedProjectIds}
              onToggleProjectSelection={toggleProjectSelection}
              onOpenProject={handleOpenProject}
              onOpenInNewWindow={handleOpenInNewWindow}
              onDeleteProject={handleDeleteProject}
              onUpdateProject={handleUpdateProject}
              onReorderProjects={handleReorderProjects}
              onShowInFolder={handleShowInFolder}
              onAddToWorkspace={handleAddToWorkspace}
              onOpenDetail={handleOpenProjectDetail}
            />
          )}
        </div>
        <div className="app-footer">
          <span className="footer-info">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
          <div className="footer-settings-wrapper">
            <button
              className="footer-settings-btn"
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              data-tip="Settings & Info"
              data-tip-pos="left"
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.8-.8-1.3-2 .3-.7 2.4-.5V7.4l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM8 10a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showSettingsPanel && (
              <div className="settings-panel">
                <div className="settings-panel-header">
                  <span>Project Manager X</span>
                  <button
                    className="settings-panel-close"
                    onClick={() => setShowSettingsPanel(false)}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                      <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.71 10.29L10.29 11.71L8 9.41L5.71 11.71L4.29 10.29L6.59 8L4.29 5.71L5.71 4.29L8 6.59L10.29 4.29L11.71 5.71L9.41 8L11.71 10.29Z" />
                    </svg>
                  </button>
                </div>
                <div className="settings-panel-body">
                  <div className="settings-item">
                    <span className="settings-label">Version</span>
                    <span className="settings-value">1.0.0</span>
                  </div>
                  <div className="settings-item">
                    <span className="settings-label">GitHub</span>
                    <a
                      className="settings-link"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        rpc.send('openExternal', {
                          url: 'https://github.com/MaiwulanjiangMaiming/Project-Manager-X',
                        });
                      }}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        width="12"
                        height="12"
                        style={{ marginRight: '4px', verticalAlign: 'middle' }}
                      >
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                      </svg>
                      Project-Manager-X
                    </a>
                  </div>
                  <div className="settings-item">
                    <span className="settings-label">Get Started</span>
                    <a
                      className="settings-link"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        rpc.send('openExternal', {
                          url: 'https://github.com/MaiwulanjiangMaiming/Project-Manager-X#getting-started',
                        });
                      }}
                    >
                      Documentation
                    </a>
                  </div>
                  <div className="settings-item">
                    <span className="settings-label">Report Issue</span>
                    <a
                      className="settings-link"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        rpc.send('openExternal', {
                          url: 'https://github.com/MaiwulanjiangMaiming/Project-Manager-X/issues/new',
                        });
                      }}
                    >
                      Open GitHub Issue
                    </a>
                  </div>
                  <div className="settings-item">
                    <span className="settings-label">Feedback</span>
                    <a
                      className="settings-link"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        rpc.send('openExternal', {
                          url: 'mailto:mawlan.momin@gmail.com?subject=Project%20Manager%20X%20Feedback',
                        });
                      }}
                    >
                      mawlan.momin@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return <ErrorBoundary>{appContent}</ErrorBoundary>;
}
