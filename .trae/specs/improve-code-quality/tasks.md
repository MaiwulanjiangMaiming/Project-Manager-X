# Tasks

- [x] Task 1: Configure testing infrastructure (Vitest + @vscode/test-cli)
  - [x] SubTask 1.1: Install vitest, @vscode/test-cli, jsdom as devDependencies
  - [x] SubTask 1.2: Create vitest.config.ts with proper setup
  - [x] SubTask 1.3: Add test scripts to package.json
  - [x] SubTask 1.4: Create src/**tests**/setup.ts with mocks for vscode API

- [x] Task 2: Add TypeScript typecheck to build pipeline
  - [x] SubTask 2.1: Update package.json scripts: "typecheck": "tsc --noEmit"
  - [x] SubTask 2.2: Update build.js to run typecheck before bundling
  - [x] SubTask 2.3: Verify build fails when type errors exist

- [x] Task 3: Configure ESLint + Prettier + Husky
  - [x] SubTask 3.1: Install eslint, @typescript-eslint, eslint-plugin-react-hooks, prettier, husky, lint-staged
  - [x] SubTask 3.2: Create eslint.config.js with TypeScript + React Hooks rules
  - [x] SubTask 3.3: Create .prettierrc with consistent formatting
  - [x] SubTask 3.4: Configure husky pre-commit hook with lint-staged
  - [x] SubTask 3.5: Run lint/prettier on existing codebase to fix initial issues

- [x] Task 4: Write unit tests for core modules
  - [x] SubTask 4.1: Write storage.test.ts (load/save/validate projects, tasks, settings)
  - [x] SubTask 4.2: Write projectManager.test.ts (add/delete/reorder/open projects)
  - [x] SubTask 4.3: Write migrations.test.ts (v1→v2→v3 migration paths)
  - [x] SubTask 4.4: Write rpc.test.ts (request/response, timeout, error handling)
  - [x] SubTask 4.5: Write backup.test.ts (backup/restore/prune logic)
  - [x] SubTask 4.6: Write dateUtils.test.ts (time formatting)

- [x] Task 5: Unify RPC error handling
  - [x] SubTask 5.1: Create RpcError class in src/webview/rpc/
  - [x] SubTask 5.2: Update webviewRPC.ts to use RpcError and add timeout handling
  - [x] SubTask 5.3: Update extension.ts RPC handlers to catch and return structured errors
  - [x] SubTask 5.4: Add ErrorBoundary React component in webview

- [x] Task 6: Add user operation feedback
  - [x] SubTask 6.1: Add vscode.window.withProgress for import, refresh, batch delete operations
  - [x] SubTask 6.2: Add undo support for delete project (5-second window with info message)
  - [x] SubTask 6.3: Add success/error toast notifications for all mutations

- [x] Task 7: Implement backup cleanup strategy
  - [x] SubTask 7.1: Add MAX_BACKUPS = 10 constant
  - [x] SubTask 7.2: Update backup.ts to delete oldest backup when limit exceeded
  - [x] SubTask 7.3: Add gzip compression for backups using zlib
  - [x] SubTask 7.4: Write tests for backup cleanup logic

- [x] Task 8: Add webview theme adaptation
  - [x] SubTask 8.1: Listen to vscode.window.onDidChangeActiveColorTheme in extension.ts
  - [x] SubTask 8.2: Post theme change message to webview with theme kind
  - [x] SubTask 8.3: Update webview CSS variables dynamically based on theme
  - [x] SubTask 8.4: Test in both dark and light themes

- [x] Task 9: Enhance Quick Switch with context
  - [x] SubTask 9.1: Update quickSwitch command to fetch git branch for each project
  - [x] SubTask 9.2: Count pending tasks per project
  - [x] SubTask 9.3: Format QuickPickItem with description/detail showing context
  - [x] SubTask 9.4: Sort by lastOpened descending

# Task Dependencies

- Task 4 depends on Task 1 (testing infrastructure)
- Task 5 depends on Task 2 (type safety)
- Task 6 depends on Task 5 (error handling foundation)
- Task 7 can run in parallel with Task 8 and Task 9
