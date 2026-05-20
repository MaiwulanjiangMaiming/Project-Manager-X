import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';

describe('VS Code Extension Test Setup', () => {
  it('should mock vscode module', () => {
    expect(vscode).toBeDefined();
    expect(vscode.window).toBeDefined();
    expect(vscode.workspace).toBeDefined();
    expect(vscode.commands).toBeDefined();
  });

  it('should mock vscode.window.showInformationMessage', () => {
    vscode.window.showInformationMessage('test');
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('test');
  });

  it('should mock vscode.workspace.getConfiguration', () => {
    const config = vscode.workspace.getConfiguration('projectManagerPro');
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('projectManagerPro');
    expect(config).toBeDefined();
    expect(config.get).toBeDefined();
  });

  it('should mock vscode.commands.registerCommand', () => {
    const disposable = vscode.commands.registerCommand('test.command', () => {});
    expect(vscode.commands.registerCommand).toHaveBeenCalled();
    expect(disposable).toBeDefined();
    expect(disposable.dispose).toBeDefined();
  });

  it('should mock acquireVsCodeApi for webview', () => {
    const vscodeApi = (globalThis as any).acquireVsCodeApi();
    expect(vscodeApi).toBeDefined();
    expect(vscodeApi.postMessage).toBeDefined();
    expect(vscodeApi.getState).toBeDefined();
    expect(vscodeApi.setState).toBeDefined();
  });

  it('should support jest-dom matchers', () => {
    const element = document.createElement('div');
    element.classList.add('test-class');
    element.textContent = 'Hello World';
    document.body.appendChild(element);

    expect(element).toBeInTheDocument();
    expect(element).toHaveClass('test-class');
    expect(element).toHaveTextContent('Hello World');

    document.body.removeChild(element);
  });
});

describe('Extension Core Logic', () => {
  it('should verify mock vscode.Uri.file', () => {
    const uri = vscode.Uri.file('/test/path');
    expect(uri.fsPath).toBe('/test/path');
    expect(uri.scheme).toBe('file');
  });

  it('should verify mock vscode.Uri.joinPath', () => {
    const base = vscode.Uri.file('/base');
    const joined = vscode.Uri.joinPath(base, 'sub', 'file.txt');
    expect(joined.fsPath).toBe('/base/sub/file.txt');
  });

  it('should verify mock EventEmitter', () => {
    const emitter = new vscode.EventEmitter<string>();
    expect(emitter).toBeDefined();
    expect(emitter.fire).toBeDefined();
    expect(emitter.event).toBeDefined();
    expect(emitter.dispose).toBeDefined();
  });
});
