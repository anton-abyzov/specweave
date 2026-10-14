/** All get registrations share the same atomic, checkout-aware adoption path. */
import { adoptRepository } from '../../../core/workspace/adoption.js';
import * as path from 'node:path';
export interface RegisterOptions { prefix?: string; role?: string; githubUrl?: string; }
export interface RegisterResult { registered: boolean; alreadyRegistered: boolean; }
export async function registerRepo(projectRoot: string, _owner: string, _repoName: string,
  repoPath: string, options: RegisterOptions = {}): Promise<RegisterResult> {
  const preview = await adoptRepository(projectRoot, path.resolve(projectRoot, repoPath), options);
  return { registered: preview.action === 'register', alreadyRegistered: preview.action === 'already-registered' };
}
