import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Container } from '../core/container';

export function registerWorkspaceCommands(
  ctx: vscode.ExtensionContext,
  container: Container
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('projectManagerPro.addDetectFolder', async () => {
      await container.projectManager.addDetectFolder();
    }),

    vscode.commands.registerCommand('projectManagerPro.editProjectsFile', async () => {
      await container.projectManager.editProjectsFile();
    }),

    vscode.commands.registerCommand('projectManagerPro.importFromProjectManager', async () => {
      await container.projectManager.importFromProjectManager();
    }),

    vscode.commands.registerCommand('projectManagerPro.autoMatchWorkspace', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) return;

      const workspacePath = workspaceFolders[0].uri.fsPath;
      const projects = container.projectManager.getProjects();
      const matched = projects.find((p) => p.path === workspacePath);

      if (matched) {
        matched.lastOpened = Date.now();
        await container.projectManager.updateProject(matched);
        const openTasks = container.projectManager
          .getTasks(matched.id)
          .filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
        container.statusBar.update(matched, openTasks);
        vscode.window.setStatusBarMessage(`Matched: ${matched.name}`, 3000);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.restoreBackup', async () => {
      const backups = await container.backupManager.listBackups();
      if (backups.length === 0) {
        vscode.window.showInformationMessage('No backups available');
        return;
      }

      const items = backups.map((b) => ({
        label: path.basename(b),
        description: fs.statSync(b).mtime.toLocaleString(),
        fullPath: b,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a backup to restore...',
      });

      if (!selected) return;

      const confirm = await vscode.window.showWarningMessage(
        `Restore from ${selected.label}? Current data will be replaced.`,
        'Restore',
        'Cancel'
      );

      if (confirm === 'Restore') {
        const success = await container.backupManager.restore(selected.fullPath);
        if (success) {
          container.projectManager.invalidateCache();
          vscode.window.showInformationMessage('Backup restored successfully');
        } else {
          vscode.window.showErrorMessage('Failed to restore backup');
        }
      }
    }),
  ];
}
