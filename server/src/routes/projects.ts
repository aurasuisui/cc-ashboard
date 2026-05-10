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
