// Shared type definitions -- currently used as reference documentation.
// Server routes use these shapes via better-sqlite3 return types (cast as any).
// Future: integrate with Zod schemas for runtime validation.

export type TaskStatus = 'todo' | 'analyzing' | 'in-progress' | 'review' | 'merged';
export type WorkerStatus = 'idle' | 'busy' | 'error';
export type Priority = 'low' | 'normal' | 'high';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type SourceType = 'doc' | 'codebase';

export interface Project {
  id: string;
  name: string;
  sourceType: SourceType;
  sourcePath: string;
  repoPath: string;
  mainBranch: string;
  status: ProjectStatus;
  workerCount: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  status: TaskStatus;
  assignedTo: string | null;
  priority: Priority;
  estimatedHours: number;
  dependencies: string;     // JSON array of task IDs
  worktreePath: string | null;
  branchName: string | null;
  commitHash: string | null;
  analysisNotes: string;
  reviewNotes: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  projectId: string;
  name: string;
  status: WorkerStatus;
  currentTaskId: string | null;
  pid: number | null;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'pm' | 'user';
  pmType: 'analyzer' | 'dispatcher' | 'integrator';
  content: string;
  tasksJson: string | null;  // JSON string of attached task IDs/cards from PM
  createdAt: string;
}
