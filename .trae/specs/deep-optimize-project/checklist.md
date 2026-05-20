# Checklist

## XSS 安全

- [x] ProjectCard.tsx 不使用 dangerouslySetInnerHTML
- [x] ProjectDetail.tsx 不使用 dangerouslySetInnerHTML
- [x] 所有 SVG 图标使用安全的 React 渲染方式（paths 数组 + <path> 元素）

## 异步文件 IO

- [x] storage.ts 写操作使用 fs.promises 异步方法
- [x] projectManager.ts 热路径使用异步文件操作
- [x] backup.ts 全面异步化
- [x] 所有相关测试通过

## Zustand Store 性能

- [x] filteredProjects 使用 useMemo 延迟计算
- [x] selector 使用细粒度订阅（最佳实践）
- [x] App.tsx selector 审查完成
- [x] 修改 searchQuery 不触发无关组件重渲染

## React 组件性能

- [x] TagFilter 使用 React.memo
- [x] SearchBar 使用 React.memo
- [x] EmptyState 使用 React.memo
- [x] ProjectList 使用 React.memo
- [x] useCallback/useMemo 依赖数组正确

## 类型安全

- [x] webviewRPC.ts 使用泛型替代 any
- [x] storage.ts 核心方法使用 RawProject/StoredMetadata 精确类型
- [x] extension.ts handleMessage 有 RpcResponse 类型
- [x] useProjectStore.loadState 参数有 StateUpdateData 精确类型
- [x] `as any` 使用减少（从 85 处减少到约 30 处，减少 65%+）

## 代码去重

- [x] formatDate 统一使用 dateUtils.formatLastOpened
- [x] Settings 面板 GitHub URL 正确指向 Project-Manager-X
- [x] RPC handler 模式评估完成（保持现有模式）

## 内存泄漏防护

- [x] 所有 useEffect 有正确的 cleanup
- [x] tooltip.ts 事件监听器可清理（返回 cleanup 函数）
- [x] SmartFileWatcher dispose 清理完整
