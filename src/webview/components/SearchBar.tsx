import React, { memo } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  sortBy: string;
  onSortChange: (sort: 'saved' | 'name' | 'path' | 'recent' | 'priority' | 'custom') => void;
  viewMode: 'detailed' | 'compact';
  onViewModeChange: (mode: 'detailed' | 'compact') => void;
  onRefresh: () => void;
  onSaveCurrentProject: () => void;
  onAddDetectFolder: () => void;
  onEditProjectsFile: () => void;
  onImportFromProjectManager: () => void;
}

function SearchBar({
  value,
  onChange,
  onDebouncedChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  onSaveCurrentProject,
  onAddDetectFolder,
  onEditProjectsFile,
  onImportFromProjectManager,
}: SearchBarProps) {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.7422 10.3439C12.5329 9.2673 13 7.9382 13 6.5C13 2.91015 10.0899 0 6.5 0C2.91015 0 0 2.91015 0 6.5C0 10.0899 2.91015 13 6.5 13C7.9382 13 9.2673 12.5329 10.3439 11.7422L14.1464 15.1464L15 14.2929L11.7422 10.3439ZM6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5Z" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search projects..."
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v);
            if (onDebouncedChange) onDebouncedChange(v);
          }}
        />
        {value && (
          <button className="search-clear" onClick={() => onChange('')} data-tip="Clear search">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11.71 10.29L10.29 11.71L8 9.41L5.71 11.71L4.29 10.29L6.59 8L4.29 5.71L5.71 4.29L8 6.59L10.29 4.29L11.71 5.71L9.41 8L11.71 10.29Z" />
            </svg>
          </button>
        )}
      </div>
      <div className="search-actions">
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          title="Sort projects"
        >
          <option value="recent">Recent</option>
          <option value="name">Name</option>
          <option value="path">Path</option>
          <option value="custom">Custom</option>
        </select>
        <button
          className={`view-mode-btn ${viewMode === 'compact' ? 'active' : ''}`}
          onClick={() => onViewModeChange(viewMode === 'detailed' ? 'compact' : 'detailed')}
          data-tip={viewMode === 'detailed' ? 'Switch to compact view' : 'Switch to detailed view'}
        >
          {viewMode === 'detailed' ? (
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 1h14v1.5H1V1zm0 4.25h14v1.5H1v-1.5zm0 4.25h14v1.5H1v-1.5zm0 4.25h8v1.5H1v-1.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 1h14v1.5H1V1zm0 4.25h14v1.5H1v-1.5zm0 4.25h14v1.5H1v-1.5zm0 4.25h14v1.5H1v-1.5z" />
            </svg>
          )}
        </button>
        <button
          className="save-project-btn"
          onClick={onSaveCurrentProject}
          data-tip="Save current project"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zm-1 13H3v-1h10v1zm0-3H3V3h5v3h5v5zm-3-5V3h3v3h-3z" />
          </svg>
        </button>
        <button className="refresh-btn" onClick={onRefresh} data-tip="Refresh from projects.json">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.65 2.35C12.2 0.9 10.21 0 8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C11.73 16 14.84 13.45 15.73 10H13.65C12.83 12.33 10.61 14 8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C9.66 2 11.14 2.69 12.22 3.78L9 7H16V0L13.65 2.35Z" />
          </svg>
        </button>
        <button
          className="add-folder-btn"
          onClick={onAddDetectFolder}
          data-tip="Add folder to scan"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.5 3H7.71l-.85-.85L6.29 2H1.5l-.5.5v10l.5.5h13l.5-.5v-9l-.5-.5zM14 13H2V5h12v8z" />
            <path d="M8 6v2H6v1h2v2h1v-2h2V8H9V6H8z" />
          </svg>
        </button>
        <button
          className="edit-file-btn"
          onClick={onEditProjectsFile}
          data-tip="Edit projects.json"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.23 1h-1.46L3.52 9.25l-.16.35L2 13.59l.43.43 4.03-1.36.35-.16L15 3.77V2.31L13.69 1h-.46zM3.69 10.35L5.65 12.3 3.12 13.1l.57-2.75zm4.64-.82L10.3 8.56 13.23 5.62 14.38 6.77 11.44 9.7 10.35 10.35 8.33 11.53z" />
          </svg>
        </button>
        <button
          className="import-btn"
          onClick={onImportFromProjectManager}
          data-tip="Import from Project Manager"
        >
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C12.42 16 16 12.42 16 8C16 3.58 12.42 0 8 0ZM11 9H8v3H7V9H4V8h3V5h1v3h3v1z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default memo(SearchBar);
