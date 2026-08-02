import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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
    return existsSync(path.join(this.workspaceRoot, '.git'));
  }

  log(limit = 20) {
    if (!this.available()) return { available: false, entries: [], raw: '' };
    const raw = this.#run([
      'log',
      '--date=iso-strict',
      '--pretty=format:%H%x09%aI%x09%s',
      '-n',
      String(Math.min(Math.max(limit, 1), 100))
    ]);
    const entries = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [commit, authoredAt, ...subject] = line.split('\t');
        return { commit, authoredAt, subject: subject.join('\t') };
      });
    return { available: true, entries, raw };
  }

  recentDiff() {
    if (!this.available()) return { available: false, raw: '', changedFiles: [] };
    const commits = this.#run(['rev-list', '--count', 'HEAD']).trim();
    if (Number(commits) < 2) return { available: true, raw: '', changedFiles: [] };

    const changed = this.#run(['diff', '--name-only', 'HEAD~1', 'HEAD', '--']);
    const raw = this.#run(['diff', '--unified=2', 'HEAD~1', 'HEAD', '--', '.', ':(exclude)package-lock.json']);
    return {
      available: true,
      raw,
      changedFiles: changed.split('\n').filter(Boolean)
    };
  }

  #run(args) {
    const result = spawnSync('git', args, {
      cwd: this.workspaceRoot,
      encoding: 'utf8',
      timeout: 10000,
      maxBuffer: OUTPUT_LIMIT,
      shell: false,
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_TERMINAL_PROMPT: '0'
      }
    });

    if (result.error) {
      throw new ToolExecutionError('Git command failed to execute.', { args, cause: result.error.message }, result.error);
    }
    if (result.status !== 0) {
      throw new ToolExecutionError('Git command returned a non-zero status.', {
        args,
        status: result.status,
        stderr: redactSecrets(result.stderr).value.slice(0, 2000)
      });
    }

    const output = redactSecrets(result.stdout).value.slice(0, OUTPUT_LIMIT);
    this.budget.consumeBytes(Buffer.byteLength(output));
    return output;
  }
}
