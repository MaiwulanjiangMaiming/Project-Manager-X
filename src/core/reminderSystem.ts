import * as vscode from 'vscode';
import { Task } from '../types';

export class ReminderSystem {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private lastRemindedTaskIds: Set<string> = new Set();

  scheduleReminder(task: Task): void {
    this.cancelReminder(task.id);
    if (!task.dueDate) return;

    const config = vscode.workspace.getConfiguration('projectManagerPro');
    const advanceHours = config.get<number>('reminderAdvanceHours', 24);
    const advanceMs = advanceHours * 60 * 60 * 1000;

    const now = Date.now();
    const reminderTime = task.dueDate - advanceMs;
    const delay = reminderTime - now;

    if (delay <= 0) {
      // Already within the reminder window
      if (!this.lastRemindedTaskIds.has(task.id)) {
        this.showReminder(task);
      }
      return;
    }

    const timer = setTimeout(() => {
      this.showReminder(task);
      this.timers.delete(task.id);
    }, delay);
    this.timers.set(task.id, timer);
  }

  cancelReminder(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  refreshReminders(tasks: Task[]): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    const config = vscode.workspace.getConfiguration('projectManagerPro');
    if (!config.get<boolean>('enableReminders', true)) return;

    for (const task of tasks) {
      if (task.dueDate && task.status !== 'done' && task.status !== 'cancelled') {
        this.scheduleReminder(task);
      }
    }
  }

  /**
   * Start a polling-based check that survives VS Code window restarts.
   * Checks all tasks periodically instead of relying solely on setTimeout.
   */
  startPolling(getTasks: () => Task[]): void {
    this.stopPolling();

    const config = vscode.workspace.getConfiguration('projectManagerPro');
    const intervalMinutes = config.get<number>('reminderIntervalMinutes', 60);

    // Do an immediate check
    this.pollCheck(getTasks);

    this.pollTimer = setInterval(
      () => {
        this.pollCheck(getTasks);
      },
      intervalMinutes * 60 * 1000
    );
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private pollCheck(getTasks: () => Task[]): void {
    const config = vscode.workspace.getConfiguration('projectManagerPro');
    if (!config.get<boolean>('enableReminders', true)) return;

    const advanceHours = config.get<number>('reminderAdvanceHours', 24);
    const advanceMs = advanceHours * 60 * 60 * 1000;
    const now = Date.now();

    const tasks = getTasks();
    for (const task of tasks) {
      if (!task.dueDate || task.status === 'done' || task.status === 'cancelled') continue;

      const timeUntilDue = task.dueDate - now;
      // Show reminder if within the advance window and not yet reminded
      if (timeUntilDue <= advanceMs && timeUntilDue > 0 && !this.lastRemindedTaskIds.has(task.id)) {
        this.showReminder(task);
      }
      // Overdue tasks
      if (timeUntilDue <= 0 && !this.lastRemindedTaskIds.has(task.id + '-overdue')) {
        this.showOverdueReminder(task);
      }
    }
  }

  private showReminder(task: Task): void {
    this.lastRemindedTaskIds.add(task.id);
    const dueDate = new Date(task.dueDate!);
    const formatted = dueDate.toLocaleDateString();
    vscode.window.showWarningMessage(`Task "${task.title}" is due ${formatted}`, 'View Task');
  }

  private showOverdueReminder(task: Task): void {
    this.lastRemindedTaskIds.add(task.id + '-overdue');
    vscode.window.showErrorMessage(`Task "${task.title}" is overdue!`);
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.stopPolling();
  }
}
