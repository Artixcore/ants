import { stableId } from './ids.js';

export class TaskScheduler {
  constructor({ missionId, budget, clock }) {
    this.missionId = missionId;
    this.budget = budget;
    this.clock = clock;
    this.tasks = [];
  }

  async run(role, description, operation, { depth = 1 } = {}) {
    if (Number.isFinite(this.budget.limits.maxTaskDepth) && depth > this.budget.limits.maxTaskDepth) {
      throw new Error(`Task depth ${depth} exceeds maxTaskDepth ${this.budget.limits.maxTaskDepth}.`);
    }
    this.budget.consumeTask();
    const sequence = this.tasks.length + 1;
    const taskId = stableId('task', `${this.missionId}:${sequence}:${role}:${description}`);
    const agentRunId = stableId('run', `${taskId}:${role}`);
    const task = {
      taskId,
      agentRunId,
      role,
      description,
      depth,
      status: 'running',
      startedAt: this.clock()
    };
    this.tasks.push(task);

    try {
      const result = await operation({ taskId, agentRunId, role });
      task.status = 'completed';
      task.completedAt = this.clock();
      task.outputSummary = result?.summary ?? null;
      task.progressMade = result?.progressMade !== false;
      this.budget.markProgress(task.progressMade);
      return result;
    } catch (error) {
      task.status = 'failed';
      task.completedAt = this.clock();
      task.error = { code: error.code ?? 'UNEXPECTED_ERROR', message: error.message };
      throw error;
    }
  }

  snapshot() {
    return this.tasks.map((task) => structuredClone(task));
  }
}
