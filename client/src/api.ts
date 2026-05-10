// client/src/api.ts
const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getProjects: () => request<any[]>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  getTasks: (projectId: string) => request<any[]>(`/tasks?project=${projectId}`),
  createTask: (data: any) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) => request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  startTask: (id: string) => request<any>(`/tasks/${id}/start`, { method: 'POST' }),
  mergeTask: (id: string) => request<any>(`/tasks/${id}/merge`, { method: 'POST' }),
  deleteTask: (id: string) => request<any>(`/tasks/${id}`, { method: 'DELETE' }),

  getWorkers: (projectId: string) => request<any[]>(`/workers?project=${projectId}`),
  updateWorker: (id: string, data: any) => request<any>(`/workers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
