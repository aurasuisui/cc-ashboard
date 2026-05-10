import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'dashboard.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sourceType TEXT NOT NULL DEFAULT 'doc',
      sourcePath TEXT NOT NULL DEFAULT '',
      repoPath TEXT NOT NULL DEFAULT '',
      mainBranch TEXT NOT NULL DEFAULT 'main',
      status TEXT NOT NULL DEFAULT 'active',
      workerCount INTEGER NOT NULL DEFAULT 2,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      acceptanceCriteria TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      assignedTo TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      estimatedHours REAL NOT NULL DEFAULT 1,
      dependencies TEXT NOT NULL DEFAULT '[]',
      worktreePath TEXT,
      branchName TEXT,
      commitHash TEXT,
      analysisNotes TEXT NOT NULL DEFAULT '',
      reviewNotes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      currentTaskId TEXT,
      pid INTEGER,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'pm',
      pmType TEXT NOT NULL DEFAULT 'analyzer',
      content TEXT NOT NULL DEFAULT '',
      tasksJson TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
}

export default db;
