import { describe, it, expect } from 'vitest';
import { runMigrations, DATA_VERSION } from '../core/migrations';
import { StorageData } from '../types';

function createTestData(projects: any[]): StorageData {
  return {
    projects: projects as any,
    tasks: [],
    milestones: [],
    changelog: [],
    snapshots: [],
    notes: [],
    tags: [],
    settings: {
      sortBy: 'saved',
      groupByTag: false,
      showPath: true,
      autoDetectGit: true,
      autoDetectVSCode: true,
      gitBaseFolders: [],
      gitMaxDepth: 3,
      cardDensity: 'normal',
      showTaskCount: true,
      showProgressBar: true,
    },
  };
}

describe('runMigrations', () => {
  it('should not modify data when currentVersion === DATA_VERSION', () => {
    const data = createTestData([
      { id: '1', name: 'Project 1', lifecycle: 'active', tags: [], milestones: [] },
    ]);
    const result = runMigrations(data, DATA_VERSION);
    expect(result.projects[0]).toEqual(data.projects[0]);
  });

  it('should apply v1 migration: add lifecycle = active if not present', () => {
    const data = createTestData([{ id: '1', name: 'Project 1' }]);
    const result = runMigrations(data, 0);
    expect(result.projects[0].lifecycle).toBe('active');
  });

  it('should apply v2 migration: add tags = [] and milestones = [] if not arrays', () => {
    const data = createTestData([{ id: '1', name: 'Project 1', lifecycle: 'active' }]);
    const result = runMigrations(data, 1);
    expect(result.projects[0].tags).toEqual([]);
    expect((result.projects[0] as any).milestones).toEqual([]);
  });

  it('should apply both v1 and v2 migrations when going from v0 to v2', () => {
    const data = createTestData([{ id: '1', name: 'Project 1' }]);
    const result = runMigrations(data, 0);
    expect(result.projects[0].lifecycle).toBe('active');
    expect(result.projects[0].tags).toEqual([]);
    expect((result.projects[0] as any).milestones).toEqual([]);
  });

  it('should not overwrite existing lifecycle', () => {
    const data = createTestData([{ id: '1', name: 'Project 1', lifecycle: 'archived' }]);
    const result = runMigrations(data, 0);
    expect(result.projects[0].lifecycle).toBe('archived');
  });

  it('should not overwrite existing tags', () => {
    const data = createTestData([
      { id: '1', name: 'Project 1', lifecycle: 'active', tags: ['web', 'important'] },
    ]);
    const result = runMigrations(data, 1);
    expect(result.projects[0].tags).toEqual(['web', 'important']);
    expect((result.projects[0] as any).milestones).toEqual([]);
  });
});
