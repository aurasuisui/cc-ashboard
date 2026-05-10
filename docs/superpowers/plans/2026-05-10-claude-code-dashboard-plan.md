# Claude Code Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based kanban dashboard that manages multiple Claude Code sessions through a three-PM pipeline (analysis → dispatch → QA/merge).

**Architecture:** Monorepo with `server/` (Express + SQLite + WebSocket) and `client/` (React + Vite + Zustand). Server spawns CC subprocesses in isolated git worktrees and streams stdout via WebSocket. Client renders a 5-column kanban board with real-time terminal views and a PM chat interface.

**Tech Stack:** Node.js, Express, TypeScript, SQLite (better-sqlite3), ws, React 18, Vite, Zustand, HTML5 Drag and Drop

---

## File Map

```
/
├── package.json                          # workspaces root, scripts
├── tsconfig.json                         # base tsconfig
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                      # Express + WS server entry
│       ├── types.ts                      # shared types (Project, Task, Worker, Message)
│       ├── db.ts                         # SQLite init, tables, helpers
│       ├── git-manager.ts               # git worktree create/list/remove, merge
│       ├── process-manager.ts           # spawn CC, stream stdout, kill, track
│       ├── ws-hub.ts                    # WebSocket connection hub + broadcast
│       └── routes/
│           ├── projects.ts              # Project CRUD
│           ├── tasks.ts                 # Task CRUD + lifecycle (start/merge)
│           └── workers.ts              # Worker list + status
│
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx                     # ReactDOM entry
        ├── App.tsx                      # Router + Layout wrapper
        ├── types.ts                     # frontend type mirrors
        ├── api.ts                       # fetch wrapper for REST endpoints
        ├── store.ts                     # Zustand store (projects, tasks, workers)
        ├── hooks/
        │   └── useWebSocket.ts          # WS connect + reconnect hook
        ├── styles/
        │   └── globals.css              # design tokens + base styles
        ├── pages/
        │   ├── KanbanPage.tsx           # 5-column board + task detail panel
        │   ├── WorkerPage.tsx           # worker real-time terminal
        │   ├── PMChatPage.tsx           # PM conversation view
        │   └── SettingsPage.tsx         # project setup form
        └── components/
            ├── Layout.tsx               # nav bar + shell
            ├── KanbanColumn.tsx         # single swimlane column
            ├── TaskCard.tsx             # draggable task card
            ├── TaskDetail.tsx           # slide-out task detail panel
            ├── WorkerTerminal.tsx       # terminal-style log viewer
            └── ChatMessage.tsx          # single chat bubble
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize monorepo root

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "cc-dashboard",
  "private": true,
  "workspaces": ["server", "client"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w server && npm run build -w client",
    "start": "node server/dist/index.js"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Install root dependencies**

Run: `npm install`
Expected: node_modules created with concurrently and typescript

- [ ] **Step 4: Initialize git and commit**

```bash
git init
echo "node_modules\ndist\n.superpowers" > .gitignore
git add -A
git commit -m "chore: initialize monorepo root"
```

---

### Task 2: Initialize server package

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "cc-dashboard-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.19.0",
    "better-sqlite3": "^11.0.0",
    "ws": "^8.17.0",
    "uuid": "^9.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/better-sqlite3": "^7.6.9",
    "@types/ws": "^8.5.10",
    "@types/uuid": "^9.0.8",
    "@types/cors": "^2.8.17",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Install server dependencies**

Run: `npm install`
Expected: server dependencies installed

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/tsconfig.json
git commit -m "chore: initialize server package"
```

---

### Task 3: Initialize client package

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "cc-dashboard-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Step 2: Create client/tsconfig.json**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create client/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CC Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Install client dependencies**

Run: `npm install`
Expected: client dependencies installed

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/tsconfig.json client/vite.config.ts client/index.html
git commit -m "chore: initialize client package with vite"
```

---

## Phase 2: Shared Types & Database

### Task 4: Define shared types

**Files:**
- Create: `server/src/types.ts`

- [ ] **Step 1: Write types**

```typescript
export type TaskStatus = 'todo' | 'analyzing' | 'in-progress' | 'review' | 'merged';
export type WorkerStatus = 'idle' | 'busy' | 'error';
export type Priority = 'low' | 'normal' | 'high';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type SourceType = 'doc' | 'codebase';

export interface Project {
  id: string;
  name: string;
  sourceType: SourceType;
  sourcePath: string;
  repoPath: string;
  mainBranch: string;
  status: ProjectStatus;
  workerCount: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  status: TaskStatus;
  assignedTo: string | null;
  priority: Priority;
  estimatedHours: number;
  dependencies: string;     // JSON array of task IDs
  worktreePath: string | null;
  branchName: string | null;
  commitHash: string | null;
  analysisNotes: string;
  reviewNotes: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  projectId: string;
  name: string;
  status: WorkerStatus;
  currentTaskId: string | null;
  pid: number | null;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'pm' | 'user';
  pmType: 'analyzer' | 'dispatcher' | 'integrator';
  content: string;
  tasks?: Task[];          // attached task cards from PM
  createdAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 5: Initialize SQLite database

**Files:**
- Create: `server/src/db.ts`

- [ ] **Step 1: Write database module**

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'dashboard.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sourceType TEXT NOT NULL DEFAULT 'doc',
      sourcePath TEXT NOT NULL DEFAULT '',
      repoPath TEXT NOT NULL DEFAULT '',
      mainBranch TEXT NOT NULL DEFAULT 'main',
      status TEXT NOT NULL DEFAULT 'active',
      workerCount INTEGER NOT NULL DEFAULT 2,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      acceptanceCriteria TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      assignedTo TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      estimatedHours REAL NOT NULL DEFAULT 1,
      dependencies TEXT NOT NULL DEFAULT '[]',
      worktreePath TEXT,
      branchName TEXT,
      commitHash TEXT,
      analysisNotes TEXT NOT NULL DEFAULT '',
      reviewNotes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      currentTaskId TEXT,
      pid INTEGER,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'pm',
      pmType TEXT NOT NULL DEFAULT 'analyzer',
      content TEXT NOT NULL DEFAULT '',
      tasksJson TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

export default db;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/db.ts
git commit -m "feat: add SQLite database initialization with tables"
```

---

## Phase 3: Backend Core Services

### Task 6: Git manager

**Files:**
- Create: `server/src/git-manager.ts`

- [ ] **Step 1: Write git-manager module**

```typescript
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const WORKTREE_BASE = path.join(os.tmpdir(), 'cc-dashboard');

export interface GitManager {
  createWorktree: (repoPath: string, branchName: string, taskId: string) => string;
  listWorktrees: (repoPath: string) => string[];
  removeWorktree: (worktreePath: string) => void;
  mergeToMain: (repoPath: string, branchName: string, mainBranch: string) => string;
  getDiff: (repoPath: string, branchName: string, mainBranch: string) => string;
}

export const git: GitManager = {
  createWorktree(repoPath: string, branchName: string, taskId: string): string {
    const worktreePath = path.join(WORKTREE_BASE, taskId);
    execSync(`git -C "${repoPath}" worktree add "${worktreePath}" -b "${branchName}"`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    return worktreePath;
  },

  listWorktrees(repoPath: string): string[] {
    const output = execSync(`git -C "${repoPath}" worktree list --porcelain`, { encoding: 'utf-8' });
    return output.split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => line.replace('worktree ', ''));
  },

  removeWorktree(worktreePath: string): void {
    execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'pipe' });
  },

  mergeToMain(repoPath: string, branchName: string, mainBranch: string): string {
    const output = execSync(
      `git -C "${repoPath}" checkout "${mainBranch}" && git -C "${repoPath}" merge "${branchName}" --no-edit`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return output;
  },

  getDiff(repoPath: string, branchName: string, mainBranch: string): string {
    return execSync(
      `git -C "${repoPath}" diff "${mainBranch}...${branchName}"`,
      { encoding: 'utf-8', timeout: 10000 }
    );
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/git-manager.ts
git commit -m "feat: add git worktree manager"
```

---

### Task 7: Process manager

**Files:**
- Create: `server/src/process-manager.ts`

- [ ] **Step 1: Write process-manager module**

```typescript
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface TrackedProcess {
  taskId: string;
  workerId: string;
  process: ChildProcess;
  startTime: Date;
}

export class ProcessManager extends EventEmitter {
  private processes: Map<string, TrackedProcess> = new Map();

  spawn(taskId: string, workerId: string, worktreePath: string, taskDescription: string): void {
    const child = spawn('claude', ['--print', taskDescription], {
      cwd: worktreePath,
      env: { ...process.env, CI: 'true' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const tracked: TrackedProcess = { taskId, workerId, process: child, startTime: new Date() };
    this.processes.set(taskId, tracked);

    child.stdout.on('data', (data: Buffer) => {
      this.emit('output', { taskId, workerId, data: data.toString(), stream: 'stdout' });
    });

    child.stderr.on('data', (data: Buffer) => {
      this.emit('output', { taskId, workerId, data: data.toString(), stream: 'stderr' });
    });

    child.on('close', (code) => {
      this.emit('closed', { taskId, workerId, exitCode: code });
      this.processes.delete(taskId);
    });

    child.on('error', (err) => {
      this.emit('output', { taskId, workerId, data: `Process error: ${err.message}`, stream: 'stderr' });
      this.processes.delete(taskId);
    });
  }

  kill(taskId: string): void {
    const tracked = this.processes.get(taskId);
    if (tracked) {
      tracked.process.kill('SIGTERM');
      this.processes.delete(taskId);
    }
  }

  getRunning(): string[] {
    return Array.from(this.processes.keys());
  }

  isRunning(taskId: string): boolean {
    return this.processes.has(taskId);
  }

  sendStdin(taskId: string, input: string): void {
    const tracked = this.processes.get(taskId);
    if (tracked && tracked.process.stdin) {
      tracked.process.stdin.write(input + '\n');
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/process-manager.ts
git commit -m "feat: add CC subprocess manager with event streaming"
```

---

### Task 8: WebSocket hub

**Files:**
- Create: `server/src/ws-hub.ts`

- [ ] **Step 1: Write WebSocket hub**

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { ProcessManager } from './process-manager.js';

interface WSClient {
  ws: WebSocket;
  type: 'worker' | 'pm';
  id: string;   // workerId or pmId
}

export class WSHub {
  private wss: WebSocketServer;
  private clients: Set<WSClient> = new Set();
  private pm: ProcessManager;

  constructor(server: Server, pm: ProcessManager) {
    this.pm = pm;
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', 'http://localhost');
      const clientType = url.searchParams.get('type') as 'worker' | 'pm';
      const clientId = url.searchParams.get('id') || '';

      const client: WSClient = { ws, type: clientType, id: clientId };
      this.clients.add(client);

      ws.on('close', () => this.clients.delete(client));
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.handleMessage(client, msg);
        } catch { /* ignore malformed messages */ }
      });
    });

    this.pm.on('output', ({ taskId, workerId, data, stream }) => {
      this.broadcast('worker-output', { taskId, workerId, data, stream });
    });

    this.pm.on('closed', ({ taskId, workerId, exitCode }) => {
      this.broadcast('worker-closed', { taskId, workerId, exitCode });
    });
  }

  private handleMessage(client: WSClient, msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'pm-chat':
        this.broadcast('pm-chat', { ...msg, from: client.id });
        break;
      case 'stdin':
        this.pm.sendStdin(msg.taskId as string, msg.text as string);
        break;
    }
  }

  broadcast(type: string, payload: Record<string, unknown>): void {
    const data = JSON.stringify({ type, ...payload });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  broadcastToWorker(workerId: string, type: string, payload: Record<string, unknown>): void {
    const data = JSON.stringify({ type, ...payload });
    for (const client of this.clients) {
      if (client.type === 'worker' && client.id === workerId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/ws-hub.ts
git commit -m "feat: add WebSocket hub for real-time communication"
```

---

## Phase 4: Backend API Routes

### Task 9: Project routes

**Files:**
- Create: `server/src/routes/projects.ts`

- [ ] **Step 1: Write project routes**

```typescript
import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all();
  res.json(projects);
});

router.get('/:id', (req: Request, res: Response) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.post('/', (req: Request, res: Response) => {
  const { name, sourceType, sourcePath, repoPath, mainBranch, workerCount } = req.body;
  const id = uuid();

  db.prepare(`INSERT INTO projects (id, name, sourceType, sourcePath, repoPath, mainBranch, workerCount)
              VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, name, sourceType || 'doc', sourcePath || '', repoPath || '', mainBranch || 'main', workerCount || 2);

  // Create workers for this project
  for (let i = 0; i < (workerCount || 2); i++) {
    db.prepare('INSERT INTO workers (id, projectId, name) VALUES (?, ?, ?)')
      .run(uuid(), id, `Worker-${i + 1}`);
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/projects.ts
git commit -m "feat: add project CRUD API routes"
```

---

### Task 10: Task routes

**Files:**
- Create: `server/src/routes/tasks.ts`

- [ ] **Step 1: Write task routes**

```typescript
import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { git } from '../git-manager.js';
import { ProcessManager } from '../process-manager.js';

export function createTaskRoutes(pm: ProcessManager): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const tasks = db.prepare('SELECT * FROM tasks WHERE projectId = ? ORDER BY createdAt ASC').all(req.query.project);
    res.json(tasks);
  });

  router.post('/', (req: Request, res: Response) => {
    const { projectId, title, description, acceptanceCriteria, priority, estimatedHours, dependencies } = req.body;
    const id = uuid();

    db.prepare(`INSERT INTO tasks (id, projectId, title, description, acceptanceCriteria, priority, estimatedHours, dependencies)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, projectId, title, description || '', acceptanceCriteria || '', priority || 'normal', estimatedHours || 1, JSON.stringify(dependencies || []));

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json(task);
  });

  router.patch('/:id', (req: Request, res: Response) => {
    const { status, assignedTo, title, description, acceptanceCriteria, priority, estimatedHours, analysisNotes, reviewNotes } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    db.prepare(`UPDATE tasks SET
      status = ?, assignedTo = ?, title = ?, description = ?,
      acceptanceCriteria = ?, priority = ?, estimatedHours = ?,
      analysisNotes = ?, reviewNotes = ?
      WHERE id = ?`)
      .run(
        status || task.status,
        assignedTo !== undefined ? assignedTo : task.assignedTo,
        title || task.title,
        description || task.description,
        acceptanceCriteria || task.acceptanceCriteria,
        priority || task.priority,
        estimatedHours || task.estimatedHours,
        analysisNotes || task.analysisNotes,
        reviewNotes || task.reviewNotes,
        req.params.id
      );

    if (assignedTo) {
      db.prepare('UPDATE workers SET status = ?, currentTaskId = ? WHERE id = ?')
        .run('busy', req.params.id, assignedTo);
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  router.post('/:id/start', (req: Request, res: Response) => {
    const task = db.prepare('SELECT t.*, p.repoPath, p.mainBranch FROM tasks t JOIN projects p ON t.projectId = p.id WHERE t.id = ?')
      .get(req.params.id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const branchName = `feature/${task.id.slice(0, 8)}-${task.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    const worktreePath = git.createWorktree(task.repoPath, branchName, task.id);

    db.prepare('UPDATE tasks SET worktreePath = ?, branchName = ?, status = ? WHERE id = ?')
      .run(worktreePath, branchName, 'in-progress', task.id);

    if (task.assignedTo) {
      const prompt = `任务: ${task.title}\n描述: ${task.description}\n验收标准: ${task.acceptanceCriteria}\n\n请在当前工作目录中实现以上任务。完成后报告结果。`;
      pm.spawn(task.id, task.assignedTo, worktreePath, prompt);
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  router.post('/:id/merge', (req: Request, res: Response) => {
    const task = db.prepare('SELECT t.*, p.repoPath, p.mainBranch FROM tasks t JOIN projects p ON t.projectId = p.id WHERE t.id = ?')
      .get(req.params.id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!task.branchName) return res.status(400).json({ error: 'No branch to merge' });

    try {
      git.mergeToMain(task.repoPath, task.branchName, task.mainBranch);
      git.removeWorktree(task.worktreePath);
      db.prepare('UPDATE tasks SET status = ?, commitHash = ? WHERE id = ?')
        .run('merged', task.commitHash || 'merged', task.id);
      if (task.assignedTo) {
        db.prepare('UPDATE workers SET status = ?, currentTaskId = ? WHERE id = ?')
          .run('idle', null, task.assignedTo);
      }
    } catch (err: any) {
      return res.status(500).json({ error: `Merge failed: ${err.message}` });
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/tasks.ts
git commit -m "feat: add task CRUD + lifecycle API routes"
```

---

### Task 11: Worker routes

**Files:**
- Create: `server/src/routes/workers.ts`

- [ ] **Step 1: Write worker routes**

```typescript
import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const workers = db.prepare('SELECT * FROM workers WHERE projectId = ?').all(req.query.project);
  res.json(workers);
});

router.get('/:id', (req: Request, res: Response) => {
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
});

router.patch('/:id', (req: Request, res: Response) => {
  const { name } = req.body;
  db.prepare('UPDATE workers SET name = ? WHERE id = ?').run(name, req.params.id);
  const updated = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/workers.ts
git commit -m "feat: add worker API routes"
```

---

### Task 12: Server entry point

**Files:**
- Create: `server/src/index.ts`

- [ ] **Step 1: Write server entry**

```typescript
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initDB } from './db.js';
import { ProcessManager } from './process-manager.js';
import { WSHub } from './ws-hub.js';
import projectRoutes from './routes/projects.js';
import { createTaskRoutes } from './routes/tasks.js';
import workerRoutes from './routes/workers.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initDB();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const pm = new ProcessManager();
new WSHub(httpServer, pm);

app.use('/api/projects', projectRoutes);
app.use('/api/tasks', createTaskRoutes(pm));
app.use('/api/workers', workerRoutes);

// Serve client build in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`CC Dashboard running at http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Verify server starts**

Run: `npx tsx server/src/index.ts`
Expected: "CC Dashboard running at http://localhost:3001"
Stop with Ctrl+C after verifying.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add server entry point with Express + WS"
```

---

## Phase 5: Frontend Foundation

### Task 13: Global styles & design tokens

**Files:**
- Create: `client/src/styles/globals.css`

- [ ] **Step 1: Write globals.css**

```css
:root {
  --bg-page: #faf9f5;
  --bg-card: #ffffff;
  --accent: #d97757;
  --accent-hover: #c0684a;
  --accent-light: #fef0eb;
  --blue: #6aa2cf;
  --blue-light: #e0f0ff;
  --border: #edece6;
  --text: #1a1a2e;
  --text-secondary: #888888;
  --green: #16a34a;
  --green-light: #e8f5e9;
  --yellow: #d97706;
  --yellow-light: #fff7ed;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-pill: 20px;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body, #root {
  height: 100%;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-page);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

button {
  cursor: pointer;
  font-family: inherit;
}

input, textarea, select {
  font-family: inherit;
  font-size: inherit;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/styles/globals.css
git commit -m "feat: add design tokens and global styles"
```

---

### Task 14: Client types & API client

**Files:**
- Create: `client/src/types.ts`
- Create: `client/src/api.ts`

- [ ] **Step 1: Write client types**

```typescript
// client/src/types.ts
export type TaskStatus = 'todo' | 'analyzing' | 'in-progress' | 'review' | 'merged';
export type WorkerStatus = 'idle' | 'busy' | 'error';
export type Priority = 'low' | 'normal' | 'high';

export interface Project {
  id: string;
  name: string;
  sourceType: 'doc' | 'codebase';
  sourcePath: string;
  repoPath: string;
  mainBranch: string;
  status: string;
  workerCount: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  status: TaskStatus;
  assignedTo: string | null;
  priority: Priority;
  estimatedHours: number;
  dependencies: string;
  worktreePath: string | null;
  branchName: string | null;
  commitHash: string | null;
  analysisNotes: string;
  reviewNotes: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  projectId: string;
  name: string;
  status: WorkerStatus;
  currentTaskId: string | null;
  pid: number | null;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'pm' | 'user';
  pmType: 'analyzer' | 'dispatcher' | 'integrator';
  content: string;
  tasksJson: string | null;
  createdAt: string;
}

export interface WorkerOutput {
  type: 'worker-output';
  taskId: string;
  workerId: string;
  data: string;
  stream: 'stdout' | 'stderr';
}

export interface WorkerClosed {
  type: 'worker-closed';
  taskId: string;
  workerId: string;
  exitCode: number;
}

export interface PMChatEvent {
  type: 'pm-chat';
  from: string;
  content: string;
  pmType: 'analyzer' | 'dispatcher' | 'integrator';
  tasksJson?: string;
}

export type WSEvent = WorkerOutput | WorkerClosed | PMChatEvent;
```

- [ ] **Step 2: Write API client**

```typescript
// client/src/api.ts
const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getProjects: () => request<any[]>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  getTasks: (projectId: string) => request<any[]>(`/tasks?project=${projectId}`),
  createTask: (data: any) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  startTask: (id: string) => request<any>(`/tasks/${id}/start`, { method: 'POST' }),
  mergeTask: (id: string) => request<any>(`/tasks/${id}/merge`, { method: 'POST' }),
  deleteTask: (id: string) => request<any>(`/tasks/${id}`, { method: 'DELETE' }),

  getWorkers: (projectId: string) => request<any[]>(`/workers?project=${projectId}`),
  updateWorker: (id: string, data: any) => request<any>(`/workers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/types.ts client/src/api.ts
git commit -m "feat: add client types and API client"
```

---

### Task 15: Zustand store

**Files:**
- Create: `client/src/store.ts`

- [ ] **Step 1: Write store**

```typescript
import { create } from 'zustand';
import type { Project, Task, Worker } from './types';

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  tasks: Task[];
  workers: Worker[];

  setProjects: (projects: Project[]) => void;
  setCurrentProject: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (task: Task) => void;
  removeTask: (id: string) => void;
  setWorkers: (workers: Worker[]) => void;
  updateWorker: (worker: Worker) => void;
  addLog: (taskId: string, text: string) => void;
}

export const useStore = create<AppState>((set) => ({
  projects: [],
  currentProjectId: null,
  tasks: [],
  workers: [],

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (id) => set({ currentProjectId: id }),
  setTasks: (tasks) => set({ tasks }),
  updateTask: (task) => set((s) => ({
    tasks: s.tasks.map((t) => (t.id === task.id ? task : t)),
  })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  setWorkers: (workers) => set({ workers }),
  updateWorker: (worker) => set((s) => ({
    workers: s.workers.map((w) => (w.id === worker.id ? worker : w)),
  })),
  addLog: (taskId, text) => set((s) => ({
    tasks: s.tasks.map((t) =>
      t.id === taskId ? { ...t, reviewNotes: (t as any).reviewNotes + text } : t
    ),
  })),
}));
```

- [ ] **Step 2: Commit**

```bash
git add client/src/store.ts
git commit -m "feat: add zustand state store"
```

---

### Task 16: WebSocket hook

**Files:**
- Create: `client/src/hooks/useWebSocket.ts`

- [ ] **Step 1: Write WebSocket hook**

```typescript
import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { WSEvent } from '../types';

export function useWebSocket(projectId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const updateWorker = useStore((s) => s.updateWorker);
  const addLog = useStore((s) => s.addLog);
  const updateTask = useStore((s) => s.updateTask);

  useEffect(() => {
    if (!projectId) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/ws?type=worker&id=all`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg: WSEvent = JSON.parse(event.data);
        switch (msg.type) {
          case 'worker-output':
            addLog(msg.taskId, msg.data);
            break;
          case 'worker-closed':
            if (msg.exitCode === 0) {
              updateTask({ status: 'review', id: msg.taskId } as any);
            }
            break;
        }
      } catch { /* ignore */ }
    };

    return () => { ws.close(); };
  }, [projectId]);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useWebSocket.ts
git commit -m "feat: add WebSocket hook for real-time updates"
```

---

### Task 17: Layout component

**Files:**
- Create: `client/src/components/Layout.tsx`

- [ ] **Step 1: Write Layout component**

```tsx
import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500 as const,
    color: isActive ? 'var(--text)' : 'var(--text-secondary)',
    background: isActive ? '#fff' : 'transparent',
    border: isActive ? '1px solid var(--border)' : '1px solid transparent',
    textDecoration: 'none',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{
        background: 'var(--bg-page)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--accent)', fontSize: '20px' }}>&#10042;</span>
          <strong style={{ fontSize: '16px' }}>CC Dashboard</strong>
          <span style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            padding: '2px 10px',
            borderRadius: '20px',
            fontSize: '10px',
            fontWeight: 600,
          }}>MVP</span>
        </div>
        <nav style={{ display: 'flex', gap: '4px' }}>
          <NavLink to="/" end style={linkStyle}>看板</NavLink>
          <NavLink to="/workers" style={linkStyle}>员工</NavLink>
          <NavLink to="/pm" style={linkStyle}>PM 对话</NavLink>
          <NavLink to="/settings" style={linkStyle}>设置</NavLink>
        </nav>
        <div />
      </header>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Layout.tsx
git commit -m "feat: add Layout component with navigation"
```

---

### Task 18: App entry & router

**Files:**
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`

- [ ] **Step 1: Write main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 2: Write App.tsx**

```tsx
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import KanbanPage from './pages/KanbanPage';
import WorkerPage from './pages/WorkerPage';
import PMChatPage from './pages/PMChatPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<KanbanPage />} />
        <Route path="/workers" element={<WorkerPage />} />
        <Route path="/pm" element={<PMChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 3: Verify dev server starts**

Run: `npx vite client`
Expected: dev server at http://localhost:5173
Stop after verifying.

- [ ] **Step 4: Commit**

```bash
git add client/src/main.tsx client/src/App.tsx
git commit -m "feat: add app entry point and router"
```

---

## Phase 6: Kanban Board

### Task 19: KanbanPage

**Files:**
- Create: `client/src/pages/KanbanPage.tsx`
- Create: `client/src/components/KanbanColumn.tsx`
- Create: `client/src/components/TaskCard.tsx`

- [ ] **Step 1: Write TaskCard component**

```tsx
// client/src/components/TaskCard.tsx
import type { Task } from '../types';

const priorityColors: Record<string, string> = {
  high: '#d97757',
  normal: 'var(--text-secondary)',
  low: 'var(--text-secondary)',
};

interface Props {
  task: Task;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, onClick }: Props) {
  const worker = task.assignedTo ? `👷 ${task.assignedTo.slice(0, 8)}` : '';
  return (
    <div
      onClick={() => onClick(task)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--text)' }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: priorityColors[task.priority], fontWeight: 600 }}>
            P: {task.priority === 'high' ? '高' : task.priority === 'normal' ? '中' : '低'}
          </span>
          {worker && (
            <span style={{ fontSize: '10px', color: 'var(--blue)' }}>{worker}</span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          {task.estimatedHours}h
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write KanbanColumn component**

```tsx
// client/src/components/KanbanColumn.tsx
import type { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: '📋 待分析', color: 'var(--text-secondary)' },
  { status: 'analyzing', label: '💬 PM分析中', color: 'var(--accent)' },
  { status: 'in-progress', label: '🚧 执行中', color: 'var(--blue)' },
  { status: 'review', label: '🔍 待验收', color: '#d97706' },
  { status: 'merged', label: '✅ 已合并', color: 'var(--green)' },
];

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskDrop: (taskId: string, newStatus: TaskStatus) => void;
}

export default function KanbanColumn({ status, tasks, onTaskClick, onTaskDrop }: Props) {
  const col = COLUMNS.find((c) => c.status === status)!;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '300px',
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) onTaskDrop(taskId, status);
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{ fontWeight: 600, fontSize: '11px', color: col.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {col.label}
        </div>
        <span style={{
          background: 'var(--bg-page)',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '10px',
          color: 'var(--text-secondary)',
        }}>{tasks.length}</span>
      </div>
      <div style={{ flex: 1 }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write KanbanPage with detail panel**

```tsx
// client/src/pages/KanbanPage.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import KanbanColumn from '../components/KanbanColumn';
import TaskDetail from '../components/TaskDetail';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Task, TaskStatus } from '../types';

const STATUSES: TaskStatus[] = ['todo', 'analyzing', 'in-progress', 'review', 'merged'];

export default function KanbanPage() {
  const { tasks, currentProjectId, projects, setTasks, setCurrentProject, updateTask } = useStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useWebSocket(currentProjectId);

  useEffect(() => {
    api.getProjects().then((ps) => {
      useStore.getState().setProjects(ps);
      if (ps.length > 0 && !currentProjectId) {
        setCurrentProject(ps[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!currentProjectId) return;
    setLoading(true);
    api.getTasks(currentProjectId).then((ts) => {
      setTasks(ts);
      setLoading(false);
    });
  }, [currentProjectId]);

  const handleDrop = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    const updated = await api.updateTask(taskId, { status: newStatus });
    updateTask(updated);
  };

  const handleTaskUpdate = (updated: Task) => {
    updateTask(updated);
    setSelectedTask(updated);
  };

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>加载中...</div>;
  }

  if (!currentProjectId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        暂无项目，请先在 <a href="/settings" style={{ color: 'var(--accent)' }}>设置</a> 中创建项目
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: 0 }}>
      <div style={{
        flex: 1,
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '14px',
        overflow: 'auto',
      }}>
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            onTaskClick={setSelectedTask}
            onTaskDrop={handleDrop}
          />
        ))}
      </div>
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/TaskCard.tsx client/src/components/KanbanColumn.tsx client/src/pages/KanbanPage.tsx
git commit -m "feat: add kanban board with drag-and-drop and detail panel"
```

---

### Task 20: TaskDetail panel

**Files:**
- Create: `client/src/components/TaskDetail.tsx`

- [ ] **Step 1: Write TaskDetail component**

```tsx
import { useState } from 'react';
import { api } from '../api';
import type { Task } from '../types';

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export default function TaskDetail({ task, onClose, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(task);

  const statusLabels: Record<string, string> = {
    'todo': '待分析', 'analyzing': 'PM分析中', 'in-progress': '执行中', 'review': '待验收', 'merged': '已合并',
  };

  const handleSave = async () => {
    const updated = await api.updateTask(task.id, form);
    onUpdate(updated);
    setEditing(false);
  };

  const handleStart = async () => {
    const updated = await api.startTask(task.id);
    onUpdate(updated);
  };

  const handleMerge = async () => {
    try {
      const updated = await api.mergeTask(task.id);
      onUpdate(updated);
    } catch (err: any) {
      alert('合并失败: ' + err.message);
    }
  };

  return (
    <div style={{
      width: '380px',
      background: 'var(--bg-card)',
      borderLeft: '1px solid var(--border)',
      padding: '20px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{task.title}</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', fontSize: '18px', color: 'var(--text-secondary)',
        }}>×</button>
      </div>

      <div>
        <span style={{
          background: 'var(--bg-page)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-pill)',
          fontSize: '11px',
          color: 'var(--accent)',
          fontWeight: 600,
        }}>{statusLabels[task.status]}</span>
      </div>

      <Section label="描述">
        {editing ? (
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            style={textareaStyle} rows={4} />
        ) : (
          <Text>{task.description || '暂无'}</Text>
        )}
      </Section>

      <Section label="验收标准">
        {editing ? (
          <textarea value={form.acceptanceCriteria} onChange={(e) => setForm({ ...form, acceptanceCriteria: e.target.value })}
            style={textareaStyle} rows={3} />
        ) : (
          <Text>{task.acceptanceCriteria || '暂无'}</Text>
        )}
      </Section>

      {task.analysisNotes && (
        <Section label="PM分析笔记">
          <Text>{task.analysisNotes}</Text>
        </Section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
        <Meta label="优先级" value={task.priority === 'high' ? '高' : task.priority === 'normal' ? '中' : '低'} />
        <Meta label="估时" value={`${task.estimatedHours}h`} />
        <Meta label="负责人" value={task.assignedTo?.slice(0, 8) || '未分配'} />
        <Meta label="分支" value={task.branchName?.slice(0, 16) || '-'} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        {editing ? (
          <>
            <Button primary onClick={handleSave}>保存</Button>
            <Button onClick={() => setEditing(false)}>取消</Button>
          </>
        ) : (
          <>
            <Button onClick={() => { setForm(task); setEditing(true); }}>编辑</Button>
            {task.status === 'in-progress' && !task.worktreePath && (
              <Button primary onClick={handleStart}>启动执行</Button>
            )}
            {task.status === 'review' && (
              <Button primary onClick={handleMerge}>合并到主分支</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      {children}
    </div>
  );
}

function Text({ children }: { children: string }) {
  return (
    <div style={{
      background: 'var(--bg-page)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      fontSize: '12px',
      color: 'var(--text)',
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
    }}>{children}</div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{label}</div>
      <div style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Button({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      flex: 1,
      padding: '8px 14px',
      borderRadius: 'var(--radius-pill)',
      border: primary ? 'none' : '1px solid var(--border)',
      background: primary ? 'var(--accent)' : 'var(--bg-page)',
      color: primary ? '#fff' : 'var(--text)',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    }}>{children}</button>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-page)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontSize: '12px',
  color: 'var(--text)',
  lineHeight: 1.6,
  resize: 'vertical',
  outline: 'none',
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/TaskDetail.tsx
git commit -m "feat: add task detail slide-out panel"
```

---

## Phase 7: Worker Monitor & PM Chat

### Task 21: WorkerPage with terminal

**Files:**
- Create: `client/src/components/WorkerTerminal.tsx`
- Create: `client/src/pages/WorkerPage.tsx`

- [ ] **Step 1: Write WorkerTerminal component**

```tsx
// client/src/components/WorkerTerminal.tsx
import { useEffect, useRef, useState } from 'react';

interface Props {
  logs: string[];
}

export default function WorkerTerminal({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{
      background: '#1e1e2e',
      borderRadius: 'var(--radius)',
      border: '1px solid #333',
      overflow: 'hidden',
      fontFamily: "'Cascadia Code', 'Fira Code', monospace",
      fontSize: '12px',
      lineHeight: 1.7,
    }}>
      <div style={{
        background: '#2a2a3a',
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
      }}>
        <span style={{ color: '#aaa', fontSize: '11px' }}>Terminal</span>
        <span style={{ color: 'var(--green)', fontSize: '11px' }}>● Connected</span>
      </div>
      <div style={{
        padding: '12px 16px',
        maxHeight: '400px',
        overflowY: 'auto',
        color: '#ccc',
      }}>
        {logs.length === 0 && <div style={{ color: '#666' }}>等待输出...</div>}
        {logs.map((line, i) => (
          <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write WorkerPage**

```tsx
// client/src/pages/WorkerPage.tsx
import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import WorkerTerminal from '../components/WorkerTerminal';

export default function WorkerPage() {
  const { workers, currentProjectId, tasks, setWorkers, updateTask } = useStore();
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [workerLogs, setWorkerLogs] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProjectId) return;
    api.getWorkers(currentProjectId).then((ws) => {
      setWorkers(ws);
      setLoading(false);
    });
  }, [currentProjectId]);

  const workerTask = (workerId: string) => tasks.find((t) => t.assignedTo === workerId);

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>加载中...</div>;

  return (
    <div style={{ padding: '24px', display: 'flex', gap: '24px', height: '100%' }}>
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>员工列表</h3>
        {workers.map((w) => {
          const task = workerTask(w.id);
          return (
            <div
              key={w.id}
              onClick={() => setSelectedWorker(w.id)}
              style={{
                background: selectedWorker === w.id ? 'var(--accent-light)' : 'var(--bg-card)',
                border: selectedWorker === w.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>👷 {w.name}</div>
              <div style={{ fontSize: '11px', color: w.status === 'busy' ? 'var(--blue)' : 'var(--text-secondary)' }}>
                {w.status === 'busy' ? `执行中: ${task?.title || '-'}` : '空闲'}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1 }}>
        {selectedWorker ? (
          <>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
              {workers.find((w) => w.id === selectedWorker)?.name} · 实时输出
            </h3>
            <WorkerTerminal logs={workerLogs[selectedWorker] || []} />
          </>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            选择左侧员工查看实时工作台
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/WorkerTerminal.tsx client/src/pages/WorkerPage.tsx
git commit -m "feat: add worker monitor page with real-time terminal"
```

---

### Task 22: PM Chat page

**Files:**
- Create: `client/src/components/ChatMessage.tsx`
- Create: `client/src/pages/PMChatPage.tsx`

- [ ] **Step 1: Write ChatMessage component**

```tsx
// client/src/components/ChatMessage.tsx
import type { ChatMessage } from '../types';
import type { Task } from '../types';

interface Props {
  message: ChatMessage;
}

export default function ChatBubble({ message }: Props) {
  const isPM = message.role === 'pm';
  const attachedTasks: Task[] = message.tasksJson ? JSON.parse(message.tasksJson) : [];

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
      justifyContent: isPM ? 'flex-start' : 'flex-end',
      marginBottom: '16px',
    }}>
      {isPM && (
        <div style={{
          width: '32px', height: '32px', background: 'var(--accent-light)',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '14px', flexShrink: 0,
          color: 'var(--accent)',
        }}>&#10042;</div>
      )}
      <div style={{ maxWidth: '70%' }}>
        <div style={{
          fontSize: '10px',
          color: isPM ? 'var(--accent)' : 'var(--text-secondary)',
          marginBottom: '4px',
          textAlign: isPM ? 'left' : 'right',
        }}>
          {isPM ? `需求分析 PM` : '你'}
        </div>
        <div style={{
          background: isPM ? 'var(--bg-card)' : '#eef0ff',
          border: isPM ? '1px solid var(--border)' : '1px solid #dde0f8',
          borderRadius: isPM ? '0 12px 12px 12px' : '12px 0 12px 12px',
          padding: '12px 16px',
          fontSize: '13px',
          color: 'var(--text)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {message.content}
        </div>
        {attachedTasks.length > 0 && (
          <div style={{
            background: 'var(--green-light)',
            border: '1px solid #c8e6c9',
            borderRadius: '0 12px 12px 12px',
            padding: '14px',
            marginTop: '8px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--green)', marginBottom: '8px' }}>
              ✓ 生成了 {attachedTasks.length} 个任务卡片
            </div>
            {attachedTasks.map((t, i) => (
              <div key={i} style={{
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}>
                <span><strong>{i + 1}.</strong> {t.title}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{t.estimatedHours}h</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write PMChatPage**

```tsx
// client/src/pages/PMChatPage.tsx
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import ChatBubble from '../components/ChatMessage';
import type { ChatMessage } from '../types';

export default function PMChatPage() {
  const { currentProjectId } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      projectId: '',
      role: 'pm',
      pmType: 'analyzer',
      content: '你好！我是需求分析 PM。请告诉我你想要开发的项目，或者提供 PRD 文档路径和代码库路径，我会帮你分析需求并拆解任务。',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      projectId: currentProjectId || '',
      role: 'user',
      pmType: 'analyzer',
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate PM response (MVP: the PM is a CC process that will be connected later)
    setTimeout(() => {
      const pmReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        projectId: currentProjectId || '',
        role: 'pm',
        pmType: 'analyzer',
        content: `收到。我正在分析你的需求...后续版本会接入 Claude Code PM 进行实时对话和任务拆解。目前你可以通过看板手动管理任务卡片。`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, pmReply]);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ color: 'var(--accent)', fontSize: '16px' }}>&#10042;</span>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>需求分析 PM</span>
        <span style={{
          background: 'var(--accent-light)', color: 'var(--accent)',
          padding: '2px 10px', borderRadius: 'var(--radius-pill)',
          fontSize: '10px', fontWeight: 600,
        }}>活跃</span>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        background: 'var(--bg-page)',
      }}>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        padding: '12px 20px',
        display: 'flex',
        gap: '10px',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入你的需求描述..."
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border)',
            background: 'var(--bg-page)',
            fontSize: '13px',
            color: 'var(--text)',
            outline: 'none',
          }}
        />
        <button onClick={handleSend} style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          padding: '10px 20px',
          fontWeight: 600,
          fontSize: '13px',
        }}>发送</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ChatMessage.tsx client/src/pages/PMChatPage.tsx
git commit -m "feat: add PM chat page with conversation UI"
```

---

## Phase 8: Settings & Integration

### Task 23: Settings page

**Files:**
- Create: `client/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Write SettingsPage**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api } from '../api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { setCurrentProject } = useStore();
  const [form, setForm] = useState({
    name: '',
    sourceType: 'doc' as const,
    sourcePath: '',
    repoPath: '',
    mainBranch: 'main',
    workerCount: 2,
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.name) return alert('请输入项目名称');
    setSaving(true);
    try {
      const project = await api.createProject(form);
      setCurrentProject(project.id);
      navigate('/');
    } catch (err: any) {
      alert('创建失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
  };

  return (
    <div style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>创建新项目</h2>
      <div style={{ display: 'grid', gap: '16px' }}>
        <Field label="项目名称">
          <input style={fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如: 用户管理系统" />
        </Field>

        <Field label="需求来源类型">
          <select style={fieldStyle} value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value as any })}>
            <option value="doc">📄 PRD 文档</option>
            <option value="codebase">📁 扫描代码库</option>
          </select>
        </Field>

        <Field label={form.sourceType === 'doc' ? '文档路径' : '代码库路径'}>
          <input style={fieldStyle} value={form.sourcePath} onChange={(e) => setForm({ ...form, sourcePath: e.target.value })} placeholder={form.sourceType === 'doc' ? './docs/prd.md' : './'} />
        </Field>

        <Field label="Git 仓库路径">
          <input style={fieldStyle} value={form.repoPath} onChange={(e) => setForm({ ...form, repoPath: e.target.value })} placeholder="/path/to/your/repo" />
        </Field>

        <Field label="主分支">
          <input style={fieldStyle} value={form.mainBranch} onChange={(e) => setForm({ ...form, mainBranch: e.target.value })} placeholder="main" />
        </Field>

        <Field label="员工数量">
          <input style={fieldStyle} type="number" min={1} max={10} value={form.workerCount} onChange={(e) => setForm({ ...form, workerCount: parseInt(e.target.value) || 1 })} />
        </Field>

        <button onClick={handleCreate} disabled={saving} style={{
          marginTop: '8px',
          padding: '12px 24px',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: saving ? 'default' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? '创建中...' : '创建项目 →'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/SettingsPage.tsx
git commit -m "feat: add project settings/creation page"
```

---

### Task 24: Update server to serve client in dev

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Check if running in dev mode**

The Vite proxy in `vite.config.ts` already forwards `/api` and `/ws` to `localhost:3001`. In development, we run both servers separately. No changes needed for dev mode.

In production, the server already serves `client/dist` as configured in Task 12.

- [ ] **Step 2: Update root package.json dev script**

Make sure the `dev` script in root `package.json` works with concurrently:

```bash
npm pkg set scripts.dev="concurrently \"npm run dev -w server\" \"npm run dev -w client\""
```

Run: `npm run dev`
Expected: Both server (3001) and client (5173) start

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: configure dev script for concurrent server+client"
```

---

## Phase 9: End-to-End Verification

### Task 25: E2E flow verification

- [ ] **Step 1: Start both services**

Run: `npm run dev`
Expected: server on 3001, client on 5173

- [ ] **Step 2: Open browser**

Navigate to http://localhost:5173
Expected: Empty kanban board with navigation

- [ ] **Step 3: Create project**

Go to Settings → fill form → Create Project
Expected: Redirect to kanban page

- [ ] **Step 4: Create task manually (via API)**

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","title":"Test task","description":"A test","priority":"high","estimatedHours":1}'
```
Expected: Task appears on kanban board in TODO column

- [ ] **Step 5: Drag task between columns**

Drag the card from TODO to PM分析中
Expected: Card moves, status persisted on refresh

- [ ] **Step 6: Commit final changes**

```bash
git add -A
git commit -m "chore: final integration and verification"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Monorepo scaffolding |
| 2 | 4-5 | Types + SQLite database |
| 3 | 6-8 | Git manager, process manager, WS hub |
| 4 | 9-12 | API routes + server entry |
| 5 | 13-18 | Frontend foundation (styles, store, router) |
| 6 | 19-20 | Kanban board + task detail |
| 7 | 21-22 | Worker monitor + PM chat |
| 8 | 23-24 | Settings + dev integration |
| 9 | 25 | E2E verification |

**MVP out of scope:** Dark theme toggle, natural language-only requirements, multi-project, remote execution.
