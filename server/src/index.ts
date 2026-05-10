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
const wsHub = new WSHub(httpServer, pm);

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

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Shutting down (${signal})...`);

  const forceExit = setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  for (const taskId of pm.getRunning()) {
    try { pm.kill(taskId); } catch { /* process already dead */ }
  }

  wsHub.close();
  httpServer.close(() => {
    clearTimeout(forceExit);
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
