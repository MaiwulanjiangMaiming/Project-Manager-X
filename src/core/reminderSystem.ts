import * as vscode from 'vscode';
import { Task } from '../types';

export class ReminderSystem {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  scheduleReminder(task: Task): void {
    this.cancelReminder(task.id);
    if (!task.dueDate) return;

    const now = Date.now();
    const reminderTime = task.dueDate - 24 * 60 * 60 * 1000;
    const delay = reminderTime - now;

    if (delay <= 0) {
      this.showReminder(task);
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

  private showReminder(task: Task): void {
    const dueDate = new Date(task.dueDate!);
    const formatted = dueDate.toLocaleDateString();
    vscode.window.showWarningMessage(
      `Task "${task.title}" is due ${formatted}`,
      'View Task'
    );
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
