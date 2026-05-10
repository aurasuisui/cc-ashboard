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
