import { BudgetExceededError } from './errors.js';

export class BudgetTracker {
  constructor(budgets, { now = () => Date.now() } = {}) {
    this.limits = { ...budgets };
    this.now = now;
    this.startedAtMs = now();
    this.usage = {
      tasks: 0,
      toolCalls: 0,
      modelTokens: 0,
      estimatedCostUsd: 0,
      bytesRead: 0,
      noProgressTasks: 0
    };
  }

  assertTime() {
    const elapsedSeconds = (this.now() - this.startedAtMs) / 1000;
    if (elapsedSeconds > this.limits.durationSeconds) {
      throw new BudgetExceededError('Mission duration budget exceeded.', {
        elapsedSeconds,
        limit: this.limits.durationSeconds
      });
    }
  }

  consumeTask() {
    this.assertTime();
    this.usage.tasks += 1;
    this.#assertLimit('tasks', 'maxTasks');
  }

  consumeToolCall() {
    this.assertTime();
    this.usage.toolCalls += 1;
    this.#assertLimit('toolCalls', 'maxToolCalls');
  }

  consumeBytes(count) {
    this.usage.bytesRead += Math.max(0, count);
    if (Number.isFinite(this.limits.maxBytesRead) && this.usage.bytesRead > this.limits.maxBytesRead) {
      throw new BudgetExceededError('Mission byte-read budget exceeded.', {
        actual: this.usage.bytesRead,
        limit: this.limits.maxBytesRead
      });
    }
  }

  markProgress(progressMade) {
    this.usage.noProgressTasks = progressMade ? 0 : this.usage.noProgressTasks + 1;
  }

  snapshot() {
    return Object.freeze({
      limits: { ...this.limits },
      usage: { ...this.usage },
      elapsedSeconds: Number(((this.now() - this.startedAtMs) / 1000).toFixed(3))
    });
  }

  #assertLimit(usageKey, limitKey) {
    const limit = this.limits[limitKey];
    if (Number.isFinite(limit) && this.usage[usageKey] > limit) {
      throw new BudgetExceededError(`${limitKey} exceeded.`, {
        actual: this.usage[usageKey],
        limit
      });
    }
  }
}
