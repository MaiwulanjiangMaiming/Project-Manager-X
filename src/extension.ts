/**
 * Project Manager X
 * Copyright (c) 2026 Maiwulanjiang Maiming <mawlan.momin@gmail.com>
 * Licensed under GPL-3.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { Container } from './core/container';
import { registerAllCommands } from './commands';
import { WebviewMessage, ExtensionToWebview, Project, Task, ContextSnapshot } from './types';
import { RpcError } from './webview/rpc/RpcError';

interface RpcSuccessResponse {
  _rpcSuccess: true;
  data: unknown;
}

interface RpcErrorResponse {
  _rpcError: true;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

type RpcResponse = RpcSuccessResponse | RpcErrorResponse;

class MessageQueue {
  private queue: ExtensionToWebview[] = [];
  private ready = false;
  private view?: vscode.WebviewView;

  setView(view: vscode.WebviewView) {
    this.view = view;
  }

  enqueue(msg: ExtensionToWebview) {
    if (this.ready && this.view) {
      this.view.webview.postMessage(msg);
    } else {
      this.queue.push(msg);
    }
  }

  flush() {
    this.ready = true;
    while (this.queue.length > 0) {
      const msg = this.queue.shift()!;
      this.view?.webview.postMessage(msg);
    }
  }
}

let container: Container;
const messageQueue = new MessageQueue();

export function activate(context: vscode.ExtensionContext) {
  container = Container.init(context);
  container.storage.setBackupManager(container.backupManager);

  const provider = new ProjectManagerWebviewProvider(context.extensionUri, container, context);

  // Wire up the refresh callback so command handlers can push data to the
  // webview without needing a direct reference to the provider.
  container.onRefreshNeeded = () => provider.refresh();

  // After we write a data file ourselves, update the SmartFileWatcher's
  // content hash so the subsequent file-watcher event can be recognised as
  // a self-write and skipped (avoids an unnecessary disk reload).
  container.storage.onAfterWrite = (key: string, content: string) => {
    container.fileWatcher.updateHash(key, content);
  };

  // ─── File watchers ───────────────────────────────────────────────
  // projects.json watcher
  const projectsFilePath = container.projectManager.getProjectsFilePath();
  const projectsWatcher = vscode.workspace.createFileSystemWatcher(projectsFilePath);
  const onProjectsFileChange = () => {
    container.fileWatcher.notifyChange();
  };
  projectsWatcher.onDidChange(onProjectsFileChange);
  projectsWatcher.onDidCreate(onProjectsFileChange);
  projectsWatcher.onDidDelete(() => {
    setTimeout(() => {
      if (!fs.existsSync(projectsFilePath)) {
        container.projectManager.invalidateCache();
        provider.refresh();
      }
    }, 300);
  });
  context.subscriptions.push(projectsWatcher);

  // metadata.json watcher — tags, tasks, milestones, etc.
  const metadataFilePath = container.projectManager.getMetadataFilePath();
  const metadataWatcher = vscode.workspace.createFileSystemWatcher(metadataFilePath);
  const onMetadataFileChange = () => {
    container.fileWatcher.notifyChange();
  };
  metadataWatcher.onDidChange(onMetadataFileChange);
  metadataWatcher.onDidCreate(onMetadataFileChange);
  metadataWatcher.onDidDelete(() => {
    setTimeout(() => {
      if (!fs.existsSync(metadataFilePath)) {
        container.projectManager.invalidateCache();
        provider.refresh();
      }
    }, 300);
  });
  context.subscriptions.push(metadataWatcher);

  container.fileWatcher.onChange = async () => {
    // Check which file(s) changed and reload only what's needed.
    // If the content matches what we last wrote (self-write), skip the
    // expensive disk reload — the in-memory cache is already authoritative.

    let projectsChanged = false;
    let metadataChanged = false;

    try {
      if (fs.existsSync(projectsFilePath)) {
        const content = fs.readFileSync(projectsFilePath, 'utf-8');
        if (!container.fileWatcher.isSameAsLastWrite('projects', content)) {
          projectsChanged = true;
        }
      } else {
        projectsChanged = true; // file deleted
      }
    } catch {
      projectsChanged = true; // assume changed if we can't read
    }

    try {
      if (fs.existsSync(metadataFilePath)) {
        const content = fs.readFileSync(metadataFilePath, 'utf-8');
        if (!container.fileWatcher.isSameAsLastWrite('metadata', content)) {
          metadataChanged = true;
        }
      } else {
        metadataChanged = true; // file deleted or not yet created
      }
    } catch {
      metadataChanged = true;
    }

    // Reload only the changed file(s)
    if (projectsChanged && metadataChanged) {
      await Promise.all([
        container.projectManager.forceReloadProjects(),
        container.projectManager.forceReloadMetadata(),
      ]);
    } else if (projectsChanged) {
      await container.projectManager.forceReloadProjects();
    } else if (metadataChanged) {
      await container.projectManager.forceReloadMetadata();
    }
    // If neither changed (both matched our last write), just refresh the
    // webview with the current cache.
    provider.refresh();
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('projectManagerPro', provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  const commandDisposables = registerAllCommands(context, container);
  context.subscriptions.push(...commandDisposables);

  const data = container.projectManager.getStorageData();
  container.reminderSystem.refreshReminders(data.tasks);

  vscode.commands.executeCommand('projectManagerPro.autoMatchWorkspace');
}

class ProjectManagerWebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly container: Container,
    private readonly context: vscode.ExtensionContext
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    messageQueue.setView(webviewView);

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (message.type === 'ready') {
        messageQueue.flush();
        this.refresh();
        return;
      }
      const response = await this.handleMessage(message);
      if (response !== undefined && message.id) {
        messageQueue.enqueue({
          type: 'rpc:response',
          data: response,
          id: message.id,
        });
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });

    // Listen for VS Code theme changes
    const themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme((theme) => {
      messageQueue.enqueue({
        type: 'themeChange',
        data: {
          kind: theme.kind,
          // 1 = dark, 2 = light, 3 = high contrast dark, 4 = high contrast light
        },
      });
    });
    this.context.subscriptions.push(themeChangeDisposable);

    // Send initial theme
    messageQueue.enqueue({
      type: 'themeChange',
      data: {
        kind: vscode.window.activeColorTheme.kind,
      },
    });
  }

  async handleMessage(message: WebviewMessage): Promise<RpcResponse | undefined> {
    try {
      const result = await this.handleMessageInner(message);
      if (message.id) {
        return { _rpcSuccess: true, data: result };
      }
      return undefined;
    } catch (error) {
      if (message.id) {
        const rpcError = error instanceof RpcError ? error : RpcError.unknown(String(error));
        return {
          _rpcError: true,
          error: {
            code: rpcError.code,
            message: rpcError.message,
            details: rpcError.details,
          },
        };
      }
      throw error;
    }
  }

  private async handleMessageInner(message: WebviewMessage): Promise<unknown> {
    const pm = this.container.projectManager;
    switch (message.type) {
      case 'openProject':
        await pm.openProject(message.data.projectId, false);
        this.refresh();
        break;
      case 'openInNewWindow':
        await pm.openProject(message.data.projectId, true);
        this.refresh();
        break;
      case 'saveProject': {
        const projectName = await pm.saveCurrentProject();
        if (projectName) {
          vscode.window.showInformationMessage(`Project "${projectName}" saved`);
        }
        this.refresh();
        break;
      }
      case 'deleteProject': {
        const project = pm.getProjects().find((p) => p.id === message.data.projectId);
        if (!project) {
          throw RpcError.notFound('Project', message.data.projectId);
        }

        const projectData = { ...project };
        const projectTasks = pm.getTasks(message.data.projectId);

        await pm.deleteProject(message.data.projectId);
        this.refresh();

        const undo = await vscode.window.showInformationMessage(
          `Project "${projectData.name}" deleted`,
          'Undo'
        );
        if (undo === 'Undo') {
          await pm.restoreProject(projectData, projectTasks);
          this.refresh();
          vscode.window.showInformationMessage(`Project "${projectData.name}" restored`);
        }
        break;
      }
      case 'updateProject':
        await pm.updateProject(message.data.project);
        vscode.window.showInformationMessage('Project updated');
        this.refresh();
        break;
      case 'reorderProjects':
        await pm.reorderProjects(message.data.projects);
        vscode.window.showInformationMessage('Projects reordered');
        this.refresh();
        break;
      case 'moveProjectToTag':
        await pm.moveProjectToTag(message.data.projectId, message.data.tagId);
        this.refresh();
        break;
      case 'removeProjectFromTag':
        await pm.removeProjectFromTag(message.data.projectId, message.data.tagId);
        this.refresh();
        break;
      case 'addTag':
        await pm.addTag(message.data.name, message.data.color);
        vscode.window.showInformationMessage(`Tag "${message.data.name}" added`);
        this.refresh();
        break;
      case 'updateTag':
        await pm.updateTag(message.data.tag);
        vscode.window.showInformationMessage('Tag updated');
        this.refresh();
        break;
      case 'deleteTag':
        await pm.deleteTag(message.data.tagId);
        vscode.window.showInformationMessage('Tag deleted');
        this.refresh();
        break;
      case 'reorderTags':
        await pm.reorderTags(message.data.tags);
        this.refresh();
        break;
      case 'showInFolder':
        await pm.showInFolder(message.data.projectId);
        break;
      case 'addToWorkspace':
        await pm.addToWorkspace(message.data.projectId);
        break;
      case 'refreshProjects': {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Refreshing projects...',
            cancellable: false,
          },
          async () => {
            await pm.refreshProjects();
          }
        );
        this.refresh();
        break;
      }
      case 'addDetectFolder':
        await pm.addDetectFolder();
        break;
      case 'editProjectsFile':
        await pm.editProjectsFile();
        break;
      case 'importFromProjectManager': {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Importing projects...',
            cancellable: false,
          },
          async () => {
            await pm.importFromProjectManager();
          }
        );
        this.refresh();
        break;
      }
      case 'createTask':
        await pm.createTask(
          message.data.projectId,
          message.data.title,
          message.data.category,
          message.data.priority
        );
        vscode.window.showInformationMessage('Task created');
        this.refresh();
        break;
      case 'updateTask':
        await pm.updateTask(message.data.task);
        vscode.window.showInformationMessage('Task updated');
        this.refresh();
        this.container.reminderSystem.refreshReminders(pm.getStorageData().tasks);
        break;
      case 'deleteTask':
        await pm.deleteTask(message.data.taskId);
        vscode.window.showInformationMessage('Task deleted');
        this.refresh();
        break;
      case 'createMilestone':
        await pm.createMilestone(
          message.data.projectId,
          message.data.title,
          message.data.description
        );
        vscode.window.showInformationMessage('Milestone created');
        this.refresh();
        break;
      case 'updateMilestone':
        await pm.updateMilestone(message.data.milestone);
        this.refresh();
        break;
      case 'deleteMilestone':
        await pm.deleteMilestone(message.data.milestoneId);
        this.refresh();
        break;
      case 'createChangelog':
        await pm.createChangelog(
          message.data.projectId,
          message.data.version,
          message.data.changes
        );
        this.refresh();
        break;
      case 'updateChangelog':
        await pm.updateChangelog(message.data.changelog);
        this.refresh();
        break;
      case 'deleteChangelog':
        await pm.deleteChangelog(message.data.changelogId);
        this.refresh();
        break;
      case 'createNote':
        await pm.createNote(message.data.projectId, message.data.title, message.data.content);
        vscode.window.showInformationMessage('Note created');
        this.refresh();
        break;
      case 'updateNote':
        await pm.updateNote(message.data.note);
        this.refresh();
        break;
      case 'deleteNote':
        await pm.deleteNote(message.data.noteId);
        this.refresh();
        break;
      case 'saveSnapshot':
        await pm.saveSnapshot(message.data.projectId, message.data.snapshot);
        this.refresh();
        break;
      case 'getLatestSnapshot':
        return this.handleGetLatestSnapshot(message.data.projectId);
      case 'openProjectDetail':
        await vscode.commands.executeCommand(
          'projectManagerPro.openProjectDetail',
          message.data.projectId
        );
        break;
      case 'showGlobalTasks':
        await vscode.commands.executeCommand('projectManagerPro.showGlobalTasks');
        break;
      case 'batchDeleteTasks':
        await pm.batchDeleteTasks(message.data.taskIds);
        this.refresh();
        break;
      case 'batchUpdateTaskStatus':
        await pm.batchUpdateTaskStatus(message.data.taskIds, message.data.status);
        this.refresh();
        break;
      case 'batchDeleteProjects': {
        const count = message.data.projectIds?.length || 0;
        const confirm = await vscode.window.showWarningMessage(
          `Delete ${count} project${count !== 1 ? 's' : ''}? This cannot be undone.`,
          { modal: true },
          'Delete'
        );
        if (confirm === 'Delete') {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Deleting ${count} project${count !== 1 ? 's' : ''}...`,
              cancellable: false,
            },
            async () => {
              await pm.batchDeleteProjects(message.data.projectIds);
            }
          );
          vscode.window.showInformationMessage(`Deleted ${count} project${count !== 1 ? 's' : ''}`);
          this.refresh();
        }
        break;
      }
      case 'openExternal':
        if (message.data?.url) {
          vscode.env.openExternal(vscode.Uri.parse(message.data.url));
        }
        break;
      case 'quickSwitch':
        await vscode.commands.executeCommand('projectManagerPro.quickSwitch');
        break;
      case 'autoMatchWorkspace':
        await vscode.commands.executeCommand('projectManagerPro.autoMatchWorkspace');
        break;
      case 'exportProjects':
        await vscode.commands.executeCommand('projectManagerPro.exportProjects');
        break;
      case 'restoreBackup':
        await vscode.commands.executeCommand('projectManagerPro.restoreBackup');
        break;
      case 'error:report':
        vscode.window.showErrorMessage(
          `Webview error: ${message.data?.message || 'Unknown error'}`
        );
        break;
    }
  }

  private handleGetLatestSnapshot(projectId: string): {
    projectId: string;
    snapshot: ContextSnapshot | undefined;
  } {
    const snapshot = this.container.projectManager.getLatestSnapshot(projectId);
    return { projectId, snapshot };
  }

  refresh(): void {
    const data = this.container.projectManager.getStorageData();

    messageQueue.enqueue({
      type: 'stateUpdated',
      data: {
        projects: data.projects,
        tasks: data.tasks,
        milestones: data.milestones,
        changelog: data.changelog,
        snapshots: data.snapshots,
        notes: data.notes,
        tags: data.tags,
        settings: data.settings,
      },
    });

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspacePath = workspaceFolders[0].uri.fsPath;
      const matched = data.projects.find((p: Project) => p.path === workspacePath);
      if (matched) {
        const openTasks = data.tasks.filter(
          (t: Task) => t.projectId === matched.id && t.status !== 'done' && t.status !== 'cancelled'
        ).length;
        this.container.statusBar.update(matched, openTasks);
      }
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const webviewJs = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <title>Project Manager X</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      margin: 0;
      padding: 0;
    }
    #root { width: 100%; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${webviewJs}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function deactivate() {
  container?.dispose();
}
