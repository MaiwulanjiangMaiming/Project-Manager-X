/**
 * Project Manager X — lightweight i18n module.
 *
 * Uses VS Code's `vscode.env.language` to detect the user's locale and
 * returns translated strings for all user-facing text.  Falls back to
 * English when a key is missing in the active locale.
 */

type TranslationKey = string;
type TranslationMap = Record<TranslationKey, string>;

const en: TranslationMap = {
  // Notifications
  'project.saved': 'Project "{0}" saved',
  'project.deleted': 'Project "{0}" deleted',
  'project.restored': 'Project "{0}" restored',
  'project.updated': 'Project updated',
  'project.reordered': 'Projects reordered',
  'project.validationFailed': 'Project data validation failed. Using empty project list.',
  'project.pathUnsafe':
    'projectManagerPro.projectsLocation must be under your home directory. Falling back to default.',
  'project.migrated': 'Project Manager X: migrated metadata to shared file for cross-IDE sync.',
  'project.readFailed':
    'Project Manager X: failed to read projects.json after {0} attempts. Keeping previous data. ({1})',
  'project.metadataReadFailed':
    'Project Manager X: failed to read metadata.json after {0} attempts. ({1})',

  // Tags
  'tag.added': 'Tag "{0}" added',
  'tag.updated': 'Tag updated',
  'tag.deleted': 'Tag deleted',

  // Tasks
  'task.created': 'Task created',
  'task.updated': 'Task updated',
  'task.deleted': 'Task deleted',

  // Milestones
  'milestone.created': 'Milestone created',

  // Notes
  'note.created': 'Note created',

  // Batch
  'batch.deleteConfirm': 'Delete {0} project{1}? This cannot be undone.',
  'batch.deleting': 'Deleting {0} project{1}...',
  'batch.deleted': 'Deleted {0} project{1}',

  // Progress
  'progress.refreshing': 'Refreshing projects...',
  'progress.importing': 'Importing projects...',

  // External
  'external.blocked': 'Blocked external URL: {0}',
  'external.invalid': 'Invalid URL: {0}',

  // Errors
  'error.webview': 'Webview error: {0}',

  // Commands
  'command.quickSwitch': 'Quick Switch Project',
  'command.saveProject': 'Save Current Project',
  'command.autoMatch': 'Auto Match Workspace',
  'command.export': 'Export Projects',
  'command.restoreBackup': 'Restore Backup',
  'command.showGlobalTasks': 'Show Global Tasks',
  'command.openProjectDetail': 'Open Project Detail',
};

const zh: TranslationMap = {
  // Notifications
  'project.saved': '项目 "{0}" 已保存',
  'project.deleted': '项目 "{0}" 已删除',
  'project.restored': '项目 "{0}" 已恢复',
  'project.updated': '项目已更新',
  'project.reordered': '项目已重新排序',
  'project.validationFailed': '项目数据验证失败，使用空项目列表。',
  'project.pathUnsafe': 'projectManagerPro.projectsLocation 必须在用户主目录下，回退到默认路径。',
  'project.migrated': 'Project Manager X：已将元数据迁移到共享文件以支持跨 IDE 同步。',
  'project.readFailed':
    'Project Manager X：读取 projects.json 失败（尝试 {0} 次），保留之前的数据。({1})',
  'project.metadataReadFailed': 'Project Manager X：读取 metadata.json 失败（尝试 {0} 次）。({1})',

  // Tags
  'tag.added': '标签 "{0}" 已添加',
  'tag.updated': '标签已更新',
  'tag.deleted': '标签已删除',

  // Tasks
  'task.created': '任务已创建',
  'task.updated': '任务已更新',
  'task.deleted': '任务已删除',

  // Milestones
  'milestone.created': '里程碑已创建',

  // Notes
  'note.created': '笔记已创建',

  // Batch
  'batch.deleteConfirm': '删除 {0} 个项目？此操作无法撤销。',
  'batch.deleting': '正在删除 {0} 个项目...',
  'batch.deleted': '已删除 {0} 个项目',

  // Progress
  'progress.refreshing': '正在刷新项目...',
  'progress.importing': '正在导入项目...',

  // External
  'external.blocked': '已阻止外部 URL：{0}',
  'external.invalid': '无效 URL：{0}',

  // Errors
  'error.webview': 'Webview 错误：{0}',

  // Commands
  'command.quickSwitch': '快速切换项目',
  'command.saveProject': '保存当前项目',
  'command.autoMatch': '自动匹配工作区',
  'command.export': '导出项目',
  'command.restoreBackup': '恢复备份',
  'command.showGlobalTasks': '查看全局任务',
  'command.openProjectDetail': '打开项目详情',
};

const locales: Record<string, TranslationMap> = { en, zh };

/** Detect the user's locale from VS Code and return the best matching translation map. */
function getLocaleMap(locale: string): TranslationMap {
  // e.g. "zh-cn" → "zh", "zh-tw" → "zh", "en" → "en", "en-us" → "en"
  const lang = locale.split('-')[0].toLowerCase();
  return locales[lang] ?? locales.en;
}

let currentLocale: string = 'en';
let currentMap: TranslationMap = locales.en;

/**
 * Initialise the i18n module with the given VS Code locale string.
 * Call once during activation.
 */
export function initI18n(locale: string): void {
  currentLocale = locale;
  currentMap = getLocaleMap(locale);
}

/** Get the current locale string (e.g. "zh-cn", "en"). */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Look up a translated string by key.  Supports simple positional
 * placeholders: `{0}`, `{1}`, etc.  Falls back to English if the key
 * is not found in the active locale.
 */
export function t(key: string, ...args: (string | number)[]): string {
  let template = currentMap[key] ?? locales.en[key] ?? key;
  for (let i = 0; i < args.length; i++) {
    template = template.replace(`{${i}}`, String(args[i]));
  }
  return template;
}

/**
 * Return all translations for the current locale as a flat Record.
 * Useful for passing to the webview so it can render translated strings.
 */
export function getTranslations(): Record<string, string> {
  // Merge English (base) with current locale overrides
  return { ...locales.en, ...currentMap };
}
