import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface TrackedProcess {
  taskId: string;
  workerId: string;
  process: ChildProcess;
  startTime: Date;
}

export class ProcessManager extends EventEmitter {
  private processes: Map<string, TrackedProcess> = new Map();

  spawn(taskId: string, workerId: string, worktreePath: string, taskDescription: string): void {
    const child = spawn('claude', ['--print', taskDescription], {
      cwd: worktreePath,
      env: { ...process.env, CI: 'true' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const tracked: TrackedProcess = { taskId, workerId, process: child, startTime: new Date() };
    this.processes.set(taskId, tracked);

    child.stdout.on('data', (data: Buffer) => {
      this.emit('output', { taskId, workerId, data: data.toString(), stream: 'stdout' });
    });

    child.stderr.on('data', (data: Buffer) => {
      this.emit('output', { taskId, workerId, data: data.toString(), stream: 'stderr' });
    });

    child.on('close', (code) => {
      this.emit('closed', { taskId, workerId, exitCode: code });
      this.processes.delete(taskId);
    });

    child.on('error', (err) => {
      this.emit('output', { taskId, workerId, data: `Process error: ${err.message}`, stream: 'stderr' });
      this.processes.delete(taskId);
    });
  }

  kill(taskId: string): void {
    const tracked = this.processes.get(taskId);
    if (tracked) {
      tracked.process.kill('SIGTERM');
      this.processes.delete(taskId);
    }
  }

  getRunning(): string[] {
    return Array.from(this.processes.keys());
  }

  isRunning(taskId: string): boolean {
    return this.processes.has(taskId);
  }

  sendStdin(taskId: string, input: string): void {
    const tracked = this.processes.get(taskId);
    if (tracked && tracked.process.stdin) {
      tracked.process.stdin.write(input + '\n');
    }
  }
}
