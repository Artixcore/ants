import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, '..', '..');
const EXAMPLE_ROOT = path.join(PROJECT_ROOT, 'examples', 'incidents', 'node-memory-crash');

export async function createDemoWorkspace({ parentDir } = {}) {
  const base = parentDir
    ? await ensureParent(parentDir)
    : await mkdtemp(path.join(tmpdir(), 'ants-demo-'));
  const workspaceRoot = path.join(base, 'service');
  await cp(path.join(EXAMPLE_ROOT, 'service'), workspaceRoot, { recursive: true });

  const failureSource = await readFile(path.join(workspaceRoot, 'src', 'upload.js'), 'utf8');
  const baselineSource = await readFile(path.join(EXAMPLE_ROOT, 'baseline', 'upload.js'), 'utf8');
  await writeFile(path.join(workspaceRoot, 'src', 'upload.js'), baselineSource, 'utf8');
  git(workspaceRoot, ['init', '--initial-branch=master']);
  git(workspaceRoot, ['config', 'user.email', 'ants-demo@artixcore.com']);
  git(workspaceRoot, ['config', 'user.name', 'Ants Demo']);
  git(workspaceRoot, ['add', '.']);
  git(workspaceRoot, ['commit', '-m', 'Use streaming upload processing']);

  await writeFile(path.join(workspaceRoot, 'src', 'upload.js'), failureSource, 'utf8');
  git(workspaceRoot, ['add', 'src/upload.js']);
  git(workspaceRoot, ['commit', '-m', 'Buffer uploads for retry cache']);

  return {
    workspaceRoot,
    missionPath: path.join(EXAMPLE_ROOT, 'mission.json'),
    outputDir: path.join(base, 'report')
  };
}

async function ensureParent(parentDir) {
  const absolute = path.resolve(parentDir);
  await mkdir(absolute, { recursive: true });
  return absolute;
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  if (result.status !== 0) {
    throw new Error(`Demo Git setup failed: git ${args.join(' ')}\n${result.stderr}`);
  }
}
