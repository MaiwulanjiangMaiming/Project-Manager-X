# Tasks

- [x] Task 1: 修复 XSS 风险 — 消除 dangerouslySetInnerHTML
  - [x] SubTask 1.1: 在 types/index.ts 中将 PROJECT_ICONS 的 svg 字段改为 paths 数组
  - [x] SubTask 1.2: 更新 ProjectCard.tsx 使用安全的 SVG 渲染方式
  - [x] SubTask 1.3: 更新 ProjectDetail.tsx 消除 dangerouslySetInnerHTML

- [x] Task 2: 异步文件 IO — 将核心模块同步 IO 改为异步
  - [x] SubTask 2.1: 将 storage.ts 的写操作改为 fs.promises 异步方法
  - [x] SubTask 2.2: 将 projectManager.ts 的热路径 IO 改为异步
  - [x] SubTask 2.3: 将 backup.ts 全面异步化
  - [x] SubTask 2.4: 更新相关测试适配异步接口

- [x] Task 3: Zustand Store 性能优化
  - [x] SubTask 3.1: 将 filteredProjects 从 store 方法改为 useMemo 计算属性
  - [x] SubTask 3.2: 保持细粒度 selector（已是最佳实践）
  - [x] SubTask 3.3: 审查 App.tsx selector 订阅方式

- [x] Task 4: React 组件性能优化
  - [x] SubTask 4.1: 为 TagFilter、SearchBar、EmptyState 添加 React.memo
  - [x] SubTask 4.2: 为 ProjectList 添加 React.memo
  - [x] SubTask 4.3: 审查所有 useCallback/useMemo 依赖数组正确性

- [x] Task 5: 类型安全提升 — 减少 any 使用
  - [x] SubTask 5.1: 为 webviewRPC.ts 添加泛型类型定义
  - [x] SubTask 5.2: 为 storage.ts 添加 RawProject 和 StoredMetadata 类型
  - [x] SubTask 5.3: 为 extension.ts 添加 RpcResponse 类型
  - [x] SubTask 5.4: 为 useProjectStore 的 loadState 添加 StateUpdateData 类型

- [x] Task 6: 代码去重与统一
  - [x] SubTask 6.1: 统一 formatDate — ProjectCard 使用 dateUtils.formatLastOpened
  - [x] SubTask 6.2: 修复 Settings 面板 GitHub URL（Pro → X）
  - [x] SubTask 6.3: 评估 RPC handler 模式提取（跳过，各 handler 差异大）

- [x] Task 7: 内存泄漏防护
  - [x] SubTask 7.1: 审查所有 useEffect 的 cleanup 函数
  - [x] SubTask 7.2: tooltip.ts 事件监听器改为可清理（返回 cleanup 函数）
  - [x] SubTask 7.3: SmartFileWatcher dispose 确认正确清理

# Task Dependencies

- Task 2 depends on Task 5 (类型安全提升后再改异步，避免类型错误)
- Task 3 and Task 4 can run in parallel
- Task 6 can run in parallel with Task 1
- Task 7 can run in parallel with Task 3 and Task 4
