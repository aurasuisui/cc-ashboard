import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';

const router = Router();

// GET /api/messages?projectId=
router.get('/', (req: Request, res: Response) => {
  const messages = db.prepare('SELECT * FROM messages WHERE projectId = ? ORDER BY createdAt ASC').all(req.query.projectId);
  res.json(messages);
});

// POST /api/messages
router.post('/', (req: Request, res: Response) => {
  const { projectId, role, pmType, content, tasksJson } = req.body;
  if (!projectId || !role || !content) {
    return res.status(400).json({ error: 'projectId, role, and content are required' });
  }
  const id = uuid();
  db.prepare('INSERT INTO messages (id, projectId, role, pmType, content, tasksJson) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, projectId, role, pmType || 'analyzer', content, tasksJson || null);
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.status(201).json(message);
});

export default router;
