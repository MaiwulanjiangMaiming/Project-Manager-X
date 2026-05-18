# 技术架构文档 - Project Manager Pro

## 1. 技术选型

### 1.1 前端框架
- **React 18**: 使用函数组件 + Hooks
- **TypeScript**: 严格类型检查
- **esbuild**: 极速构建，产物极小

### 1.2 核心依赖
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

### 1.3 为什么选 esbuild
- 构建速度比 webpack 快 100 倍
- 产物体积更小
- 内置 Tree-shaking
- 无需复杂配置

## 2. 项目结构

```
project-manager-pro/
├── src/
│   ├── extension.ts              # 扩展入口
│   ├── webview/
│   │   ├── index.tsx             # Webview 入口
│   │   ├── App.tsx               # 根组件
│   │   ├── components/
│   │   │   ├── ProjectCard.tsx   # 项目卡片
│   │   │   ├── ProjectList.tsx   # 项目列表
│   │   │   ├── TagFilter.tsx     # 标签筛选
│   │   │   ├── SearchBar.tsx     # 搜索栏
│   │   │   ├── SortDropdown.tsx  # 排序下拉
│   │   │   └── EmptyState.tsx    # 空状态
│   │   ├── hooks/
│   │   │   ├── useProjects.ts    # 项目数据管理
│   │   │   ├── useTags.ts        # 标签管理
│   │   │   └── useSearch.ts      # 搜索逻辑
│   │   ├── styles/
│   │   │   └── global.css        # 全局样式
│   │   └── types/
│   │       └── index.ts          # 类型定义
│   ├── core/
│   │   ├── projectManager.ts     # 项目管理核心
│   │   ├── storage.ts            # 存储层
│   │   └── autodetect.ts         # 自动检测
│   └── utils/
│       └── vscode.ts             # VS Code API 封装
├── package.json
├── tsconfig.json
└── build.js                      # esbuild 构建脚本
```

## 3. 核心模块设计

### 3.1 数据流
```
VS Code API <-> Storage <-> ProjectManager <-> Webview Message <-> React State
```

### 3.2 存储设计
使用 VS Code `ExtensionContext.globalState` 存储：
```typescript
interface StorageData {
  projects: Project[];
  tags: Tag[];
  settings: Settings;
}

interface Project {
  id: string;
  name: string;
  path: string;
  tags: string[];
  enabled: boolean;
  lastOpened?: number;
  type: 'favorite' | 'git' | 'mercurial' | 'svn' | 'vscode';
}

interface Tag {
  id: string;
  name: string;
  color: string;
  order: number;
}
```

### 3.3 Webview 通信
```typescript
// 扩展 -> Webview
webview.postMessage({
  type: 'projectsUpdated',
  data: { projects, tags }
});

// Webview -> 扩展
vscode.postMessage({
  type: 'openProject',
  data: { projectId, newWindow: false }
});
```

## 4. 性能优化策略

### 4.1 构建优化
- esbuild 开启 minify
- 代码分割：vendor 和 app 分离
- 内联关键 CSS

### 4.2 运行时优化
- React.memo 缓存组件
- useMemo/useCallback 优化计算
- 虚拟列表（项目超过 50 个时启用）
- 防抖搜索（150ms）

## 5. 安全考虑
- 路径验证防止目录遍历
- XSS 防护（不直接渲染用户输入）
- 仅访问工作区内的文件
