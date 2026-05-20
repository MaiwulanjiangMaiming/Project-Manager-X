# Checklist

## Testing Infrastructure

- [x] Vitest installed and configured
- [x] @vscode/test-cli installed
- [x] Test scripts added to package.json (test, test:watch)
- [x] vscode API mocks created in setup.ts
- [x] All tests pass: `npm test`

## Build Reliability

- [x] `tsc --noEmit` runs successfully with no errors
- [x] Build script runs typecheck before bundling
- [x] Build fails when type errors are introduced

## Code Style

- [x] ESLint configured with TypeScript and React Hooks rules
- [x] Prettier configured with consistent formatting
- [x] Husky pre-commit hook active
- [x] lint-staged runs on commit
- [x] Existing codebase passes lint/prettier checks

## Core Module Tests

- [x] storage.test.ts covers load/save/validate for projects, tasks, settings
- [x] projectManager.test.ts covers add/delete/reorder/open
- [x] migrations.test.ts covers v1→v2→v3 paths
- [x] rpc.test.ts covers request/response, timeout, error scenarios
- [x] backup.test.ts covers backup/restore/prune logic
- [x] dateUtils.test.ts covers time formatting

## Error Handling

- [x] RpcError class exists and is used for all RPC errors
- [x] webviewRPC.ts handles timeouts gracefully
- [x] extension.ts returns structured error responses
- [x] ErrorBoundary React component wraps webview UI

## User Feedback

- [x] Import operation shows progress notification
- [x] Refresh operation shows progress notification
- [x] Batch delete shows progress notification
- [x] Delete project shows undo button for 5 seconds
- [x] Success/error toasts appear for all mutations

## Backup Management

- [x] MAX_BACKUPS = 10 enforced
- [x] Oldest backup deleted when limit exceeded
- [x] Backups compressed with gzip
- [x] Backup cleanup tests pass

## Theme Adaptation

- [x] extension.ts listens to theme changes
- [x] Theme change message posted to webview
- [x] Webview CSS variables update without reload
- [x] Verified in dark and light themes

## Quick Switch Enhancement

- [x] Git branch shown for each project
- [x] Pending task count shown
- [x] Last opened time shown
- [x] Items sorted by lastOpened descending
