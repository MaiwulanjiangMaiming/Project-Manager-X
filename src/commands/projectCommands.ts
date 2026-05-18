import * as vscode from 'vscode';
import { Container } from '../core/container';

export function registerProjectCommands(ctx: vscode.ExtensionContext, container: Container): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('projectManagerPro.saveProject', async () => {
      await container.projectManager.saveCurrentProject();
    }),

    vscode.commands.registerCommand('projectManagerPro.refreshProjects', async () => {
      await container.projectManager.refreshProjects();
    }),

    vscode.commands.registerCommand('projectManagerPro.deleteProject', async (projectId?: string) => {
      if (projectId) {
        await container.projectManager.deleteProject(projectId);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.updateProject', async (project?: any) => {
      if (project) {
        await container.projectManager.updateProject(project);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.quickSwitch', async () => {
      const projects = container.projectManager.getProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage('No projects saved yet');
        return;
      }

      const items = projects.map(p => ({
        label: p.name,
        description: p.path,
        detail: p.tags.length > 0 ? p.tags.join(', ') : undefined,
        project: p
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Quick switch to project...',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (selected) {
        await container.projectManager.openProject(selected.project.id, false);
      }
    }),

    vscode.commands.registerCommand('projectManagerPro.exportProjects', async () => {
      const projects = container.projectManager.getProjects();
      if (projects.length === 0) {
        vscode.window.showInformationMessage('No projects to export');
        return;
      }

      const tasks = container.projectManager.getTasks();
      let markdown = '# Project Manager X - Export\n\n';

      for (const project of projects) {
        markdown += `## ${project.name}\n`;
        markdown += `- **Path**: ${project.path}\n`;
        markdown += `- **Type**: ${project.type}\n`;
        markdown += `- **Lifecycle**: ${project.lifecycle}\n`;
        if (project.tags.length > 0) {
          markdown += `- **Tags**: ${project.tags.join(', ')}\n`;
        }
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        if (projectTasks.length > 0) {
          markdown += '\n### Tasks\n';
          for (const task of projectTasks) {
            const status = task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '⬜';
            markdown += `- ${status} ${task.title} (${task.priority})\n`;
          }
        }
        markdown += '\n';
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('projects-export.md'),
        filters: { 'Markdown': ['md'] }
      });

      if (uri) {
        const fs = await import('fs');
        fs.writeFileSync(uri.fsPath, markdown, 'utf-8');
        vscode.window.showInformationMessage(`Projects exported to ${uri.fsPath}`);
      }
    })
  ];
}
