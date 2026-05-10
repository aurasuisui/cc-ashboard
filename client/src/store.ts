import { create } from 'zustand';
import type { Project, Task, TaskStatus, Worker } from './types';

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  tasks: Task[];
  workers: Worker[];

  setProjects: (projects: Project[]) => void;
  setCurrentProject: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateTask: (task: Task) => void;
  setTaskStatus: (taskId: string, status: TaskStatus) => void;
  removeTask: (id: string) => void;
  setWorkers: (workers: Worker[]) => void;
  updateWorker: (worker: Worker) => void;
  addLog: (taskId: string, text: string) => void;
}

export const useStore = create<AppState>((set) => ({
  projects: [],
  currentProjectId: localStorage.getItem('cc-dashboard-currentProjectId') || null,
  tasks: [],
  workers: [],

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (id) => {
    localStorage.setItem('cc-dashboard-currentProjectId', id);
    set({ currentProjectId: id });
  },
  setTasks: (tasks) => set({ tasks }),
  updateTask: (task) => set((s) => ({
    tasks: s.tasks.map((t) => (t.id === task.id ? task : t)),
  })),
  setTaskStatus: (taskId, status) => set((s) => ({
    tasks: s.tasks.map((t) =>
      t.id === taskId ? { ...t, status } : t
    ),
  })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  setWorkers: (workers) => set({ workers }),
  updateWorker: (worker) => set((s) => ({
    workers: s.workers.map((w) => (w.id === worker.id ? worker : w)),
  })),
  addLog: (taskId, text) => set((s) => ({
    tasks: s.tasks.map((t) =>
      t.id === taskId ? { ...t, logLines: [...(t.logLines || []), text] } : t
    ),
  })),
}));
