import * as vscode from 'vscode';
import { Container } from './core/container';
import { registerAllCommands } from './commands';
import { WebviewMessage, ExtensionToWebview, Project, Task } from './types';

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

  const provider = new ProjectManagerWebviewProvider(context.extensionUri, container);

  const projectsFilePath = container.projectManager.getProjectsFilePath();
  const watcher = vscode.workspace.createFileSystemWatcher(projectsFilePath);
  watcher.onDidChange(() => {
    container.projectManager.invalidateCache();
    container.fileWatcher.notifyChange();
    provider.refresh();
  });
  watcher.onDidCreate(() => {
    container.projectManager.invalidateCache();
    provider.refresh();
  });
  context.subscriptions.push(watcher);

  container.fileWatcher.onChange = () => {
    container.projectManager.invalidateCache();
    provider.refresh();
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('projectManagerPro', provider, {
      webviewOptions: { retainContextWhenHidden: true }
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
    private readonly container: Container
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    messageQueue.setView(webviewView);

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
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
          id: message.id
        });
      }
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });
  }

  async handleMessage(message: WebviewMessage): Promise<any> {
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
      case 'saveProject':
        await pm.saveCurrentProject();
        this.refresh();
        break;
      case 'deleteProject':
        await pm.deleteProject(message.data.projectId);
        this.refresh();
        break;
      case 'updateProject':
        await pm.updateProject(message.data.project);
        this.refresh();
        break;
      case 'reorderProjects':
        await pm.reorderProjects(message.data.projects);
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
        this.refresh();
        break;
      case 'updateTag':
        await pm.updateTag(message.data.tag);
        this.refresh();
        break;
      case 'deleteTag':
        await pm.deleteTag(message.data.tagId);
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
      case 'refreshProjects':
        await pm.refreshProjects();
        this.refresh();
        break;
      case 'addDetectFolder':
        await pm.addDetectFolder();
        break;
      case 'editProjectsFile':
        await pm.editProjectsFile();
        break;
      case 'importFromProjectManager':
        await pm.importFromProjectManager();
        this.refresh();
        break;
      case 'createTask':
        await pm.createTask(message.data.projectId, message.data.title, message.data.category, message.data.priority);
        this.refresh();
        break;
      case 'updateTask':
        await pm.updateTask(message.data.task);
        this.refresh();
        this.container.reminderSystem.refreshReminders(pm.getStorageData().tasks);
        break;
      case 'deleteTask':
        await pm.deleteTask(message.data.taskId);
        this.refresh();
        break;
      case 'createMilestone':
        await pm.createMilestone(message.data.projectId, message.data.title, message.data.description);
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
        await pm.createChangelog(message.data.projectId, message.data.version, message.data.changes);
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
        await vscode.commands.executeCommand('projectManagerPro.openProjectDetail', message.data.projectId);
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
          await pm.batchDeleteProjects(message.data.projectIds);
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
        vscode.window.showErrorMessage(`Webview error: ${message.data?.message || 'Unknown error'}`);
        break;
    }
  }

  private handleGetLatestSnapshot(projectId: string): any {
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
        settings: data.settings
      }
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
  <title>Project Manager Pro</title>
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
