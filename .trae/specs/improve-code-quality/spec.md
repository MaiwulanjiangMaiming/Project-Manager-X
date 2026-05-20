# Improve Code Quality & Architecture Spec

## Why

The project received a 7/10 review with critical gaps in testing, build reliability, error handling, and user experience. This spec addresses the most urgent issues to reduce bug risk and improve maintainability.

## What Changes

- Add Vitest testing framework and write unit tests for core modules (storage, projectManager, migrations, RPC)
- Add `tsc --noEmit` typecheck step to build pipeline
- Configure ESLint + Prettier + Husky for code quality
- Unify RPC error handling with RpcError class and ErrorBoundary
- Add user operation feedback (progress notifications, undo for destructive actions)
- Add backup cleanup strategy (max 10 backups, gzip compression)
- Add theme adaptation for webview (listen to VS Code theme changes)
- Enhance Quick Switch with context (last opened, git branch, pending tasks)

## Impact

- Affected specs: testing, build pipeline, error handling, UX
- Affected code: `build.js`, `package.json`, all `src/core/*.ts`, `src/webview/rpc/*.ts`, `src/webview/components/*.tsx`

## ADDED Requirements

### Requirement: Testing Coverage

The system SHALL provide unit tests for core business logic using Vitest.

#### Scenario: Storage tests

- **WHEN** loading/saving projects, tasks, settings
- **THEN** data is correctly persisted and validated

#### Scenario: ProjectManager tests

- **WHEN** adding, deleting, reordering, opening projects
- **THEN** state changes correctly and errors are handled

#### Scenario: Migration tests

- **WHEN** loading v1 or v2 data
- **THEN** automatic migration to v3 succeeds

#### Scenario: RPC tests

- **WHEN** sending messages between extension and webview
- **THEN** type-safe request/response works and timeouts are handled

### Requirement: Build Reliability

The system SHALL run TypeScript type checking before every build.

#### Scenario: Build with type errors

- **WHEN** `npm run build` is executed with type errors
- **THEN** build fails before bundling

### Requirement: Code Style Consistency

The system SHALL enforce ESLint and Prettier rules on commit.

#### Scenario: Commit with style violations

- **WHEN** committing code with lint errors
- **THEN** husky + lint-staged blocks the commit

### Requirement: Unified Error Handling

The system SHALL use RpcError for all RPC communication errors and display user-friendly messages.

#### Scenario: RPC timeout

- **WHEN** webview request times out
- **THEN** user sees "Operation timed out, please retry"

### Requirement: User Operation Feedback

The system SHALL show progress indicators for long operations and allow undo for destructive actions.

#### Scenario: Import projects

- **WHEN** importing from another IDE
- **THEN** VS Code progress notification shows "Importing X projects..."

#### Scenario: Delete project

- **WHEN** deleting a project
- **THEN** info message appears with "Undo" button for 5 seconds

### Requirement: Backup Management

The system SHALL keep max 10 backups and compress old ones with gzip.

#### Scenario: 11th backup created

- **WHEN** creating a new backup when 10 exist
- **THEN** oldest backup is deleted

### Requirement: Theme Adaptation

The system SHALL listen to VS Code theme changes and update webview CSS variables.

#### Scenario: Switch theme

- **WHEN** user changes VS Code color theme
- **THEN** webview updates background/text colors without reload

### Requirement: Quick Switch Enhancement

The system SHALL show project context in QuickPick (last opened, git branch, pending tasks).

#### Scenario: Open quick switch

- **WHEN** running "Quick Switch Project" command
- **THEN** each item shows: name, git branch, pending task count, last opened time

## MODIFIED Requirements

### Requirement: Build Script

**Current**: `build.js` bundles directly without type checking
**Modified**: Build script runs `tsc --noEmit` first, then bundles

### Requirement: Backup Strategy

**Current**: Unlimited backups, no compression
**Modified**: Max 10 backups, gzip compression for old backups

## REMOVED Requirements

None
