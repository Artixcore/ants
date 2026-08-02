import { lstat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { OutputSafetyError } from '../core/errors.js';
import { isWithin } from './path-policy.js';

export async function prepareOutputDirectory({ workspaceRoot, requestedOutput, missionId }) {
  const allowedRoot = path.join(workspaceRoot, '.ants');
  const target = requestedOutput
    ? path.resolve(workspaceRoot, requestedOutput)
    : path.join(allowedRoot, 'runs', missionId);

  if (!isWithin(allowedRoot, target)) {
    throw new OutputSafetyError('Report output must remain inside the workspace .ants directory.', {
      allowedRoot,
      requestedOutput: target
    });
  }

  await ensureDirectoryChain(workspaceRoot, target);
  const canonical = await realpath(target);
  const canonicalAllowedRoot = await realpath(allowedRoot);
  if (!isWithin(canonicalAllowedRoot, canonical)) {
    throw new OutputSafetyError('The report output directory escaped the allowed .ants root.', { target: canonical });
  }
  return canonical;
}

async function ensureDirectoryChain(workspaceRoot, target) {
  const relative = path.relative(workspaceRoot, target);
  let current = workspaceRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new OutputSafetyError('Output directories must not contain symbolic links.', { path: current });
      if (!stat.isDirectory()) throw new OutputSafetyError('An output path component is not a directory.', { path: current });
    } catch (error) {
      if (error instanceof OutputSafetyError) throw error;
      if (error.code !== 'ENOENT') {
        throw new OutputSafetyError('Unable to inspect output directory.', { path: current, causeCode: error.code ?? 'UNKNOWN' }, error);
      }
      await mkdir(current, { mode: 0o700 });
    }
  }
}
