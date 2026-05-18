import * as vscode from 'vscode';
import { Container } from '../core/container';
import { TaskStatus } from '../types';

export function registerTaskCommands(ctx: vscode.ExtensionContext, container: Container): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('projectManagerPro.createTask', async (projectId?: string, title?: string, category?: string, priority?: string) => {
      if (projectId && title) {
        await container.projectManager.createTask(projectId, title, category as any, priority as any);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.updateTask', async (task?: any) => {
      if (task) {
        await container.projectManager.updateTask(task);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.deleteTask', async (taskId?: string) => {
      if (taskId) {
        await container.projectManager.deleteTask(taskId);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.batchDeleteTasks', async (taskIds?: string[]) => {
      if (taskIds) {
        await container.projectManager.batchDeleteTasks(taskIds);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.batchUpdateTaskStatus', async (taskIds?: string[], status?: TaskStatus) => {
      if (taskIds && status) {
        await container.projectManager.batchUpdateTaskStatus(taskIds, status);
      }
    })
  ];
}
