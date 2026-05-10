import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const WORKTREE_BASE = path.join(os.tmpdir(), 'cc-dashboard');

export interface GitManager {
  createWorktree: (repoPath: string, branchName: string, taskId: string) => string;
  listWorktrees: (repoPath: string) => string[];
  removeWorktree: (worktreePath: string) => void;
  mergeToMain: (repoPath: string, branchName: string, mainBranch: string) => string;
  getDiff: (repoPath: string, branchName: string, mainBranch: string) => string;
}

export const git: GitManager = {
  createWorktree(repoPath: string, branchName: string, taskId: string): string {
    const worktreePath = path.join(WORKTREE_BASE, taskId);
    execSync(`git -C "${repoPath}" worktree add "${worktreePath}" -b "${branchName}"`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    return worktreePath;
  },

  listWorktrees(repoPath: string): string[] {
    const output = execSync(`git -C "${repoPath}" worktree list --porcelain`, { encoding: 'utf-8' });
    return output.split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => line.replace('worktree ', ''));
  },

  removeWorktree(worktreePath: string): void {
    execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'pipe' });
  },

  mergeToMain(repoPath: string, branchName: string, mainBranch: string): string {
    const output = execSync(
      `git -C "${repoPath}" checkout "${mainBranch}" && git -C "${repoPath}" merge "${branchName}" --no-edit`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return output;
  },

  getDiff(repoPath: string, branchName: string, mainBranch: string): string {
    return execSync(
      `git -C "${repoPath}" diff "${mainBranch}...${branchName}"`,
      { encoding: 'utf-8', timeout: 10000 }
    );
  },
};
