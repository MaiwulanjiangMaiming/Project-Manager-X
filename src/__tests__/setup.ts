import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const mockVscode = {
  window: {
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn(),
        asWebviewUri: vi.fn((uri: any) => uri),
        cspSource: '',
      },
      onDidDispose: vi.fn(),
      reveal: vi.fn(),
      dispose: vi.fn(),
    })),
    createStatusBarItem: vi.fn(() => ({
      text: '',
      tooltip: '',
      command: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
    registerTreeDataProvider: vi.fn(),
    createTreeView: vi.fn(() => ({
      onDidChangeSelection: vi.fn(),
      reveal: vi.fn(),
      dispose: vi.fn(),
    })),
    activeTextEditor: undefined,
    visibleTextEditors: [],
    onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeVisibleTextEditors: vi.fn(() => ({ dispose: vi.fn() })),
    setStatusBarMessage: vi.fn(() => ({ dispose: vi.fn() })),
    withProgress: vi.fn((_options, task) =>
      task(
        { report: vi.fn() },
        { isCancellationRequested: false, onCancellationRequested: vi.fn() }
      )
    ),
  },
  workspace: {
    workspaceFolders: undefined,
    onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    })),
    openTextDocument: vi.fn(),
    applyEdit: vi.fn(),
    saveAll: vi.fn(),
    onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
    onDidCreateFiles: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDeleteFiles: vi.fn(() => ({ dispose: vi.fn() })),
    onDidRenameFiles: vi.fn(() => ({ dispose: vi.fn() })),
    fs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      delete: vi.fn(),
      rename: vi.fn(),
      copy: vi.fn(),
      createDirectory: vi.fn(),
      readDirectory: vi.fn(),
      stat: vi.fn(),
      isWritable: vi.fn(),
    },
    findFiles: vi.fn(),
    asRelativePath: vi.fn((path: string) => path),
    createFileSystemWatcher: vi.fn(() => ({
      onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
      onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    })),
  },
  commands: {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
    registerTextEditorCommand: vi.fn(() => ({ dispose: vi.fn() })),
    executeCommand: vi.fn(),
    getCommands: vi.fn(),
  },
  extensions: {
    getExtension: vi.fn(),
    all: [],
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, path, scheme: 'file' })),
    parse: vi.fn((uri: string) => ({ fsPath: uri, path: uri, scheme: 'file' })),
    joinPath: vi.fn((base: any, ...paths: string[]) => ({
      fsPath: [base.fsPath, ...paths].join('/'),
      path: [base.path, ...paths].join('/'),
      scheme: base.scheme,
    })),
  },
  EventEmitter: class EventEmitter<T = any> {
    private _listeners: Array<(e: T) => any> = [];
    event = (listener: (e: T) => any) => {
      this._listeners.push(listener);
      return {
        dispose: () => {
          /* no-op */
        },
      };
    };
    fire = (data: T) => {
      this._listeners.forEach((l) => l(data));
    };
    dispose = () => {
      this._listeners = [];
    };
  },
  Disposable: {
    from: vi.fn(),
  },
  ProgressLocation: {
    SourceControl: 1,
    Window: 10,
    Notification: 15,
  },
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9,
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  FileType: {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  },
  version: '1.78.0',
};

vi.mock('vscode', () => mockVscode);

(globalThis as any).acquireVsCodeApi = vi.fn(() => ({
  postMessage: vi.fn(),
  getState: vi.fn(),
  setState: vi.fn(),
  onMessage: vi.fn(),
}));
