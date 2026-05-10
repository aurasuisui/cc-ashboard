// client/src/types.ts
export type TaskStatus = 'todo' | 'analyzing' | 'in-progress' | 'review' | 'merged';
export type WorkerStatus = 'idle' | 'busy' | 'error';
export type Priority = 'low' | 'normal' | 'high';

export interface Project {
  id: string;
  name: string;
  sourceType: 'doc' | 'codebase';
  sourcePath: string;
  repoPath: string;
  mainBranch: string;
  status: string;
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
  dependencies: string;
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
  tasksJson: string | null;
  createdAt: string;
}

export interface WorkerOutput {
  type: 'worker-output';
  taskId: string;
  workerId: string;
  data: string;
  stream: 'stdout' | 'stderr';
}

export interface WorkerClosed {
  type: 'worker-closed';
  taskId: string;
  workerId: string;
  exitCode: number;
}

export interface PMChatEvent {
  type: 'pm-chat';
  from: string;
  content: string;
  pmType: 'analyzer' | 'dispatcher' | 'integrator';
  tasksJson?: string;
}

export type WSEvent = WorkerOutput | WorkerClosed | PMChatEvent;
