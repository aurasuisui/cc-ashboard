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

**问题:** `addLog` 直接拼接字符串没有换行符，且把日志存到 `reviewNotes`（字段语义错误）。

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

## 第二阶段：功能完善

### Task 6: WorkerPage 终端接入 WebSocket

**Files:**
- Modify: `client/src/pages/WorkerPage.tsx`
- Modify: `client/src/hooks/useWebSocket.ts`

**问题:** `workerLogs` 从未被填充，终端永远显示"等待输出..."。

- [ ] **Step 1: 在 store 中提取日志信息**

在 WorkerPage 中，不再使用本地 `workerLogs` 状态，改为从 store 的 tasks 中按 worker 的 currentTaskId 查找对应的 `logLines`。

- [ ] **Step 2: useWebSocket hook 中区分 worker output 来源**

修改 `useWebSocket` 的 `worker-output` 分支，除了调用 `addLog` 外，让 WorkerPage 能感知到新日志到达（通过轮询 store 或增加一个 `lastLogUpdate` 时间戳）。

- [ ] **Step 3: WorkerPage 定期检查并展示日志**

在 WorkerPage 中，选中的 worker 对应的 task 的 `logLines` 自动展示在 WorkerTerminal 中。

- [ ] **Step 4: 提交**

```bash
git add client/src/pages/WorkerPage.tsx client/src/hooks/useWebSocket.ts
git commit -m "fix: wire worker terminal to WebSocket output via store logLines"
```

---

### Task 7: 合并后捕获真实 commit hash

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

### Task 8: 任务重分配清除旧员工状态

**Files:**
- Modify: `server/src/routes/tasks.ts`

**问题:** 任务从员工 A 改派给员工 B 时，员工 A 状态未清理。

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

### Task 9: CORS 限制 + 安全标记

**Files:**
- Modify: `server/src/index.ts`

**问题:** `cors()` 允许任意来源访问。

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

### Task 10: 清理死代码和重复类型

**Files:**
- Modify: `server/src/types.ts` (添加使用说明)
- Modify: `server/src/ws-hub.ts` (保留 broadcastToWorker 以备后用)
- Modify: `client/src/types.ts`

**说明:** 此任务可选。`server/src/types.ts` 目前未被导入，可用作参考文档或在后续版本中接入。`broadcastToWorker` 方法为预留接口不删除。

- [ ] **Step 1: 在 server/src/types.ts 顶部添加注释**

```typescript
// Shared type definitions — currently used as reference documentation.
// Server routes use these shapes via better-sqlite3 return types (cast as any).
// Future: integrate with Zod schemas for runtime validation.
```

- [ ] **Step 2: 提交**

```bash
git add server/src/types.ts
git commit -m "docs: add usage notes to server type definitions"
```

---

## 汇总

| 阶段 | 任务 | 描述 | 优先级 |
|------|------|------|--------|
| 1 | 1-5 | 路径校验、输入校验、错误处理、优雅退出、logLines | 严重/必须 |
| 2 | 6-10 | 终端接入、真实 hash、重分配清理、CORS、死代码 | 重要/建议 |

**MVP 修复后状态:** 安全可用，终端和 PM 对话 WebSocket 数据通路完整，merge hash 真实可追溯。
