import * as vscode from 'vscode';
import { Container } from '../core/container';
import { WebviewMessage, ContextSnapshot } from '../types';
import { RpcError } from '../webview/rpc/RpcError';
import { t } from './i18n';

type SpecificMessage<T extends WebviewMessage['type']> = Extract<WebviewMessage, { type: T }>;

export type MessageHandler<T extends WebviewMessage['type'] = WebviewMessage['type']> = (
  message: SpecificMessage<T>,
  container: Container,
  refresh: () => void
) => Promise<unknown>;

const handlers = new Map<string, MessageHandler<any>>();

function register<T extends WebviewMessage['type']>(type: T, handler: MessageHandler<T>): void {
  handlers.set(type, handler);
}

// ─── Project handlers ──────────────────────────────────────────────

register('openProject', async (msg, container, refresh) => {
  await container.projectManager.openProject(msg.data.projectId, false);
  refresh();
});

register('openInNewWindow', async (msg, container, refresh) => {
  await container.projectManager.openProject(msg.data.projectId, true);
  refresh();
});

register('saveProject', async (_msg, container, refresh) => {
  const projectName = await container.projectManager.saveCurrentProject();
  if (projectName) {
    vscode.window.showInformationMessage(t('project.saved', projectName));
  }
  refresh();
});

register('deleteProject', async (msg, container, refresh) => {
  const pm = container.projectManager;
  const project = pm.getProjects().find((p) => p.id === msg.data.projectId);
  if (!project) {
    throw RpcError.notFound('Project', msg.data.projectId);
  }

  const projectData = { ...project };
  const projectTasks = pm.getTasks(msg.data.projectId);
  const storage = pm.getStorage();
  const projectMilestones = storage
    .getMilestones()
    .filter((m) => m.projectId === msg.data.projectId);
  const projectChangelog = storage.getChangelog().filter((c) => c.projectId === msg.data.projectId);
  const projectSnapshots = storage.getSnapshots().filter((s) => s.projectId === msg.data.projectId);
  const projectNotes = storage.getNotes().filter((n) => n.projectId === msg.data.projectId);

  await pm.deleteProject(msg.data.projectId);
  refresh();

  const undo = await vscode.window.showInformationMessage(
    t('project.deleted', projectData.name),
    'Undo'
  );
  if (undo === 'Undo') {
    await pm.restoreProject(
      projectData,
      projectTasks,
      projectMilestones,
      projectChangelog,
      projectSnapshots,
      projectNotes
    );
    refresh();
    vscode.window.showInformationMessage(t('project.restored', projectData.name));
  }
});

register('updateProject', async (msg, container, refresh) => {
  await container.projectManager.updateProject(msg.data.project);
  vscode.window.showInformationMessage(t('project.updated'));
  refresh();
});

register('reorderProjects', async (msg, container, refresh) => {
  await container.projectManager.reorderProjects(msg.data.projects);
  vscode.window.showInformationMessage(t('project.reordered'));
  refresh();
});

register('moveProjectToTag', async (msg, container, refresh) => {
  await container.projectManager.moveProjectToTag(msg.data.projectId, msg.data.tagId);
  refresh();
});

register('removeProjectFromTag', async (msg, container, refresh) => {
  await container.projectManager.removeProjectFromTag(msg.data.projectId, msg.data.tagId);
  refresh();
});

register('showInFolder', async (msg, container) => {
  await container.projectManager.showInFolder(msg.data.projectId);
});

register('addToWorkspace', async (msg, container) => {
  await container.projectManager.addToWorkspace(msg.data.projectId);
});

register('refreshProjects', async (_msg, container, refresh) => {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('progress.refreshing'),
      cancellable: false,
    },
    async () => {
      await container.projectManager.refreshProjects();
    }
  );
  refresh();
});

register('addDetectFolder', async (_msg, container) => {
  await container.projectManager.addDetectFolder();
});

register('editProjectsFile', async (_msg, container) => {
  await container.projectManager.editProjectsFile();
});

register('importFromProjectManager', async (_msg, container, refresh) => {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t('progress.importing'),
      cancellable: false,
    },
    async () => {
      await container.projectManager.importFromProjectManager();
    }
  );
  refresh();
});

register('openProjectDetail', async (msg) => {
  await vscode.commands.executeCommand('projectManagerPro.openProjectDetail', msg.data.projectId);
});

// ─── Tag handlers ──────────────────────────────────────────────────

register('addTag', async (msg, container, refresh) => {
  await container.projectManager.addTag(msg.data.name, msg.data.color);
  vscode.window.showInformationMessage(t('tag.added', msg.data.name));
  refresh();
});

register('updateTag', async (msg, container, refresh) => {
  await container.projectManager.updateTag(msg.data.tag);
  vscode.window.showInformationMessage(t('tag.updated'));
  refresh();
});

register('deleteTag', async (msg, container, refresh) => {
  await container.projectManager.deleteTag(msg.data.tagId);
  vscode.window.showInformationMessage(t('tag.deleted'));
  refresh();
});

register('reorderTags', async (msg, container, refresh) => {
  await container.projectManager.reorderTags(msg.data.tags);
  refresh();
});

// ─── Task handlers ────────────────────────────────────────────────

register('createTask', async (msg, container, refresh) => {
  await container.projectManager.createTask(
    msg.data.projectId,
    msg.data.title,
    msg.data.category,
    msg.data.priority
  );
  vscode.window.showInformationMessage(t('task.created'));
  refresh();
});

register('updateTask', async (msg, container, refresh) => {
  await container.projectManager.updateTask(msg.data.task);
  vscode.window.showInformationMessage(t('task.updated'));
  refresh();
  container.reminderSystem.refreshReminders(container.projectManager.getStorageData().tasks);
});

register('deleteTask', async (msg, container, refresh) => {
  await container.projectManager.deleteTask(msg.data.taskId);
  vscode.window.showInformationMessage(t('task.deleted'));
  refresh();
});

register('batchDeleteTasks', async (msg, container, refresh) => {
  await container.projectManager.batchDeleteTasks(msg.data.taskIds);
  refresh();
});

register('batchUpdateTaskStatus', async (msg, container, refresh) => {
  await container.projectManager.batchUpdateTaskStatus(msg.data.taskIds, msg.data.status);
  refresh();
});

// ─── Milestone handlers ───────────────────────────────────────────

register('createMilestone', async (msg, container, refresh) => {
  await container.projectManager.createMilestone(
    msg.data.projectId,
    msg.data.title,
    msg.data.description ?? ''
  );
  vscode.window.showInformationMessage(t('milestone.created'));
  refresh();
});

register('updateMilestone', async (msg, container, refresh) => {
  await container.projectManager.updateMilestone(msg.data.milestone);
  refresh();
});

register('deleteMilestone', async (msg, container, refresh) => {
  await container.projectManager.deleteMilestone(msg.data.milestoneId);
  refresh();
});

// ─── Changelog handlers ───────────────────────────────────────────

register('createChangelog', async (msg, container, refresh) => {
  const changes = [msg.data.added, msg.data.changed, msg.data.fixed, msg.data.removed]
    .filter(Boolean)
    .join('; ');
  await container.projectManager.createChangelog(
    msg.data.projectId,
    msg.data.version ?? '',
    changes
  );
  refresh();
});

register('updateChangelog', async (msg, container, refresh) => {
  await container.projectManager.updateChangelog(msg.data.changelog);
  refresh();
});

register('deleteChangelog', async (msg, container, refresh) => {
  await container.projectManager.deleteChangelog(msg.data.changelogId);
  refresh();
});

// ─── Note handlers ────────────────────────────────────────────────

register('createNote', async (msg, container, refresh) => {
  await container.projectManager.createNote(msg.data.projectId, msg.data.title, msg.data.content);
  vscode.window.showInformationMessage(t('note.created'));
  refresh();
});

register('updateNote', async (msg, container, refresh) => {
  await container.projectManager.updateNote(msg.data.note);
  refresh();
});

register('deleteNote', async (msg, container, refresh) => {
  await container.projectManager.deleteNote(msg.data.noteId);
  refresh();
});

// ─── Snapshot handlers ────────────────────────────────────────────

register('saveSnapshot', async (msg, container, refresh) => {
  await container.projectManager.saveSnapshot(
    msg.data.projectId,
    msg.data.snapshot as ContextSnapshot
  );
  refresh();
});

// ─── Batch project handlers ───────────────────────────────────────

register('batchDeleteProjects', async (msg, container, refresh) => {
  const count = msg.data.projectIds?.length || 0;
  const plural = count !== 1 ? 's' : '';
  const confirm = await vscode.window.showWarningMessage(
    t('batch.deleteConfirm', count, plural),
    { modal: true },
    'Delete'
  );
  if (confirm === 'Delete') {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('batch.deleting', count, plural),
        cancellable: false,
      },
      async () => {
        await container.projectManager.batchDeleteProjects(msg.data.projectIds);
      }
    );
    vscode.window.showInformationMessage(t('batch.deleted', count, plural));
    refresh();
  }
});

// ─── Misc handlers ────────────────────────────────────────────────

register('openExternal', async (msg) => {
  if (msg.data?.url) {
    const allowedHosts = ['github.com', 'github.io', 'githubusercontent.com'];
    try {
      const parsed = vscode.Uri.parse(msg.data.url);
      if (parsed.scheme === 'mailto' || allowedHosts.some((h) => parsed.authority.endsWith(h))) {
        vscode.env.openExternal(parsed);
      } else {
        vscode.window.showWarningMessage(t('external.blocked', msg.data.url));
      }
    } catch {
      vscode.window.showWarningMessage(t('external.invalid', msg.data.url));
    }
  }
});

register('quickSwitch', async () => {
  await vscode.commands.executeCommand('projectManagerPro.quickSwitch');
});

register('autoMatchWorkspace', async () => {
  await vscode.commands.executeCommand('projectManagerPro.autoMatchWorkspace');
});

register('exportProjects', async () => {
  await vscode.commands.executeCommand('projectManagerPro.exportProjects');
});

register('restoreBackup', async () => {
  await vscode.commands.executeCommand('projectManagerPro.restoreBackup');
});

register('showGlobalTasks', async () => {
  await vscode.commands.executeCommand('projectManagerPro.showGlobalTasks');
});

register('error:report', async (msg) => {
  vscode.window.showErrorMessage(t('error.webview', msg.data?.message || 'Unknown error'));
});

// ─── Handler lookup ───────────────────────────────────────────────

export function getMessageHandler(type: string): MessageHandler<any> | undefined {
  return handlers.get(type);
}
