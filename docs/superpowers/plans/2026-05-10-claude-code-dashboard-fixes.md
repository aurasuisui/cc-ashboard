# CC Dashboard — 安全与功能修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复代码审查中发现的严重安全问题和重要功能缺陷，使 MVP 达到安全可用的状态。

**Architecture:** 在现有 monorepo 结构上修改，server/ 增加输入校验层和错误处理，client/ 补全 WebSocket 数据通路。不引入新依赖或新文件。

**Tech Stack:** Node.js, Express, TypeScript, SQLite (better-sqlite3), ws, React 18, Vite, Zustand

---

## 第一阶段：安全与稳定性

### Task 1: git-manager 路径校验防命令注入

**Files:**
- Modify: `server/src/git-manager.ts`

**问题:** `repoPath`、`branchName`、`worktreePath` 来自用户输入，直接拼入 shell 命令字符串，存在命令注入风险。

- [ ] **Step 1: 添加路径校验函数**

在 `git-manager.ts` 顶部添加：

```typescript
function validatePath(input: string, label: string): string {
  // Must be an absolute or relative path containing only safe characters
  if (!/^[a-zA-Z0-9_\-\.\/\\:]+$/.test(input)) {
    throw new Error(`Invalid ${label}: contains unsafe characters`);
  }
  // Reject path traversal
  if (input.includes('..')) {
    throw new Error(`Invalid ${label}: path traversal not allowed`);
  }
  return input;
}
```

- [ ] **Step 2: 在每个 git 方法中调用校验**

在 `createWorktree` 中校验 `repoPath` 和 `branchName`；
在 `mergeToMain` 中校验 `repoPath`、`branchName`、`mainBranch`；
在 `removeWorktree` 中校验 `worktreePath`；
在 `getDiff` 中校验 `repoPath`、`branchName`、`mainBranch`。

- [ ] **Step 3: 提交**

```bash
git add server/src/git-manager.ts
git commit -m "fix: add path validation to prevent command injection in git operations"
```

---

### Task 2: API 路由输入校验

**Files:**
- Modify: `server/src/routes/projects.ts`
- Modify: `server/src/routes/tasks.ts`
- Modify: `server/src/routes/workers.ts`

**问题:** 所有路由直接使用 `req.body`，无任何校验。空标题、无效状态、非法优先级均可写入数据库。

- [ ] **Step 1: 添加校验辅助函数**

在 `server/src/routes/projects.ts` 开头添加：

```typescript
function requireField(body: Record<string, unknown>, field: string, label: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  return String(value);
}

const VALID_STATUSES = ['todo', 'analyzing', 'in-progress', 'review', 'merged'] as const;
const VALID_PRIORITIES = ['low', 'normal', 'high'] as const;
```

- [ ] **Step 2: 校验 projects 路由**

在 `POST /` 中校验 `name` 为必填非空字符串。
在 `POST /` 中校验 `workerCount` 为 1-10 的整数。

- [ ] **Step 3: 校验 tasks 路由**

在 `POST /` 中校验 `projectId`、`title` 为必填。
在 `PATCH /:id` 中校验 `status` 属于 VALID_STATUSES、`priority` 属于 VALID_PRIORITIES。

- [ ] **Step 4: 校验 workers 路由**

在 `PATCH /:id` 中校验 `name` 非空。

- [ ] **Step 5: 提交**

```bash
git add server/src/routes/
git commit -m "fix: add input validation to all API routes"
```

---

### Task 3: Express 错误处理中间件

**Files:**
- Modify: `server/src/index.ts`

**问题:** 数据库异常、校验异常等未捕获的错误会直接崩溃服务器进程。

- [ ] **Step 1: 添加全局错误处理中间件**

在 `server/src/index.ts` 所有路由注册之后（`app.use('/api/workers', ...)` 之后）添加：

```typescript
// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(400).json({ error: err.message || 'Internal server error' });
});
```

- [ ] **Step 2: 在各路由中用 try-catch 包装危险操作**

在 `tasks.ts` 的 `POST /:id/start` 和 `POST /:id/merge` 中，用 try-catch 包装 git 操作，将错误传递给 `next(err)`：

```typescript
try {
  // git operations
} catch (err) {
  return res.status(500).json({ error: `Git operation failed: ${(err as Error).message}` });
}
```

- [ ] **Step 3: 提交**

```bash
git add server/src/index.ts server/src/routes/tasks.ts
git commit -m "fix: add global error handler and try-catch for git operations"
```

---

### Task 4: 优雅退出

**Files:**
- Modify: `server/src/index.ts`

**问题:** 服务器关闭时 CC 子进程变为孤儿进程继续运行。

- [ ] **Step 1: 添加 SIGTERM/SIGINT 处理器**

在 `server/src/index.ts` 的 `httpServer.listen(...)` 之后添加：

```typescript
function shutdown() {
  console.log('Shutting down...');
  for (const taskId of pm.getRunning()) {
    pm.kill(taskId);
  }
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

- [ ] **Step 2: 提交**

```bash
git add server/src/index.ts
git commit -m "fix: add graceful shutdown to kill child processes"
```

---

### Task 5: addLog 修复 — 换行符 + 独立日志字段

**Files:**
- Modify: `client/src/store.ts`
- Modify: `client/src/types.ts`

**问题:** `addLog` 直接拼接字符串没有换行符，且把日志存到 `reviewNotes`（字段语义错误，`reviewNotes` 用于 PR 审查备注而非 worker 输出）。

- [ ] **Step 1: 在 Task 类型中添加 logLines 字段**

在 `client/src/types.ts` 的 Task 接口中添加：

```typescript
logLines?: string[];
```

- [ ] **Step 2: 修改 store 中 addLog，使用独立字段 + 换行符**

```typescript
addLog: (taskId, text) => set((s) => ({
  tasks: s.tasks.map((t) =>
    t.id === taskId ? { ...t, logLines: [...(t.logLines || []), text] } : t
  ),
})),
```

- [ ] **Step 3: 提交**

```bash
git add client/src/store.ts client/src/types.ts
git commit -m "fix: store worker logs in separate logLines array with proper separation"
```

---

### Task 6: 前端 API 调用添加错误处理

**Files:**
- Modify: `client/src/pages/KanbanPage.tsx`
- Modify: `client/src/pages/WorkerPage.tsx`
- Modify: `client/src/pages/SettingsPage.tsx`

**问题:** 所有 API 调用（`api.getProjects()`、`api.getTasks()`、`api.getWorkers()` 等）使用 `.then()` 但无 `.catch()`。API 请求失败时 Promise rejection 未被处理，`loading` 状态永远为 `true`，页面永远显示"加载中..."，用户看不到任何错误提示且无法恢复操作。

**涉及位置：**
- `KanbanPage.tsx:20-25` — `api.getProjects()` 无 `.catch()`
- `KanbanPage.tsx:28-34` — `api.getTasks()` 无 `.catch()`
- `WorkerPage.tsx:15` — `api.getWorkers()` 无 `.catch()`
- `SettingsPage.tsx` — 多处 API 调用无 `.catch()`

- [ ] **Step 1: 封装 API 调用为 async/await + try-catch 模式**

在 KanbanPage 中使用 `useEffect` 内的 async 函数：

```typescript
useEffect(() => {
  (async () => {
    try {
      const ps = await api.getProjects();
      useStore.getState().setProjects(ps);
      if (ps.length > 0) setCurrentProject(ps[0].id);
      setError(null);
    } catch (err) {
      setError('无法加载项目列表: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  })();
}, []);
```

- [ ] **Step 2: 添加错误状态和 UI 展示**

每个页面添加 `error` state 和错误展示组件（如红色提示条 + 重试按钮）。

- [ ] **Step 3: 对 WorkerPage 和 SettingsPage 做同样的修改**

- [ ] **Step 4: 提交**

```bash
git add client/src/pages/
git commit -m "fix: add error handling to all frontend API calls with retry UI"
```

---

### Task 7: 修复 WebSocket worker-closed 数据破坏

**Files:**
- Modify: `client/src/hooks/useWebSocket.ts`

**问题:** `useWebSocket.ts:26-28` 中 `worker-closed` 消息处理调用 `updateTask({ status: 'review', id: msg.taskId } as any)`。`store.ts` 的 `updateTask` 方法将整个 task 对象替换为传入的参数，导致 task 的 `title`、`description`、`priority`、`assignedTo` 等所有字段被擦除，看板上的任务卡片变为空白。

- [ ] **Step 1: 修改 useWebSocket 中 worker-closed 的处理**

只更新 status，不全量替换：

```typescript
// 方案 A: 添加一个只更新 status 的 store 方法
setTaskStatus(taskId, 'review');

// 方案 B (如果不想改 store): 从 store 获取当前 task，merge 后再 update
const tasks = useStore.getState().tasks;
const task = tasks.find(t => t.id === msg.taskId);
if (task) {
  updateTask({ ...task, status: 'review' });
}
```

- [ ] **Step 2: 提交**

```bash
git add client/src/hooks/useWebSocket.ts client/src/store.ts
git commit -m "fix: prevent worker-closed event from corrupting task data"
```

---

## 第二阶段：功能完善

### Task 8: WorkerPage 终端接入 WebSocket

**Files:**
- Modify: `client/src/pages/WorkerPage.tsx`
- Modify: `client/src/hooks/useWebSocket.ts`

**问题:** WorkerPage 的 `workerLogs` 是本地 `useState<Record<string, string[]>>({})`，从未被填充。终端永远显示"等待输出..."。需要从 store 的 `logLines`（见 Task 5）获取日志。

- [ ] **Step 1: 在 WorkerPage 中从 store 获取日志**

在 WorkerPage 中，不再使用本地 `workerLogs` 状态，改为从 store 的 tasks 中按 worker 的 `currentTaskId` 查找对应的 `logLines`。

- [ ] **Step 2: 确保 useWebSocket 已在 WorkerPage 中激活**

将 `useWebSocket` hook 在 WorkerPage 中调用，或确保 `worker-output` 消息能更新 store（Task 5 已修复 `addLog`）。

- [ ] **Step 3: WorkerPage 展示日志**

在 WorkerPage 中，选中 worker 对应的 task 的 `logLines` 自动展示在 WorkerTerminal 中。

- [ ] **Step 4: 提交**

```bash
git add client/src/pages/WorkerPage.tsx client/src/hooks/useWebSocket.ts
git commit -m "fix: wire worker terminal to WebSocket output via store logLines"
```

---

### Task 9: 合并后捕获真实 commit hash

**Files:**
- Modify: `server/src/routes/tasks.ts`
- Modify: `server/src/git-manager.ts`

**问题:** `mergeToMain` 后存的是字符串 `"merged"` 而非真实 git hash。

- [ ] **Step 1: 在 git-manager 中添加 getHeadHash 方法**

```typescript
getHeadHash(repoPath: string): string {
  return execSync(`git -C "${repoPath}" rev-parse HEAD`, {
    encoding: 'utf-8',
    timeout: 5000,
  }).trim();
}
```

- [ ] **Step 2: 在 merge 路由中调用并存储真实 hash**

在 `POST /:id/merge` 中，merge 成功后调用 `git.getHeadHash(task.repoPath)` 获取真实 commit hash 存入数据库。

- [ ] **Step 3: 提交**

```bash
git add server/src/git-manager.ts server/src/routes/tasks.ts
git commit -m "fix: capture real git commit hash after merge"
```

---

### Task 10: 任务重分配清除旧员工状态

**Files:**
- Modify: `server/src/routes/tasks.ts`

**问题:** 任务从员工 A 改派给员工 B 时，员工 A 状态和 `currentTaskId` 未清理，保持 `busy` 状态。

- [ ] **Step 1: 在 PATCH 路由中处理重分配逻辑**

```typescript
if (assignedTo !== undefined && assignedTo !== task.assignedTo) {
  // Clear previous worker
  if (task.assignedTo) {
    db.prepare('UPDATE workers SET status = ?, currentTaskId = ? WHERE id = ?')
      .run('idle', null, task.assignedTo);
  }
  // Set new worker
  if (assignedTo) {
    db.prepare('UPDATE workers SET status = ?, currentTaskId = ? WHERE id = ?')
      .run('busy', req.params.id, assignedTo);
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/routes/tasks.ts
git commit -m "fix: clear previous worker status when reassigning task"
```

---

### Task 11: CORS 限制 + 安全标记

**Files:**
- Modify: `server/src/index.ts`

**问题:** `cors()` 无任何参数，允许任意来源访问 API。

- [ ] **Step 1: 限制 CORS 为开发环境**

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false  // In production, same-origin only
    : ['http://localhost:5173', 'http://localhost:3000'],
}));
```

- [ ] **Step 2: 提交**

```bash
git add server/src/index.ts
git commit -m "fix: restrict CORS to development origins"
```

---

### Task 12: 清理死代码和重复类型

**Files:**
- Modify: `server/src/types.ts` (添加使用说明)
- Modify: `client/src/types.ts`

**说明:** `server/src/types.ts` 定义了类型但未被任何路由文件导入（路由中全部使用 `as any`），无 TypeScript 类型安全保障。

- [ ] **Step 1: 在 server/src/types.ts 顶部添加注释**

```typescript
// Shared type definitions — currently used as reference documentation.
// Server routes use these shapes via better-sqlite3 return types (cast as any).
// Future: integrate with Zod schemas for runtime validation.
```

- [ ] **Step 2: 修复 ChatMessage 类型不一致**

`server/src/types.ts` 中 ChatMessage 使用 `tasks?: Task[]`，但 `client/src/types.ts` 使用 `tasksJson: string | null`（匹配数据库列名）。统一两个类型定义，保持一致。

- [ ] **Step 3: 提交**

```bash
git add server/src/types.ts client/src/types.ts
git commit -m "docs: add usage notes to server type definitions, fix ChatMessage type mismatch"
```

---

### Task 13: 修复 TaskDetail 切换任务时数据不更新

**Files:**
- Modify: `client/src/components/TaskDetail.tsx`

**问题:** `TaskDetail.tsx:13` 使用 `useState(task)` 初始化表单数据。`useState` 的初始值仅在组件首次挂载时生效。当用户点击任务 A 切换到任务 B 时，`task` prop 变了但组件未重新挂载，`form` state 仍是任务 A 的数据。

- [ ] **Step 1: 添加 useEffect 同步 task prop 变化**

```typescript
const [form, setForm] = useState(task);

useEffect(() => {
  setForm(task);
}, [task]);
```

- [ ] **Step 2: 提交**

```bash
git add client/src/components/TaskDetail.tsx
git commit -m "fix: sync TaskDetail form state when selected task changes"
```

---

### Task 14: PMChatPage 接入后端

**Files:**
- Modify: `client/src/pages/PMChatPage.tsx`
- Modify: `server/src/routes/` (新增 messages.ts)
- Modify: `server/src/index.ts`

**问题:**
1. `PMChatPage.tsx:42-53` — PM 回复是硬编码的 `setTimeout` mock，消息无持久化
2. 数据库有 `messages` 表但 server 端无 `/api/messages` 路由
3. `client/src/types.ts` 和 `server/src/types.ts` 中 ChatMessage 字段名不一致（`tasks` vs `tasksJson`）

- [ ] **Step 1: 创建 server 端 messages 路由**

在 `server/src/routes/messages.ts` 中创建：
- `GET /api/messages?projectId=` — 获取项目聊天记录
- `POST /api/messages` — 发送新消息

- [ ] **Step 2: 在 server/src/index.ts 注册 messages 路由**

```typescript
app.use('/api/messages', messagesRouter);
```

- [ ] **Step 3: 修改 PMChatPage 调用真实 API**

将 `setTimeout` mock 替换为 `api.getMessages()` / `api.sendMessage()` 调用，消息持久化到数据库。

- [ ] **Step 4: 提交**

```bash
git add server/src/routes/messages.ts server/src/index.ts client/src/pages/PMChatPage.tsx
git commit -m "feat: wire PMChatPage to backend messages API with persistence"
```

---

### Task 15: 持久化项目选择状态

**Files:**
- Modify: `client/src/store.ts`
- Modify: `client/src/pages/KanbanPage.tsx`

**问题:** `currentProjectId` 仅在内存中（Zustand），页面刷新后丢失。KanbanPage 每次加载都默认选第一个项目（`KanbanPage.tsx:22: setCurrentProject(ps[0].id)`）。如果用户有多个项目，始终无法切换到其他项目并保持选择。

- [ ] **Step 1: 将 currentProjectId 持久化到 localStorage**

在 store 中，项目切换时同步写入 `localStorage`；初始化时从 `localStorage` 读取。

- [ ] **Step 2: 在 KanbanPage 中使用持久化的项目 ID**

优先使用 `localStorage` 中保存的项目 ID，如果该 ID 对应的项目不存在则回退到第一个项目。

- [ ] **Step 3: 提交**

```bash
git add client/src/store.ts client/src/pages/KanbanPage.tsx
git commit -m "feat: persist selected project to localStorage across page refreshes"
```

---

### Task 16: 修复 ChatMessage 类型不一致

**Files:**
- Modify: `server/src/types.ts`
- Modify: `client/src/types.ts`
- Modify: `client/src/components/ChatMessage.tsx`

**问题:** 数据库列名为 `tasksJson`（TEXT），server 类型声明为 `tasks`，client 类型声明为 `tasksJson`。如果 server 端序列化消息，字段名会不匹配。需统一两端的类型定义。

- [ ] **Step 1: 统一字段命名为 tasksJson**

server 端 ChatMessage 接口的 `tasks?: Task[]` 改为 `tasksJson: string | null`（匹配数据库列名）。client 端保持不变（已匹配）。

- [ ] **Step 2: 在 ChatMessage 组件中添加 JSON.parse 容错**

```typescript
try {
  const tasks = JSON.parse(message.tasksJson || '[]');
} catch {
  // ignore parse errors
}
```

- [ ] **Step 3: 提交**

```bash
git add server/src/types.ts client/src/types.ts client/src/components/ChatMessage.tsx
git commit -m "fix: align ChatMessage types across server and client"
```

---

## 汇总

| 阶段 | 任务 | 描述 | 严重程度 | 发现来源 |
|------|------|------|----------|----------|
| 1 | 1 | git-manager 路径校验防命令注入 | 严重/安全 | 代码审查 |
| 1 | 2 | API 路由输入校验 | 严重/安全 | 代码审查 |
| 1 | 3 | Express 错误处理中间件 | 严重/稳定 | 代码审查 |
| 1 | 4 | 优雅退出（子进程清理） | 严重/稳定 | 代码审查 |
| 1 | 5 | addLog 使用独立 logLines 字段 + 换行符 | 重要/正确性 | 代码审查 |
| 1 | 6 | **前端 API 调用添加 .catch() 错误处理** | **严重/可用性** | **运行时发现** |
| 1 | 7 | **WebSocket worker-closed 破坏 task 数据** | **严重/数据破坏** | **运行时发现** |
| 2 | 8 | WorkerPage 终端接入 WebSocket | 重要/功能 | 代码审查 |
| 2 | 9 | 合并后捕获真实 commit hash | 重要/可追溯 | 代码审查 |
| 2 | 10 | 任务重分配清除旧员工状态 | 重要/一致性 | 代码审查 |
| 2 | 11 | CORS 限制为开发环境 | 重要/安全 | 代码审查 |
| 2 | 12 | 清理死代码 + 统一类型 | 建议/可维护 | 代码审查 |
| 2 | 13 | **TaskDetail 切换任务时数据不更新** | **严重/正确性** | **运行时发现** |
| 2 | 14 | **PMChatPage 接入后端 messages API** | **重要/功能** | **运行时发现** |
| 2 | 15 | **项目选择状态持久化到 localStorage** | **建议/体验** | **运行时发现** |
| 2 | 16 | **ChatMessage 类型不一致修复** | **重要/一致性** | **运行时发现** |

**新增问题（不在原始代码审查中）：** Task 6、7、13、14、15、16

**MVP 修复后状态:** 安全可用，API 失败时有错误 UI 而非无限加载，WebSocket 数据不破坏任务，终端和 PM 对话 WebSocket 数据通路完整，merge hash 真实可追溯，任务切换正确渲染。
