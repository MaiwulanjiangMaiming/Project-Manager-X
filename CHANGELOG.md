# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-06-05

### Fixed

- **Refresh button now updates the webview** — the `refreshProjects` command reloaded data from disk but never pushed it to the webview, so clicking refresh had no visible effect
- **Restore Backup now refreshes the webview** — after restoring a backup, the project list and metadata are reloaded and the UI updates immediately
- **Auto Match Workspace now refreshes the webview** — after matching the current workspace, the project list reflects the updated `lastOpened` timestamp
- **Self-write detection prevents unnecessary disk reloads** — when this IDE writes `projects.json` or `metadata.json`, the file watcher now recognises the content hash and skips the reload instead of re-reading the file we just wrote (which could race and surface stale data)
- **`onDidDelete` no longer causes project list to flicker** — during an atomic rename (temp→target), the old file is deleted and a new one created. The watcher now waits 300ms before reacting to a delete event, so the list doesn't briefly go empty

### Changed

- **Metadata (tags, tasks, milestones, notes, snapshots, changelog, settings) now stored in `metadata.json` on disk** instead of VS Code's `globalState`. This means all IDEs sharing the same `~/.project-manager-pro/` directory (VS Code, Trae, Cursor, Windsurf) now see the same tags, tasks, and other metadata in real time
- **Automatic migration from `globalState` to `metadata.json`** — on first activation, if `metadata.json` does not exist but `globalState` has data, the extension migrates it to the shared file and clears the legacy key
- **SmartFileWatcher now tracks hashes per file** — `lastHash: string` replaced with `lastWriteHashes: Map<string, string>` so `projects.json` and `metadata.json` are tracked independently
- **`Storage.onAfterWrite` callback signature changed** — from `(content: string)` to `(key: string, content: string)` to identify which file was written
- **`Container.onRefreshNeeded` callback added** — command handlers can now trigger a webview refresh without a direct reference to the provider

## [1.0.1] - 2026-05-19

### Security

- Fixed XSS vulnerability by replacing `dangerouslySetInnerHTML` with safe SVG rendering

### Performance

- Converted file I/O operations from synchronous to asynchronous (storage, backup, project scanning)
- Optimized Zustand store: moved `filteredProjects` from store method to `useMemo` for lazy computation
- Added `React.memo` to TagFilter, SearchBar, EmptyState, and ProjectList to prevent unnecessary re-renders

### Type Safety

- Added generic types to `webviewRPC.ts` (replacing `any`)
- Introduced `RawProject` and `StoredMetadata` interfaces in `storage.ts`
- Added `RpcResponse` union type in `extension.ts`
- Added `StateUpdateData` interface for `useProjectStore.loadState`
- Reduced `any` type usage by 65%+

### Code Quality

- Unified `formatDate` function across components (using `dateUtils.formatLastOpened`)
- Fixed Settings panel GitHub URL (Project-Manager-Pro → Project-Manager-X)
- Configured ESLint + Prettier + Husky + lint-staged for code quality
- Added comprehensive test suite (65 tests covering storage, projectManager, migrations, RPC, backup, dateUtils)

### User Experience

- Added progress notifications for import, refresh, and batch delete operations
- Added undo support for project deletion (5-second window)
- Added success toasts for all mutation operations
- Enhanced Quick Switch with Git branch, pending task count, and last opened time
- Added webview theme adaptation (dark/light/high contrast)

### Memory & Stability

- Made tooltip event listeners cleanable (return cleanup function)
- Verified all useEffect cleanup functions
- Confirmed SmartFileWatcher dispose chain is complete

## [1.0.0] - 2026-05-18

### Added

- **Project Management**: Save, organize, and quickly switch between projects with a beautiful sidebar UI.
- **Tags System**: Color-coded tags with drag-and-drop assignment, inline editing, and reordering.
- **Custom Sorting**: Drag projects to reorder; automatically switches to "Custom" sort mode.
- **Multi-IDE Import**: Import projects from VS Code, Trae, Trae CN, Cursor, and Windsurf with a selection dialog.
- **Remote Project Support**: Open SSH, Docker, WSL, Dev Container, and GitHub Codespaces projects correctly.
- **Task Management**: Create tasks with categories (bug, feature, refactor, docs, research, chore, experiment), priorities (critical, high, medium, low), and status tracking (backlog, todo, in_progress, review, done, blocked, cancelled).
- **Global Task View**: View and manage tasks across all projects in a unified interface.
- **Milestones**: Track project milestones with progress indicators and task linkage.
- **Lifecycle Tracking**: Automatic lifecycle inference (idea → planning → active → maintenance → archived).
- **Context Snapshots**: Save and restore project context (open files, cursor position, git branch).
- **Notes**: Rich text notes for each project.
- **Changelog**: Track project changes with versioned entries.
- **Batch Operations**: Select and delete multiple projects at once with a unified confirmation dialog.
- **Keyboard Navigation**: Full keyboard support with arrow keys, Enter, Ctrl+Enter, Delete, and `/` for search.
- **Data Validation**: Zod schema validation for all data with automatic migrations (v1 → v2 → v3).
- **Auto Backup**: Automatic backup before destructive operations.
- **Smart File Watcher**: MD5-based file change detection with debouncing.
- **Status Bar Integration**: Show current project and quick-switch in the status bar.
- **Task Reminders**: Due date reminders with configurable settings.
- **Settings Panel**: GitHub link, Get Started guide, and Report Issue quick access.

### Architecture

- React + TypeScript frontend with Zustand state management.
- Type-safe RPC communication between extension and webview.
- Dependency injection container for core modules.
- MessageQueue to guarantee no messages are lost during webview initialization.
