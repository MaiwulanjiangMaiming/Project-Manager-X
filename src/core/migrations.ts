import { StorageData, DATA_VERSION } from '../types';

export { DATA_VERSION };

type Migration = (data: StorageData) => StorageData;

const migrations: Map<number, Migration> = new Map([
  [
    1,
    (data: StorageData): StorageData => {
      for (const project of data.projects) {
        if (project.lifecycle === undefined) {
          (project as any).lifecycle = 'active';
        }
      }
      return data;
    },
  ],
  [
    2,
    (data: StorageData): StorageData => {
      for (const project of data.projects) {
        if (!Array.isArray((project as any).tags)) {
          (project as any).tags = [];
        }
        if (!Array.isArray((project as any).milestones)) {
          (project as any).milestones = [];
        }
      }
      return data;
    },
  ],
]);

export function runMigrations(data: StorageData, currentVersion: number): StorageData {
  let result = data;
  for (let v = currentVersion + 1; v <= DATA_VERSION; v++) {
    const migrate = migrations.get(v - 1);
    if (migrate) {
      result = migrate(result);
    }
  }
  return result;
}
