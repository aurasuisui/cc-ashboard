import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const WORKTREE_BASE = path.join(os.tmpdir(), 'cc-dashboard');

function validatePath(input: string, label: string): string {
  // Must be an absolute or relative path containing only safe characters
  if (!/^[a-zA-Z0-9_\-\.\/\\:]+$/.test(input)) {
    throw new Error(`Invalid ${label}: contains unsafe characters`);
  }
  // Reject path traversal
  if (input.includes('..')) {
    throw new Error(`Invalid ${label}: path traversal not allowed`);
  }
  return input;
}

export interface GitManager {
  createWorktree: (repoPath: string, branchName: string, taskId: string) => string;
  listWorktrees: (repoPath: string) => string[];
  removeWorktree: (worktreePath: string) => void;
  mergeToMain: (repoPath: string, branchName: string, mainBranch: string) => string;
  getHeadHash: (repoPath: string) => string;
  getDiff: (repoPath: string, branchName: string, mainBranch: string) => string;
}

export const git: GitManager = {
  createWorktree(repoPath: string, branchName: string, taskId: string): string {
    validatePath(repoPath, 'repoPath');
    validatePath(branchName, 'branchName');
    const worktreePath = path.join(WORKTREE_BASE, taskId);
    execSync(`git -C "${repoPath}" worktree add "${worktreePath}" -b "${branchName}"`, {
      stdio: 'pipe',
      timeout: 30000,
    });
    return worktreePath;
  },

  listWorktrees(repoPath: string): string[] {
    validatePath(repoPath, 'repoPath');
    const output = execSync(`git -C "${repoPath}" worktree list --porcelain`, { encoding: 'utf-8' });
    return output.split('\n')
      .filter(line => line.startsWith('worktree '))
      .map(line => line.replace('worktree ', ''));
  },

  removeWorktree(worktreePath: string): void {
    validatePath(worktreePath, 'worktreePath');
    execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'pipe' });
  },

  mergeToMain(repoPath: string, branchName: string, mainBranch: string): string {
    validatePath(repoPath, 'repoPath');
    validatePath(branchName, 'branchName');
    validatePath(mainBranch, 'mainBranch');
    const output = execSync(
      `git -C "${repoPath}" checkout "${mainBranch}" && git -C "${repoPath}" merge "${branchName}" --no-edit`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return output;
  },

  getHeadHash(repoPath: string): string {
    validatePath(repoPath, 'repoPath');
    return execSync(`git -C "${repoPath}" rev-parse HEAD`, {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
  },

  getDiff(repoPath: string, branchName: string, mainBranch: string): string {
    validatePath(repoPath, 'repoPath');
    validatePath(branchName, 'branchName');
    validatePath(mainBranch, 'mainBranch');
    return execSync(
      `git -C "${repoPath}" diff "${mainBranch}...${branchName}"`,
      { encoding: 'utf-8', timeout: 10000 }
    );
  },
};
