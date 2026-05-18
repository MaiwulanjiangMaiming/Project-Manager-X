import React from 'react';

interface EmptyStateProps {
  hasProjects: boolean;
  searchQuery?: string;
  onAddDetectFolder: () => void;
  onImportFromProjectManager: () => void;
}

const CONFIGS = {
  'no-projects': {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" className="empty-icon">
        <path d="M32 8L8 20v24l24 12 24-12V20L32 8z"/>
        <path d="M32 32L8 20"/>
        <path d="M32 32v24"/>
        <path d="M32 32l24-12"/>
      </svg>
    ),
    title: 'No projects yet',
    desc: 'Save your first project or auto-detect existing ones',
  },
  'no-results': {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" className="empty-icon">
        <circle cx="28" cy="28" r="16"/>
        <line x1="40" y1="40" x2="56" y2="56"/>
      </svg>
    ),
    title: 'No matching projects',
    desc: 'No projects found matching your search',
  },
};

export default function EmptyState({ hasProjects, searchQuery, onAddDetectFolder, onImportFromProjectManager }: EmptyStateProps) {
  const reason = hasProjects ? 'no-results' : 'no-projects';
  const config = CONFIGS[reason];

  return (
    <div className="empty-state enhanced">
      {config.icon}
      <p className="empty-title">{config.title}</p>
      <p className="empty-subtitle">
        {reason === 'no-results' && searchQuery
          ? `No projects found for "${searchQuery}"`
          : config.desc}
      </p>
      {!hasProjects && (
        <div className="empty-actions">
          <button className="btn-primary" onClick={onAddDetectFolder}>
            Scan for Projects
          </button>
          <button className="btn-secondary" onClick={onImportFromProjectManager}>
            Import from Project Manager
          </button>
        </div>
      )}
      {hasProjects && searchQuery && (
        <div className="empty-actions">
          <button className="btn-secondary" onClick={() => {}}>
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}
