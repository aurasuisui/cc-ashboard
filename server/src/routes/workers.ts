import { Router, Request, Response } from 'express';
import db from '../db.js';
import { requireField } from './validation.js';

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
  try {
    const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const name = requireField(req.body, 'name', 'Worker name');
    db.prepare('UPDATE workers SET name = ? WHERE id = ?').run(name, req.params.id);
    const updated = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
