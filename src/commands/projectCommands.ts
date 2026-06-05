import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Container } from '../core/container';
import { formatLastOpened } from '../utils/dateUtils';

export function registerProjectCommands(
  ctx: vscode.ExtensionContext,
  container: Container
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('projectManagerPro.saveProject', async () => {
      await container.projectManager.saveCurrentProject();
    }),

    vscode.commands.registerCommand('projectManagerPro.refreshProjects', async () => {
      await container.projectManager.refreshProjects();
      container.onRefreshNeeded?.();
    }),

    vscode.commands.registerCommand(
      'projectManagerPro.deleteProject',
      async (projectId?: string) => {
        if (projectId) {
          await container.projectManager.deleteProject(projectId);
        }
      }
    ),

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

      const tasks = container.projectManager.getTasks();

      // 获取每个项目的 Git 分支（如果可能）
      const getGitBranch = async (projectPath: string): Promise<string | undefined> => {
        try {
          const gitDir = path.join(projectPath, '.git');
          if (!fs.existsSync(gitDir)) return undefined;
          const headFile = path.join(gitDir, 'HEAD');
          if (!fs.existsSync(headFile)) return undefined;
          const head = fs.readFileSync(headFile, 'utf-8').trim();
          if (head.startsWith('ref: refs/heads/')) {
            return head.replace('ref: refs/heads/', '');
          }
          return head.slice(0, 8); // detached HEAD, show commit hash
        } catch {
          return undefined;
        }
      };

      // 按最后打开时间排序（最近的在前）
      const sortedProjects = [...projects].sort((a, b) => {
        const aTime = a.lastOpened || 0;
        const bTime = b.lastOpened || 0;
        return bTime - aTime;
      });

      const items = await Promise.all(
        sortedProjects.map(async (p) => {
          const pendingTasks = tasks.filter(
            (t) => t.projectId === p.id && t.status !== 'done' && t.status !== 'cancelled'
          ).length;
          const branch = await getGitBranch(p.path);
          const lastOpened = formatLastOpened(p.lastOpened);

          // 构建 description: Git 分支 + 待办任务数
          const descParts: string[] = [];
          if (branch) descParts.push(`$(git-branch) ${branch}`);
          if (pendingTasks > 0) descParts.push(`$(check) ${pendingTasks} pending`);
          const description = descParts.join('  ') || p.type;

          // detail: 路径 + 最后打开时间
          const detailParts: string[] = [p.path];
          if (lastOpened) detailParts.push(`Last opened: ${lastOpened}`);

          return {
            label: `$(folder) ${p.name}`,
            description,
            detail: detailParts.join('  \u2022  '),
            project: p,
          };
        })
      );

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Quick switch to project...',
        matchOnDescription: true,
        matchOnDetail: true,
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
        const projectTasks = tasks.filter((t) => t.projectId === project.id);
        if (projectTasks.length > 0) {
          markdown += '\n### Tasks\n';
          for (const task of projectTasks) {
            const status =
              task.status === 'done' ? '✅' : task.status === 'in_progress' ? '🔄' : '⬜';
            markdown += `- ${status} ${task.title} (${task.priority})\n`;
          }
        }
        markdown += '\n';
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('projects-export.md'),
        filters: { Markdown: ['md'] },
      });

      if (uri) {
        const fs = await import('fs');
        fs.writeFileSync(uri.fsPath, markdown, 'utf-8');
        vscode.window.showInformationMessage(`Projects exported to ${uri.fsPath}`);
      }
    }),
  ];
}
