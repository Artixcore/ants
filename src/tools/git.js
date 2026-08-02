import { lstatSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { redactSecrets } from '../security/redaction.js';
import { ToolExecutionError } from '../core/errors.js';

const OUTPUT_LIMIT = 256 * 1024;

export class GitTool {
  constructor({ workspaceRoot, budget }) {
    this.workspaceRoot = workspaceRoot;
    this.budget = budget;
  }

  available() {
    try {
      const stat = lstatSync(path.join(this.workspaceRoot, '.git'));
      return stat.isDirectory() && !stat.isSymbolicLink();
    } catch {
      return false;
    }
  }

  log(limit = 20) {
    if (!this.available()) return emptyLog();
    const normalizedLimit = Number.isSafeInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    const run = this.#run([
      'log', '--date=iso-strict', '--pretty=format:%H%x00%aI%x00%s%x00', '-n', String(normalizedLimit)
    ], { preserveNul: true });
    const parts = run.value.split('\0').filter((item) => item.length > 0);
    const entries = [];
    for (let index = 0; index + 2 < parts.length; index += 3) {
      entries.push({ commit: parts[index], authoredAt: parts[index + 1], subject: parts[index + 2] });
    }
    return { available: true, entries, raw: run.value, secretDetected: run.secretDetected, redaction: run.redaction };
  }

  recentDiff() {
    if (!this.available()) return emptyDiff();
    const countRun = this.#run(['rev-list', '--count', 'HEAD']);
    if (Number(countRun.value.trim()) < 2) return { ...emptyDiff(), available: true };

    const changedRun = this.#run(['diff', '--no-ext-diff', '--no-textconv', '--name-only', '-z', 'HEAD~1', 'HEAD', '--'], { preserveNul: true });
    const diffRun = this.#run(['diff', '--no-ext-diff', '--no-textconv', '--unified=2', 'HEAD~1', 'HEAD', '--', '.']);
    return {
      available: true,
      raw: diffRun.value,
      changedFiles: changedRun.value.split('\0').filter(Boolean),
      secretDetected: countRun.secretDetected || changedRun.secretDetected || diffRun.secretDetected,
      redaction: mergeRedactions(countRun.redaction, changedRun.redaction, diffRun.redaction)
    };
  }

  #run(commandArgs, { preserveNul = false } = {}) {
    const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
    const args = [
      '--no-pager',
      '-c', `core.hooksPath=${nullDevice}`,
      '-c', 'core.fsmonitor=false',
      '-c', 'color.ui=false',
      ...commandArgs
    ];
    const result = spawnSync('git', args, {
      cwd: this.workspaceRoot,
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: OUTPUT_LIMIT,
      shell: false,
      windowsHide: true,
      env: safeGitEnvironment(nullDevice)
    });

    if (result.error) {
      throw new ToolExecutionError('Git command failed to execute.', {
        operation: commandArgs[0],
        causeCode: result.error.code ?? 'UNKNOWN'
      }, result.error);
    }
    if (result.status !== 0) {
      throw new ToolExecutionError('Git command returned a non-zero status.', {
        operation: commandArgs[0],
        status: result.status,
        stderr: redactSecrets(result.stderr ?? '').value.slice(0, 2000)
      });
    }

    const redacted = redactSecrets(String(result.stdout ?? '').slice(0, OUTPUT_LIMIT), { preserveNul });
    this.budget.consumeBytes(Buffer.byteLength(redacted.value));
    return redacted;
  }
}

function safeGitEnvironment(nullDevice) {
  const env = {
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: nullDevice,
    GIT_TERMINAL_PROMPT: '0',
    GIT_PAGER: 'cat',
    PAGER: 'cat',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_LITERAL_PATHSPECS: '1',
    HOME: path.join(tmpdir(), 'ants-git-home')
  };
  for (const key of ['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TMP', 'TEMP', 'TMPDIR', 'LANG', 'LC_ALL']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function mergeRedactions(...items) {
  const categories = new Set();
  let removedCount = 0;
  for (const item of items) {
    for (const category of item?.categories ?? []) categories.add(category);
    removedCount += item?.removedCount ?? 0;
  }
  return { applied: removedCount > 0, categories: [...categories].sort(), removedCount };
}

function emptyLog() {
  return { available: false, entries: [], raw: '', secretDetected: false, redaction: { applied: false, categories: [], removedCount: 0 } };
}

function emptyDiff() {
  return { available: false, raw: '', changedFiles: [], secretDetected: false, redaction: { applied: false, categories: [], removedCount: 0 } };
}
