import * as vscode from 'vscode';
import { Storage } from './storage';
import { ProjectManager } from './projectManager';
import { BackupManager } from './backup';
import { SmartFileWatcher } from './smartWatcher';
import { StatusBarIntegration } from './statusBar';
import { ReminderSystem } from './reminderSystem';

export class Container {
  private static _instance: Container;
  readonly storage: Storage;
  readonly projectManager: ProjectManager;
  readonly backupManager: BackupManager;
  readonly fileWatcher: SmartFileWatcher;
  readonly statusBar: StatusBarIntegration;
  readonly reminderSystem: ReminderSystem;

  private constructor(context: vscode.ExtensionContext) {
    this.storage = new Storage(context);
    this.projectManager = new ProjectManager(context, this.storage);
    this.backupManager = new BackupManager(this.storage.getProjectsFilePath());
    this.fileWatcher = new SmartFileWatcher();
    this.statusBar = new StatusBarIntegration();
    this.reminderSystem = new ReminderSystem();
  }

  static init(context: vscode.ExtensionContext): Container {
    Container._instance = new Container(context);
    return Container._instance;
  }

  static get instance(): Container {
    return Container._instance;
  }

  dispose(): void {
    this.fileWatcher.dispose();
    this.statusBar.dispose();
    this.reminderSystem.dispose();
  }
}
