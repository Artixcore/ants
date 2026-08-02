import { stableId, stableHash } from '../core/ids.js';
import { ToolExecutionError } from '../core/errors.js';

export class ToolGateway {
  constructor({ mission, budget, filesystem, git, clock }) {
    this.mission = mission;
    this.budget = budget;
    this.filesystem = filesystem;
    this.git = git;
    this.clock = clock;
    this.auditEvents = [];
    this.sequence = 0;
  }

  async call(toolId, arguments_, context) {
    this.#authorize(toolId);
    this.budget.consumeToolCall();
    this.sequence += 1;
    const toolCallId = stableId('call', `${this.mission.missionId}:${this.sequence}:${toolId}:${stableHash(arguments_)}`);
    const startedAt = this.clock();
    const audit = {
      auditEventId: stableId('audit', toolCallId),
      toolCallId,
      missionId: this.mission.missionId,
      taskId: context.taskId,
      agentRunId: context.agentRunId,
      toolId,
      operation: 'read',
      requestedAt: startedAt,
      status: 'running'
    };
    this.auditEvents.push(audit);

    try {
      let data;
      if (toolId === 'filesystem.list') data = await this.filesystem.list();
      else if (toolId === 'filesystem.read') data = await this.filesystem.read(arguments_.path);
      else if (toolId === 'git.log') data = this.git.log(arguments_.limit);
      else if (toolId === 'git.diff') data = this.git.recentDiff();
      else throw new ToolExecutionError(`Unknown tool: ${toolId}`, { toolId });

      audit.status = 'completed';
      audit.completedAt = this.clock();
      audit.resultHash = stableHash(data);
      return { toolCallId, auditEventId: audit.auditEventId, data };
    } catch (error) {
      audit.status = 'failed';
      audit.completedAt = this.clock();
      audit.error = { code: error.code ?? 'UNEXPECTED_ERROR', message: error.message };
      throw error;
    }
  }

  snapshot() {
    return this.auditEvents.map((event) => structuredClone(event));
  }

  #authorize(toolId) {
    const resourceType = toolId.startsWith('git.') ? 'git' : 'filesystem';
    const allowed = this.mission.permissions.some((permission) =>
      permission.resourceType === resourceType && ['discover', 'read', 'analyze'].includes(permission.operation)
    );
    if (!allowed) {
      throw new ToolExecutionError(`Mission does not authorize ${resourceType} reads.`, { toolId, resourceType });
    }
  }
}
