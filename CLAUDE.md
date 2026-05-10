# CC Dashboard

A web-based kanban dashboard tool for managing multiple Claude Code sessions through a three-PM pipeline (requirements analysis → dispatch → QA/merge).

## Project Info

- **Name:** cc-dashboard
- **Stack:** Node.js + Express + TypeScript (server), React 18 + Vite + Zustand (client), SQLite (better-sqlite3), WebSocket (ws)
- **Structure:** npm workspaces monorepo — `server/` and `client/`
- **Start:** `npm run dev` (server on :3001, client on :5173 via concurrently)

## Current Status (as of 2026-05-10)

**Phase 1 (MVP): COMPLETE** — 26 commits, all 25 tasks done, E2E verified.
- All backend API routes working (projects, tasks, workers)
- Frontend pages: Kanban board (5-column drag-and-drop), Worker monitor, PM chat, Settings
- Real-time WebSocket pipeline wired (ProcessManager → WSHub → useWebSocket hook)
- SQLite database with 4 tables (projects, tasks, workers, messages)
- Git worktree isolation for parallel worker CC processes

**Phase 2 (Fixes): PENDING** — 10 tasks in 2 stages, see fix plan.

## Key Files

- Design spec: `docs/superpowers/specs/2026-05-10-claude-code-dashboard-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-10-claude-code-dashboard-plan.md`
- Fix plan: `docs/superpowers/plans/2026-05-10-claude-code-dashboard-fixes.md`

## Known Issues (from code review)

- Command injection risk in git-manager.ts (repoPath unsanitized)
- No input validation on API routes
- No error handling middleware (DB errors crash server)
- WorkerPage terminal not wired to WebSocket (always shows "等待输出...")
- PM chat is hardcoded mock (future: spawn CC for analysis)
- No graceful shutdown (child processes orphaned)
- CORS wide open, no auth

## Next Steps

1. Start from the fix plan: `docs/superpowers/plans/2026-05-10-claude-code-dashboard-fixes.md`
2. Execute Stage 1 first (security + stability): Tasks 1-5
3. Then Stage 2 (feature completion): Tasks 6-10
