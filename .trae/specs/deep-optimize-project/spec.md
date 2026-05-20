# Deep Optimize Project Spec

## Why

第一轮代码质量改进（测试、lint、错误处理）已完成，但深度分析发现仍存在性能瓶颈（同步文件 IO 阻塞、全量数据加载、缺少 React memo）、类型安全缺陷（85 处 `as any`、33 处 `: any`）、XSS 风险（dangerouslySetInnerHTML）、以及内存泄漏风险。用户特别强调要少占用系统内存和算力。

## What Changes

- 消除 dangerouslySetInnerHTML 的 XSS 风险，改用安全的 SVG 渲染方式
- 将核心模块的同步文件 IO 改为异步，减少主线程阻塞
- 优化 Zustand store 结构，按领域拆分避免无关重渲染
- 为 React 组件添加 memo/useMemo/useCallback 优化
- 减少 `any` 类型使用，提升类型安全
- 优化搜索为延迟计算（不在每次渲染时全量过滤）
- 修复 Settings 面板中 GitHub URL 指向错误（Pro → X）
- 统一 formatDate 工具函数（ProjectCard 和 dateUtils 重复实现）

## Impact

- Affected specs: performance, type safety, security, memory
- Affected code: `src/webview/components/ProjectCard.tsx`, `src/webview/components/ProjectDetail.tsx`, `src/webview/store/useProjectStore.ts`, `src/webview/App.tsx`, `src/core/storage.ts`, `src/core/projectManager.ts`, `src/types/index.ts`

## ADDED Requirements

### Requirement: XSS 安全

系统 SHALL 不使用 dangerouslySetInnerHTML 渲染用户可控内容。

#### Scenario: SVG 图标渲染

- **WHEN** 渲染项目类型图标
- **THEN** 使用 React 组件而非 dangerouslySetInnerHTML

### Requirement: 异步文件 IO

系统 SHALL 在扩展主线程中使用异步文件操作，避免阻塞 UI。

#### Scenario: 保存项目数据

- **WHEN** 调用 storage.saveProjects
- **THEN** 使用 fs.promises.writeFile 而非 writeFileSync

### Requirement: Zustand Store 拆分

系统 SHALL 将单一 store 拆分为按领域的 selector，避免无关组件重渲染。

#### Scenario: 只修改 searchQuery

- **WHEN** 用户输入搜索关键词
- **THEN** 只有依赖 searchQuery 的组件重渲染，项目列表不因 tags 变化而重渲染

### Requirement: 搜索性能优化

系统 SHALL 使用 useMemo 延迟计算过滤结果，避免每次渲染都执行全量过滤。

#### Scenario: 输入搜索

- **WHEN** 用户在搜索框输入
- **THEN** 过滤计算仅在依赖项变化时执行

### Requirement: 类型安全提升

系统 SHALL 减少 `any` 类型使用，核心业务逻辑文件零 `any`。

#### Scenario: RPC 类型

- **WHEN** 定义 RPC 请求/响应
- **THEN** 使用泛型而非 any

### Requirement: 内存优化

系统 SHALL 确保事件监听器和定时器在组件卸载时正确清理，避免内存泄漏。

#### Scenario: 组件卸载

- **WHEN** React 组件卸载
- **THEN** 所有 addEventListener 注册的处理器被移除

## MODIFIED Requirements

### Requirement: formatDate 工具函数

**Current**: ProjectCard 和 dateUtils 各自实现 formatDate
**Modified**: 统一使用 src/utils/dateUtils.ts 的 formatLastOpened

### Requirement: Settings 面板 URL

**Current**: GitHub URL 指向 Project-Manager-Pro
**Modified**: 指向 Project-Manager-X

## REMOVED Requirements

None
