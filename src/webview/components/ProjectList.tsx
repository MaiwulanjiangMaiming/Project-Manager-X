import React, { useState, memo } from 'react';
import { Project, Tag } from '../../types';
import ProjectCard from './ProjectCard';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

interface ProjectListProps {
  projects: Project[];
  tags: Tag[];
  groupByTag: boolean;
  viewMode: 'detailed' | 'compact';
  isManageMode?: boolean;
  selectedProjectIds?: Set<string>;
  currentWorkspacePath?: string | null;
  onToggleProjectSelection?: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenInNewWindow: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProject: (project: Project) => void;
  onReorderProjects: (projects: Project[], autoSwitchToCustom?: boolean) => void;
  onShowInFolder: (projectId: string) => void;
  onAddToWorkspace: (projectId: string) => void;
  onOpenDetail: (projectId: string) => void;
}

function ProjectList({
  projects,
  tags,
  groupByTag,
  viewMode,
  isManageMode,
  selectedProjectIds,
  currentWorkspacePath,
  onToggleProjectSelection,
  onOpenProject,
  onOpenInNewWindow,
  onDeleteProject,
  onUpdateProject,
  onReorderProjects,
  onShowInFolder,
  onAddToWorkspace,
  onOpenDetail,
}: ProjectListProps) {
  const [draggedProject, setDraggedProject] = useState<string | null>(null);

  const flatProjects = groupByTag
    ? tags
        .flatMap((tag) => projects.filter((p) => p.tags.includes(tag.id)))
        .concat(projects.filter((p) => p.tags.length === 0))
    : projects;

  const { focusedIndex, setFocusedIndex } = useKeyboardNav({
    itemCount: flatProjects.length,
    onSelect: (i) => onOpenProject(flatProjects[i].id),
    onSecondarySelect: (i) => onOpenInNewWindow(flatProjects[i].id),
    onDelete: (i) => onDeleteProject(flatProjects[i].id),
  });

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId);
    e.dataTransfer.setData('project', projectId);
    e.dataTransfer.effectAllowed = 'move';
    // Add drag ghost styling after a frame
    window.requestAnimationFrame(() => {
      const el = document.querySelector(`[data-project-id="${projectId}"]`);
      if (el) el.classList.add('dragging');
    });
  };

  const handleDragOver = (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    if (draggedProject && draggedProject !== targetProjectId) {
      const element = e.currentTarget as HTMLElement;
      const rect = element.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      // Show drop indicator above or below based on cursor position
      if (e.clientY < midY) {
        element.classList.add('drop-above');
        element.classList.remove('drop-below');
      } else {
        element.classList.add('drop-below');
        element.classList.remove('drop-above');
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('drop-above', 'drop-below');
  };

  const handleDrop = (e: React.DragEvent, targetProjectId: string) => {
    e.preventDefault();
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('drop-above', 'drop-below');

    if (draggedProject && draggedProject !== targetProjectId) {
      const newProjects = [...projects];
      const draggedIndex = newProjects.findIndex((p) => p.id === draggedProject);
      const targetIndex = newProjects.findIndex((p) => p.id === targetProjectId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = newProjects.splice(draggedIndex, 1);
        const rect = element.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1;
        newProjects.splice(insertIndex > draggedIndex ? insertIndex - 1 : insertIndex, 0, removed);
        onReorderProjects(newProjects, true);
      }
    }
    // Clean up dragging class
    document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
    setDraggedProject(null);
  };

  const handleDragEnd = () => {
    document.querySelectorAll('.dragging, .drop-above, .drop-below').forEach((el) => {
      el.classList.remove('dragging', 'drop-above', 'drop-below');
    });
    setDraggedProject(null);
  };

  const renderProjectCard = (project: Project, index: number) => (
    <div
      key={project.id}
      className={`project-item ${viewMode === 'compact' ? 'compact-mode' : ''} ${index === focusedIndex ? 'focused' : ''}`}
      data-project-id={project.id}
      draggable
      onDragStart={(e) => handleDragStart(e, project.id)}
      onDragOver={(e) => handleDragOver(e, project.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, project.id)}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setFocusedIndex(index)}
    >
      <ProjectCard
        project={project}
        tags={tags}
        viewMode={viewMode}
        isManageMode={isManageMode}
        isSelected={selectedProjectIds?.has(project.id) ?? false}
        isCurrentWorkspace={currentWorkspacePath === project.path}
        onToggleSelection={onToggleProjectSelection}
        onOpenProject={onOpenProject}
        onOpenInNewWindow={onOpenInNewWindow}
        onDeleteProject={onDeleteProject}
        onUpdateProject={onUpdateProject}
        onShowInFolder={onShowInFolder}
        onAddToWorkspace={onAddToWorkspace}
        onOpenDetail={onOpenDetail}
      />
    </div>
  );

  if (groupByTag) {
    const untagged = projects.filter((p) => p.tags.length === 0);
    const taggedGroups = tags
      .map((tag) => ({
        tag,
        projects: projects.filter((p) => p.tags.includes(tag.id)),
      }))
      .filter((g) => g.projects.length > 0);

    let runningIndex = 0;

    return (
      <div className="project-list grouped">
        {taggedGroups.map(({ tag, projects: tagProjects }) => {
          const startIdx = runningIndex;
          runningIndex += tagProjects.length;
          return (
            <div key={tag.id} className="project-group">
              <div className="project-group-header" style={{ color: tag.color }}>
                <span className="group-dot" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <span
                  className="group-count"
                  data-tip={`${tagProjects.length} project${tagProjects.length !== 1 ? 's' : ''}`}
                >
                  {tagProjects.length}
                </span>
              </div>
              <div className="project-group-content">
                {tagProjects.map((p, i) => renderProjectCard(p, startIdx + i))}
              </div>
            </div>
          );
        })}
        {untagged.length > 0 && (
          <div className="project-group">
            <div className="project-group-header">
              <span
                className="group-dot"
                style={{ backgroundColor: 'var(--vscode-descriptionForeground)' }}
              />
              Untagged
              <span
                className="group-count"
                data-tip={`${untagged.length} project${untagged.length !== 1 ? 's' : ''}`}
              >
                {untagged.length}
              </span>
            </div>
            <div className="project-group-content">
              {untagged.map((p, i) => renderProjectCard(p, runningIndex + i))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="project-list">
      {projects.map((project, index) => renderProjectCard(project, index))}
    </div>
  );
}

export default memo(ProjectList);
