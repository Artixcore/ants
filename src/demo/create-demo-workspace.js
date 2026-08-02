import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactSecrets } from '../security/redaction.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MODULE_DIR, '..', '..');
const EXAMPLE_ROOT = path.join(PROJECT_ROOT, 'examples', 'incidents', 'node-memory-crash');

export async function createDemoWorkspace({ parentDir } = {}) {
  const parent = parentDir ? await ensureParent(parentDir) : tmpdir();
  const base = await mkdtemp(path.join(parent, 'ants-demo-'));
  const workspaceRoot = path.join(base, 'service');
  await cp(path.join(EXAMPLE_ROOT, 'service'), workspaceRoot, { recursive: true, errorOnExist: true });

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
    outputDir: path.join(workspaceRoot, '.ants', 'demo-report')
  };
}

async function ensureParent(parentDir) {
  const absolute = path.resolve(parentDir);
  await mkdir(absolute, { recursive: true });
  return absolute;
}

function git(cwd, commandArgs) {
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const args = ['--no-pager', '-c', `core.hooksPath=${nullDevice}`, '-c', 'core.fsmonitor=false', ...commandArgs];
  const env = {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: nullDevice,
    GIT_TERMINAL_PROMPT: '0',
    GIT_PAGER: 'cat',
    GIT_OPTIONAL_LOCKS: '0',
    HOME: path.join(tmpdir(), 'ants-demo-git-home')
  };
  for (const key of ['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TMP', 'TEMP', 'TMPDIR']) {
    if (process.env[key]) env[key] = process.env[key];
  }

  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 10000,
    windowsHide: true,
    env
  });
  if (result.status !== 0) {
    const message = redactSecrets(result.stderr ?? '').value.slice(0, 2000);
    throw new Error(`Demo Git setup failed during ${commandArgs[0]}: ${message}`);
  }
}
