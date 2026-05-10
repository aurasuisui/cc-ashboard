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

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

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
