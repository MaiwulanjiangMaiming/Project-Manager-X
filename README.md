# Project Manager Pro

<p align="center">
  <img src="https://raw.githubusercontent.com/MaiwulanjiangMaiming/Project-Manager-Pro/main/resources/icon.png" alt="Project Manager Pro Logo" width="120"/>
</p>

<p align="center">
  <a href="https://github.com/MaiwulanjiangMaiming/Project-Manager-Pro">
    <img src="https://img.shields.io/badge/GitHub-Project--Manager--Pro-181717?logo=github" alt="GitHub"/>
  </a>
</p>

A powerful VS Code extension for managing your projects with tags, tasks, milestones, and smart organization.

## Features

- **Project Management**: Save, organize, and quickly switch between projects
- **Tag System**: Color-coded tags with drag-and-drop assignment
- **Task Management**: Create, track, and manage tasks with priorities and categories
- **Milestones**: Track project progress with deadline-based milestones
- **Smart Sorting**: Sort by name, path, recent access, priority, or custom order
- **Auto Detection**: Automatically discover Git repositories and VS Code workspaces
- **Lifecycle Tracking**: Auto-infer project status (idea, planning, active, maintenance, archived)
- **Global Task View**: See all tasks across projects in one place
- **Context Snapshots**: Save and restore project context (active files, git branch, notes)
- **Changelog**: Track project changes with versioned entries
- **Import**: Import projects from other Project Manager extensions

## Quick Start

1. Install the extension from VS Code Marketplace
2. Open the **Project Manager Pro** view in the sidebar
3. Click **Save Current Project** to add your first project
4. Use **Scan for Projects** to auto-discover existing repositories

## Usage

### Managing Projects

- **Save Project**: Save the current workspace as a project
- **Open Project**: Click to open, double-click to open in new window
- **Reorder**: Drag and drop to set custom order (switches to Custom sort)
- **Manage Mode**: Select multiple projects for batch deletion
- **Tags**: Drag projects onto tags to assign, drag again to remove

### Tasks

- Create tasks with categories (bug, feature, refactor, docs, research, chore, experiment)
- Set priorities (critical, high, medium, low)
- Track status: backlog → todo → in_progress → review → done
- Use **Global Tasks** to see all tasks across projects

### Tags

- Create color-coded tags
- Edit tag name and color by clicking the pencil icon
- Reorder tags by dragging
- Filter projects by clicking a tag

### Settings

- `projectManagerPro.autoDetect`: Auto-detect projects on startup
- `projectManagerPro.showGitStatus`: Show Git branch in project card
- `projectManagerPro.compactView`: Default to compact view mode
- `projectManagerPro.enableReminders`: Enable task deadline reminders

## Configuration

```json
{
  "projectManagerPro.autoDetect": true,
  "projectManagerPro.showGitStatus": true,
  "projectManagerPro.compactView": false,
  "projectManagerPro.enableReminders": true
}
```

## Import from Other Extensions

Import projects from:
- VS Code Project Manager (alefragnani)
- Trae / Trae CN
- Cursor
- Windsurf

The extension automatically detects installed IDEs and their project data.

## Architecture

```
Project Manager Pro/
├── src/
│   ├── extension.ts          # Main entry point
│   ├── core/                 # Core modules
│   │   ├── storage.ts        # Data persistence
│   │   ├── projectManager.ts # Business logic
│   │   ├── container.ts      # Dependency injection
│   │   ├── migrations.ts     # Data migrations
│   │   ├── backup.ts         # Auto backup
│   │   ├── smartWatcher.ts   # File watcher
│   │   ├── statusBar.ts      # Status bar integration
│   │   └── reminderSystem.ts # Task reminders
│   ├── commands/             # VS Code commands
│   ├── webview/              # React frontend
│   │   ├── store/            # Zustand state
│   │   ├── components/       # UI components
│   │   └── styles/           # CSS
│   └── types/                # TypeScript types
├── dist/                     # Build output
└── README.md
```

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## License

MIT License

## Contact

- GitHub: [MaiwulanjiangMaiming/Project-Manager-Pro](https://github.com/MaiwulanjiangMaiming/Project-Manager-Pro)
- Report issues: [GitHub Issues](https://github.com/MaiwulanjiangMaiming/Project-Manager-Pro/issues)

---

**Organize your projects like a pro!**
