# Claude Code Dashboard — Design Spec

**Date:** 2026-05-10
**Status:** Draft

## Overview

CC Dashboard 是一个 Web 看板工具，统一管理多个 Claude Code 会话。由三个专职 PM（需求分析、调度分配、验收集成）在流水线上协作，多个员工 CC 并行开发，PM 最终集成交付。

## Core Workflow

```
输入(PRD文档/代码库) → 需求分析PM(对话+拆解) → 调度分配PM(指派员工) → 员工并行执行 → 验收集成PM(审查+合并) → 交付
```

PM 之间不直接对话，通过看板任务卡片的状态和字段传递信息。任务卡片是唯一的真相来源。

## Three PM Roles

### 1. 需求分析 PM (Requirements Analyzer)
- **输入:** PRD 文档 / 代码库 / 自然语言需求（后续版本）
- **行为:** 与用户多轮对话，逐步澄清需求，识别依赖，定义验收标准
- **输出:** 任务卡片列表（含描述、验收标准、优先级、估时、依赖关系）
- **交互方式:** 独立的「PM 对话」视图，消息式 UI

### 2. 调度分配 PM (Task Dispatcher)
- **输入:** 待分配任务卡片池
- **行为:** 根据技能匹配合适的员工，考虑任务依赖排序，分配并行执行计划
- **输出:** 已分配的执行计划，触发员工 CC 进程启动
- **交互方式:** 用户可以在看板上手动拖拽调整分配

### 3. 验收集成 PM (QA & Integrator)
- **输入:** 员工已完成的任务 + git commit diff
- **行为:** 代码审查、验证验收标准、解决合并冲突、集成测试、合并到主分支
- **输出:** 验收通过/打回重做，最终合并到 main 分支

## Task Lifecycle

```
TODO(待分析) → ANALYZING(PM分析中) → IN_PROGRESS(员工执行中) → REVIEW(待验收) → MERGED(已合并)
```

- **打回路径:** REVIEW → IN_PROGRESS（需修改）/ TODO（需重新分析）
- **需求变更:** REVIEW → ANALYZING（需求分析PM重新评估）

## Tech Stack

- **后端:** Node.js + Express + TypeScript
- **前端:** React + TypeScript (SPA)
- **构建工具:** Vite
- **实时通信:** WebSocket
- **存储:** SQLite（本地文件）
- **进程管理:** child_process.spawn
- **工作区隔离:** git worktree
- **启动方式:** `npx create-cc-dashboard` 或本地 CLI，一键启动 Web 服务

## Architecture

### Layer 1: React SPA (浏览器端)
- 看板视图（5列泳道，卡片拖拽）
- 员工实时工作台（终端日志流）
- PM 对话视图（消息式交互）
- 项目设置页

### Layer 2: Node.js 后端
- Express HTTP API
- WebSocket Hub（实时推送日志、状态变更）
- Process Manager（管理多个 CC 子进程）
- Git Manager（worktree 创建/清理、分支管理、合并）
- SQLite 持久化（任务、项目、会话状态）

### Layer 3: Claude Code 进程 (x N)
- 每个员工任务在独立 git worktree 中运行
- stdout/stderr 通过 WebSocket 实时推送到前端
- 进程生命周期由 Process Manager 管理

## Data Model

### Project
```
{
  id, name, source: { type: "doc"|"codebase", path },
  repoPath, mainBranch, status, createdAt
}
```

### Task
```
{
  id, projectId, title, description, acceptanceCriteria,
  status: "todo"|"analyzing"|"in-progress"|"review"|"merged",
  assignedTo: workerId|null, priority: "low"|"normal"|"high",
  estimatedHours, dependencies: [taskId, ...],
  worktreePath, branchName, commitHash,
  analysisNotes, reviewNotes, logs
}
```

### Worker
```
{
  id, name, role, status: "idle"|"busy"|"error",
  currentTaskId, pid, sessionLog
}
```

## Frontend Views

1. **看板主视图** — 5列泳道(TODO/PM分析中/执行中/待验收/已合并)，卡片显示优先级、依赖、进度条、分配员工，支持拖拽
2. **任务详情面板** — 右侧滑出，显示描述、验收标准、PM分析笔记、优先级/估时/依赖，支持手动编辑
3. **员工实时工作台** — 终端风格日志流，实时查看 CC 执行过程，支持手动输入指令
4. **PM 对话视图** — 消息式交互，用户与需求分析PM多轮对话，PM最终生成任务卡片
5. **项目设置页** — 配置项目名、仓库路径、需求来源、员工数量，一键启动

## Visual Design

### Colors
- 页面背景: `#faf9f5` (Claude Code 暖黄)
- 卡片背景: `#ffffff`
- 点缀/主按钮: `#d97757` (暖橙)
- 蓝色/链接: `#6aa2cf`
- 边框/分割: `#edece6`
- 标题文本: `#1a1a2e`
- 辅助文本: `#888888`

### Typography
- 几何无衬线字体 (Inter/Geist 风格)
- 清晰的字重层级
- 宽松留白，呼吸感布局

## API Endpoints (MVP)

```
GET    /api/projects          — 项目列表
POST   /api/projects          — 创建项目
GET    /api/projects/:id      — 项目详情
GET    /api/tasks?project=:id — 任务列表
POST   /api/tasks             — 创建任务
PATCH  /api/tasks/:id         — 更新任务（状态/分配）
POST   /api/tasks/:id/start   — 启动员工执行
POST   /api/tasks/:id/merge   — 触发验收合并
GET    /api/workers           — 员工列表
WS     /ws/worker/:id         — 员工实时日志流
WS     /ws/pm/:id             — PM 对话通信
```

## MVP Scope

- 创建项目、配置员工数量
- 需求分析PM读取PRD文档，拆解生成任务卡片
- 看板5列泳道展示，卡片拖拽变更状态
- 调度PM分配任务给员工
- 员工CC在独立git worktree中执行
- 实时查看员工终端日志
- 验收PM审查代码并合并到主分支
- 浅色主题

### Out of MVP
- 暗色主题切换
- 自然语言需求输入（需求分析从对话中理解）
- 多项目并行
- 远程分布式执行
- 任务依赖的自动识别
