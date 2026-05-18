import * as vscode from 'vscode';
import { Container } from '../core/container';
import { registerProjectCommands } from './projectCommands';
import { registerTaskCommands } from './taskCommands';
import { registerWorkspaceCommands } from './workspaceCommands';

export function registerAllCommands(ctx: vscode.ExtensionContext, container: Container): vscode.Disposable[] {
  return [
    ...registerProjectCommands(ctx, container),
    ...registerTaskCommands(ctx, container),
    ...registerWorkspaceCommands(ctx, container),
  ];
}
