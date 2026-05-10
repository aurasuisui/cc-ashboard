import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { git } from '../git-manager.js';
import { ProcessManager } from '../process-manager.js';
import { requireField, optionalString, optionalInt, optionalEnum, VALID_STATUSES, VALID_PRIORITIES } from './validation.js';

export function createTaskRoutes(pm: ProcessManager): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const tasks = db.prepare('SELECT * FROM tasks WHERE projectId = ? ORDER BY createdAt ASC').all(req.query.project);
    res.json(tasks);
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const projectId = requireField(req.body, 'projectId', 'Project ID');
      const title = requireField(req.body, 'title', 'Task title');
      const description = optionalString(req.body, 'description') || '';
      const acceptanceCriteria = optionalString(req.body, 'acceptanceCriteria') || '';
      const priority = optionalEnum(req.body, 'priority', VALID_PRIORITIES, 'Priority') || 'normal';
      const estimatedHours = optionalInt(req.body, 'estimatedHours', 1, 100) ?? 1;

      const rawDeps = req.body.dependencies;
      if (rawDeps !== undefined && rawDeps !== null && !Array.isArray(rawDeps)) {
        throw new Error('dependencies must be an array');
      }
      const dependencies = (Array.isArray(rawDeps) ? rawDeps : []) as unknown[];

      const id = uuid();

      db.prepare(`INSERT INTO tasks (id, projectId, title, description, acceptanceCriteria, priority, estimatedHours, dependencies)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, projectId, title, description, acceptanceCriteria, priority, estimatedHours, JSON.stringify(dependencies));

      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
      if (!task) return res.status(404).json({ error: 'Task not found' });

      // Validate all fields
      const status = optionalEnum(req.body, 'status', VALID_STATUSES, 'Status');
      const priority = optionalEnum(req.body, 'priority', VALID_PRIORITIES, 'Priority');
      const title = optionalString(req.body, 'title');
      const description = optionalString(req.body, 'description');
      const acceptanceCriteria = optionalString(req.body, 'acceptanceCriteria');
      const analysisNotes = optionalString(req.body, 'analysisNotes');
      const reviewNotes = optionalString(req.body, 'reviewNotes');
      const estimatedHours = optionalInt(req.body, 'estimatedHours', 1, 100);

      // assignedTo extracted directly (not via optionalString) to preserve null = unassign
      const assignedTo = req.body.assignedTo !== undefined ? req.body.assignedTo : undefined;

      db.prepare(`UPDATE tasks SET
        status = ?, assignedTo = ?, title = ?, description = ?,
        acceptanceCriteria = ?, priority = ?, estimatedHours = ?,
        analysisNotes = ?, reviewNotes = ?
        WHERE id = ?`)
        .run(
          status ?? task.status,
          assignedTo !== undefined ? assignedTo : task.assignedTo,
          title ?? task.title,
          description ?? task.description,
          acceptanceCriteria ?? task.acceptanceCriteria,
          priority ?? task.priority,
          estimatedHours ?? task.estimatedHours,
          analysisNotes ?? task.analysisNotes,
          reviewNotes ?? task.reviewNotes,
          req.params.id
        );

      if (assignedTo) {
        db.prepare('UPDATE workers SET status = ?, currentTaskId = ? WHERE id = ?')
          .run('busy', req.params.id, assignedTo);
      }

      const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/:id/start', (req: Request, res: Response) => {
    const task = db.prepare('SELECT t.*, p.repoPath, p.mainBranch FROM tasks t JOIN projects p ON t.projectId = p.id WHERE t.id = ?')
      .get(req.params.id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const branchName = `feature/${task.id.slice(0, 8)}-${task.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    try {
      const worktreePath = git.createWorktree(task.repoPath, branchName, task.id);

      db.prepare('UPDATE tasks SET worktreePath = ?, branchName = ?, status = ? WHERE id = ?')
        .run(worktreePath, branchName, 'in-progress', task.id);

      if (task.assignedTo) {
        const prompt = `任务: ${task.title}\n描述: ${task.description}\n验收标准: ${task.acceptanceCriteria}\n\n请在当前工作目录中实现以上任务。完成后报告结果。`;
        pm.spawn(task.id, task.assignedTo, worktreePath, prompt);
      }

      const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: `Git operation failed: ${(err as Error).message}` });
    }
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
