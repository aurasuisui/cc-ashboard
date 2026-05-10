import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { requireField, optionalInt, optionalString, optionalEnum } from './validation.js';

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
  try {
    const name = requireField(req.body, 'name', 'Project name');
    const sourceType = optionalEnum(req.body, 'sourceType', ['doc', 'codebase'] as const, 'Source type') || 'doc';
    const sourcePath = optionalString(req.body, 'sourcePath') || '';
    const repoPath = optionalString(req.body, 'repoPath') || '';
    const mainBranch = optionalString(req.body, 'mainBranch') || 'main';
    const workerCount = optionalInt(req.body, 'workerCount', 1, 10) ?? 2;

    const id = uuid();

    db.prepare(`INSERT INTO projects (id, name, sourceType, sourcePath, repoPath, mainBranch, workerCount)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, name, sourceType, sourcePath, repoPath, mainBranch, workerCount);

    // Create workers for this project
    for (let i = 0; i < workerCount; i++) {
      db.prepare('INSERT INTO workers (id, projectId, name) VALUES (?, ?, ?)')
        .run(uuid(), id, `Worker-${i + 1}`);
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(project);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
