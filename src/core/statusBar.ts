import * as vscode from 'vscode';
import { Project } from '../types';

export class StatusBarIntegration {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = 'projectManagerPro.quickSwitch';
    this.statusBarItem.hide();
  }

  update(project: Project | undefined, openTaskCount: number = 0): void {
    if (!project) {
      this.hide();
      return;
    }
    const taskInfo = openTaskCount > 0 ? ` (${openTaskCount} tasks)` : '';
    this.statusBarItem.text = `$(folder) ${project.name}${taskInfo}`;
    this.statusBarItem.tooltip = `${project.name} - ${project.path}`;
    this.statusBarItem.show();
  }

  show(): void {
    this.statusBarItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
