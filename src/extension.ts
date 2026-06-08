/**
 * Project Manager X
 * Copyright (c) 2026 Maiwulanjiang Maiming <mawlan.momin@gmail.com>
 * Licensed under GPL-3.0
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { Container } from './core/container';
import { getMessageHandler } from './core/messageHandlers';
import { registerAllCommands } from './commands';
import { WebviewMessage, ExtensionToWebview, Project, Task, ContextSnapshot } from './types';
import { RpcError } from './webview/rpc/RpcError';
import { initI18n, getLocale, getTranslations } from './core/i18n';

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

export async function activate(context: vscode.ExtensionContext) {
  container = Container.init(context);

  // Initialise i18n with the user's VS Code locale
  initI18n(vscode.env.language);

  // Pre-load storage data using async I/O before any sync getter is used.
  // This ensures the cache is populated and all subsequent sync reads
  // (getProjects, getTasks, etc.) return from memory without blocking.
  await container.storage.init();
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
  container.reminderSystem.startPolling(() => container.projectManager.getStorageData().tasks);

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
    // Special case: getLatestSnapshot returns a value directly
    if (message.type === 'getLatestSnapshot') {
      return this.handleGetLatestSnapshot(message.data.projectId);
    }

    const handler = getMessageHandler(message.type);
    if (handler) {
      return handler(message, this.container, () => this.refresh());
    }

    throw new Error(`Unknown message type: ${message.type}`);
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

    // Check path existence for local projects
    const projectsWithPathCheck = data.projects.map((p: any) => ({
      ...p,
      pathExists: p.remote ? true : fs.existsSync(p.path),
    }));

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const currentWorkspacePath =
      workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : null;

    messageQueue.enqueue({
      type: 'stateUpdated',
      data: {
        projects: projectsWithPathCheck,
        tasks: data.tasks,
        milestones: data.milestones,
        changelog: data.changelog,
        snapshots: data.snapshots,
        notes: data.notes,
        tags: data.tags,
        settings: data.settings,
        version: this.context.extension.packageJSON.version,
        currentWorkspacePath,
        locale: getLocale(),
        i18n: getTranslations(),
      },
    });

    if (currentWorkspacePath) {
      const matched = data.projects.find((p: Project) => p.path === currentWorkspacePath);
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline' /* required: CSS injected via JS at build time */; img-src https: data:; connect-src https:; font-src https:;">
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
