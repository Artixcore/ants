import { BudgetExceededError } from './errors.js';

export class BudgetTracker {
  constructor(budgets, { now = () => Date.now() } = {}) {
    this.limits = Object.freeze({ ...budgets });
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
    this.#consume('tasks', 'maxTasks', 1);
  }

  consumeToolCall() {
    this.assertTime();
    this.#consume('toolCalls', 'maxToolCalls', 1);
  }

  consumeBytes(count) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new BudgetExceededError('Byte usage must be a non-negative safe integer.', { count });
    }
    this.#consume('bytesRead', 'maxBytesRead', count, 'Mission byte-read budget exceeded.');
  }

  remainingBytes() {
    const limit = this.limits.maxBytesRead;
    if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY;
    return Math.max(0, limit - this.usage.bytesRead);
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

  #consume(usageKey, limitKey, amount, message = `${limitKey} exceeded.`) {
    const next = this.usage[usageKey] + amount;
    const limit = this.limits[limitKey];
    if (Number.isFinite(limit) && next > limit) {
      throw new BudgetExceededError(message, { actual: next, limit });
    }
    this.usage[usageKey] = next;
  }
}
