# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2026-06-08

### Changed

- **Async file loading** — `loadProjectsFromFile` and `loadMetadataFromFile` now use `fs.promises.readFile` instead of `fs.readFileSync`; a new `async init()` method pre-loads the cache during activation so all subsequent sync getters (`getProjects`, `getTasks`, etc.) return from memory without blocking the event loop; `forceReloadProjects` and `forceReloadMetadata` also use async I/O internally
- **Windows atomic write fix** — `atomicWriteFile` detects `EPERM`/`EEXIST`/`EACCES` errors from `rename()` (which fails on Windows when the target exists) and falls back to `copyFile` + `unlink`; both `saveProjectsToFile` and `saveMetadataToFile` share the new helper
- **WebviewMessage discriminated union** — replaced the loose `{ type: MessageType; data?: any }` interface with a discriminated union where each `type` maps to a specific `data` shape; the handler registry is now generic so each handler receives the correctly-typed message variant with full IntelliSense support
- **Internationalization (i18n)** — added `src/core/i18n.ts` with a lightweight key-value translation system supporting English and Chinese; all user-facing notifications in `messageHandlers.ts` and `storage.ts` now use `t('key', ...args)` instead of hardcoded strings; the webview receives `locale` and `i18n` translations via the state update so the frontend can render localized text

### Added

- `Storage.init()` — async method to pre-load data from disk; called during `activate()` before any sync getter is used
- `locale` and `i18n` fields in webview state update — enables frontend localization

## [1.2.2] - 2026-06-08

### Fixed

- **`detectProjectType` returns specific types** — projects with `package.json`, `Cargo.toml`, `go.mod`, `requirements.txt`/`pyproject.toml`/`setup.py`, or `pom.xml`/`build.gradle` are now classified as `node`, `rust`, `go`, `python`, or `java` instead of the generic `any`; new icons (🟢🦀🔷🐍☕) and labels added to `PROJECT_ICONS`

### Changed

- **`quickSwitch` reads Git branch asynchronously** — replaced synchronous `fs.existsSync`/`fs.readFileSync` with `fs.promises.stat`/`fs.promises.readFile` plus a short-lived local cache, preventing UI thread blocking
- **`getLatestSnapshot` uses TTL-based cache** — a 5-second in-memory cache avoids repeated disk reads for the same project's latest snapshot
- **`findGitRepos` scans directories in parallel** — replaced serial `for…of` loop with `Promise.all` so all subdirectories are scanned concurrently
- **`deleteProject` delegates to storage** — the method now calls `storage.deleteProject()` directly, which performs a single-pass bulk delete instead of iterating and deleting tasks one by one

## [1.2.1] - 2026-06-08

### Fixed

- **Undo restores all associated data** — deleting a project now saves milestones, changelog, snapshots, and notes alongside tasks; undoing restores everything, not just the project and tasks

### Changed

- **Drag-and-drop visual feedback** — dragged item fades to 40% opacity; drop target shows a blue indicator line above or below based on cursor position; cleanup on drag end is robust

### Added

- **Project description editor** — the Description section in Project Detail is now always visible and clickable; clicking opens an inline textarea to add or edit the description; empty descriptions show a "Click to add a description..." placeholder
- **Multi-format export** — the Export command now prompts for format (Markdown, JSON, or CSV) before saving; JSON includes full project + task data; CSV provides a flat table suitable for spreadsheet import

## [1.2.0] - 2026-06-08

### Added

- **Current workspace highlight** — the project matching the currently open workspace is visually highlighted with a green left border, subtle background tint, and a checkmark badge; remote projects are exempt
- **Keyboard shortcuts** — `Ctrl+Alt+P` / `Cmd+Alt+P` for Quick Switch, `Ctrl+Alt+S` / `Cmd+Alt+S` for Save Current Project

### Changed

- **Message handler registry** — the 250-line `handleMessageInner` switch statement has been refactored into a `MessageHandler` map in `src/core/messageHandlers.ts`; each message type is now an independent, testable function
- **`getStorageData` returns `StorageData`** — replaced `any` return type with the proper `StorageData` interface
- **`GlobalTaskView` uses normal ESM import** — replaced dynamic `require()` with a standard `import` statement
- **Removed `saveNote` alias** — `saveNote` was just a wrapper around `updateNote`; all callers now use `updateNote` directly

## [1.1.0] - 2026-06-08

### Added

- **Configurable reminder advance hours** — new `projectManagerPro.reminderAdvanceHours` setting (default 24h, range 1–168h) controls how far in advance task reminders fire
- **Reminder polling** — new `projectManagerPro.reminderIntervalMinutes` setting (default 60min, range 5–1440min) adds periodic polling so reminders survive VS Code window restarts; overdue tasks now trigger an error-level notification
- **Project path validity detection** — projects whose local path no longer exists on disk are visually flagged with a warning icon, reduced opacity, and strikethrough path text; remote projects are exempt

### Security

- **CSP tightened** — added `img-src https: data:`, `connect-src https:`, and `font-src https:` to the Content Security Policy; `style-src 'unsafe-inline'` retained with comment explaining it is required for build-time CSS injection
- **openExternal URL whitelist** — `openExternal` messages now only allow `github.com`, `github.io`, `githubusercontent.com` domains and `mailto:` scheme; other URLs are blocked with a warning
- **Import data Zod validation** — `importFromProjectManager` now validates each imported item with a Zod schema before processing; invalid entries are skipped and reported
- **Path traversal protection** — `projectsLocation` config is now validated to be under the user's home directory; unsafe paths fall back to default with a warning

## [1.0.3] - 2026-06-08

### Fixed

- **ID generation now uses nanoid** — replaced `Date.now()+Math.random().substr()` with `nanoid()` for collision-resistant unique IDs; also replaced deprecated `substr` with `substring` in webviewRPC
- **Batch operations now write to disk once** — `batchDeleteTasks`, `batchUpdateTaskStatus`, and `batchDeleteProjects` previously triggered N disk writes for N items; now they modify data in memory and write once
- **Backup now includes metadata.json** — BackupManager previously only backed up projects.json; tags, tasks, milestones, notes, snapshots, and changelog were not included. Both files are now backed up together with matching timestamps and restored as a pair
- **Settings panel version now reads from extension** — the version display was hardcoded as `1.0.1` and fell out of sync with package.json; it now reads the version dynamically from the extension

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
