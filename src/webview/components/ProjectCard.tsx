import React, { useState, memo } from 'react';
import { Project, Tag, PROJECT_ICONS, LIFECYCLE_COLORS, LIFECYCLE_LABELS } from '../../types';
import ContextMenu from './ContextMenu';

interface ProjectCardProps {
  project: Project;
  tags: Tag[];
  taskCount?: number;
  viewMode?: 'detailed' | 'compact';
  isManageMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenInNewWindow: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProject: (project: Project) => void;
  onShowInFolder: (projectId: string) => void;
  onAddToWorkspace: (projectId: string) => void;
  onOpenDetail: (projectId: string) => void;
}

function ProjectCard({
  project,
  tags,
  taskCount,
  viewMode = 'detailed',
  isManageMode,
  isSelected,
  onToggleSelection,
  onOpenProject,
  onOpenInNewWindow,
  onDeleteProject,
  onUpdateProject,
  onShowInFolder,
  onAddToWorkspace,
  onOpenDetail
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const projectTags = tags.filter(t => project.tags.includes(t.id));
  const iconInfo = PROJECT_ICONS[project.type] || PROJECT_ICONS.favorite;
  const isRemote = project.remote || ['ssh', 'docker', 'wsl', 'devcontainer', 'codespaces'].includes(project.type);

  const handleSaveEdit = () => {
    if (editName.trim()) {
      onUpdateProject({ ...project, name: editName.trim() });
    }
    setIsEditing(false);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never opened';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const isCompact = viewMode === 'compact';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if (isManageMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection?.(project.id);
      return;
    }
    if (isCompact) {
      onOpenDetail(project.id);
    } else {
      onOpenProject(project.id);
    }
  };

  return (
    <div
      className={`project-card ${isRemote ? 'remote' : ''} ${isCompact ? 'compact' : ''} ${isManageMode && isSelected ? 'selected' : ''}`}
      onContextMenu={handleContextMenu}
      onClick={isManageMode ? handleContentClick : undefined}
    >
      <div className="project-card-content" onClick={isManageMode ? undefined : handleContentClick}>
        <div className="project-card-header">
          {isManageMode && (
            <div className="project-manage-checkbox" onClick={(e) => { e.stopPropagation(); onToggleSelection?.(project.id); }}>
              <div className={`custom-checkbox ${isSelected ? 'checked' : ''}`}>
                {isSelected && (
                  <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                  </svg>
                )}
              </div>
            </div>
          )}
          <span className="project-icon" data-tip={iconInfo.label}>
            {iconInfo.svg ? (
              <svg viewBox={iconInfo.svgViewBox || '0 0 16 16'} fill="currentColor" dangerouslySetInnerHTML={{ __html: iconInfo.svg }} />
            ) : (
              iconInfo.icon
            )}
          </span>
          <span
            className="project-lifecycle-dot"
            style={{ backgroundColor: LIFECYCLE_COLORS[project.lifecycle] }}
            data-tip={LIFECYCLE_LABELS[project.lifecycle]}
          />
          {isEditing ? (
            <input
              type="text"
              className="project-name-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setEditName(project.name);
                  setIsEditing(false);
                }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="project-name" onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}>
              {project.name}
            </span>
          )}
          {isCompact && projectTags.length > 0 && (
            <span className="compact-tags-inline">
              {projectTags.map(tag => (
                <span
                  key={tag.id}
                  className="compact-tag-dot"
                  style={{ backgroundColor: tag.color }}
                  data-tip={tag.name}
                />
              ))}
            </span>
          )}
          {isCompact && (
            <span className="compact-actions">
              <button
                className="compact-action-btn"
                onClick={(e) => { e.stopPropagation(); onOpenProject(project.id); }}
                data-tip="Open project"
              >
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8.53 3.22a.75.75 0 00-1.06 1.06L10.19 7H2.75a.75.75 0 000 1.5h7.44l-2.97 2.97a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06L8.53 3.22z"/></svg>
              </button>
              <button
                className="compact-action-btn"
                onClick={(e) => { e.stopPropagation(); onOpenInNewWindow(project.id); }}
                data-tip="Open in new window"
              >
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 2h4a.75.75 0 010 1.5H3.5a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-4a.75.75 0 011.5 0v4A1.75 1.75 0 0112 13.75h-8.5A1.75 1.75 0 011.75 12V3.5c0-.966.784-1.75 1.75-1.75zm7.75-1a.75.75 0 01.75.75v1.25h1.25a.75.75 0 010 1.5h-1.25v1.25a.75.75 0 01-1.5 0V4.5h-1.25a.75.75 0 010-1.5h1.25V1.75a.75.75 0 01.75-.75z"/></svg>
              </button>
            </span>
          )}
        </div>
        {!isCompact && (
          <>
            <div className="project-card-meta">
              <span className="project-path">{project.path}</span>
              <span className="project-date">{formatDate(project.lastOpened)}</span>
              {taskCount != null && taskCount > 0 && (
                <span className="project-task-count-badge">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
              )}
            </div>
            {projectTags.length > 0 && (
              <div className="project-tags">
                {projectTags.map(tag => (
                  <span
                    key={tag.id}
                    className="project-tag"
                    style={{ backgroundColor: tag.color + '33', color: tag.color, borderColor: tag.color + '66' }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {!isCompact && (
        <div className="project-card-actions">
          <button 
            className="action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(project.id);
            }}
            data-tip="View Details"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.562V4.25c0 .138.112.25.25.25h2.188L10.5 2.062zM5 8a.75.75 0 000 1.5h6a.75.75 0 000-1.5H5zm0 3a.75.75 0 000 1.5h4a.75.75 0 000-1.5H5z"/>
            </svg>
          </button>
          <button 
            className="action-btn" 
            onClick={(e) => {
              e.stopPropagation();
              onOpenInNewWindow(project.id);
            }}
            data-tip="Open in New Window"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 2h4a.75.75 0 010 1.5H3.5a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-4a.75.75 0 011.5 0v4A1.75 1.75 0 0112 13.75h-8.5A1.75 1.75 0 011.75 12V3.5c0-.966.784-1.75 1.75-1.75zm7.75-1a.75.75 0 01.75.75v1.25h1.25a.75.75 0 010 1.5h-1.25v1.25a.75.75 0 01-1.5 0V4.5h-1.25a.75.75 0 010-1.5h1.25V1.75a.75.75 0 01.75-.75z"/>
            </svg>
          </button>
          <button 
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            data-tip="More Actions"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 7a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z"/>
            </svg>
          </button>
          
          {showMenu && (
            <div className="project-menu">
              <button onClick={() => { onShowInFolder(project.id); setShowMenu(false); }}>
                Show in Folder
              </button>
              <button onClick={() => { onAddToWorkspace(project.id); setShowMenu(false); }}>
                Add to Workspace
              </button>
              <button onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                Rename
              </button>
              <button className="danger" onClick={() => { onDeleteProject(project.id); setShowMenu(false); }}>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { icon: '▶', label: 'Open', onClick: () => onOpenProject(project.id) },
            { icon: '⊞', label: 'Open in New Window', onClick: () => onOpenInNewWindow(project.id) },
            { divider: true, icon: '', label: '', onClick: () => {} },
            { icon: '✏️', label: 'Rename', onClick: () => setIsEditing(true) },
            { icon: '📋', label: 'Copy Path', onClick: () => { navigator.clipboard.writeText(project.path); } },
            { divider: true, icon: '', label: '', onClick: () => {} },
            { icon: '🗑', label: 'Delete', danger: true, onClick: () => onDeleteProject(project.id) },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default memo(ProjectCard);
