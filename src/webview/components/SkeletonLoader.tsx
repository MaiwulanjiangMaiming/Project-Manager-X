import React from 'react';

export function ProjectSkeleton() {
  return (
    <div className="project-card skeleton-card">
      <div className="project-card-content">
        <div className="project-card-header">
          <span className="skeleton-circle" />
          <span className="skeleton-line skeleton-title" />
        </div>
        <div className="project-card-meta">
          <span className="skeleton-line skeleton-path" />
          <span className="skeleton-line skeleton-date" />
        </div>
      </div>
    </div>
  );
}

export function ProjectListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectSkeleton key={i} />
      ))}
    </div>
  );
}
