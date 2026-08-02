import { stableId, stableHash } from '../core/ids.js';
import { AntsError, ToolExecutionError } from '../core/errors.js';
import { serializeError } from '../core/safe-error.js';
import { matchesGlob } from '../security/path-policy.js';

const TOOL_DEFINITIONS = Object.freeze({
  'filesystem.list': { resourceType: 'filesystem', allowedArguments: [] },
  'filesystem.read': { resourceType: 'filesystem', allowedArguments: ['path'] },
  'git.log': { resourceType: 'git', allowedArguments: ['limit'] },
  'git.diff': { resourceType: 'git', allowedArguments: [] }
});

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

  canCall(toolId, arguments_ = {}) {
    try {
      const args = this.#validateArguments(toolId, arguments_);
      this.#authorize(toolId, args);
      return true;
    } catch {
      return false;
    }
  }

  async call(toolId, arguments_ = {}, context) {
    validateContext(context);
    this.sequence += 1;
    const normalizedToolId = typeof toolId === 'string' ? toolId : '[invalid-tool-id]';
    const toolCallId = stableId('call', `${this.mission.missionId}:${this.sequence}:${normalizedToolId}`);
    const startedAt = this.clock();
    const audit = {
      auditEventId: stableId('audit', toolCallId),
      toolCallId,
      missionId: this.mission.missionId,
      taskId: context.taskId,
      agentRunId: context.agentRunId,
      toolId: normalizedToolId,
      operation: 'read',
      requestedAt: startedAt,
      status: 'running'
    };
    this.auditEvents.push(audit);

    try {
      const args = this.#validateArguments(toolId, arguments_);
      audit.argumentsHash = stableHash(args);
      this.#authorize(toolId, args);
      this.budget.consumeToolCall();

      let data;
      if (toolId === 'filesystem.list') {
        const files = await this.filesystem.list();
        data = files.filter((file) => this.#filesystemPathAuthorized(file.path));
      } else if (toolId === 'filesystem.read') data = await this.filesystem.read(args.path);
      else if (toolId === 'git.log') data = this.git.log(args.limit);
      else if (toolId === 'git.diff') data = this.git.recentDiff();

      audit.status = 'completed';
      audit.completedAt = this.clock();
      audit.resultHash = stableHash(data);
      return { toolCallId, auditEventId: audit.auditEventId, data };
    } catch (error) {
      const normalized = error instanceof AntsError
        ? error
        : new ToolExecutionError('Tool execution failed unexpectedly.', { toolId: normalizedToolId }, error);
      audit.status = 'failed';
      audit.completedAt = this.clock();
      audit.error = serializeError(normalized);
      throw normalized;
    }
  }

  snapshot() {
    return this.auditEvents.map((event) => structuredClone(event));
  }

  #validateArguments(toolId, arguments_) {
    if (typeof toolId !== 'string' || toolId.length < 1 || toolId.length > 128 || /[\0\r\n]/.test(toolId)) {
      throw new ToolExecutionError('Tool identifier is invalid.');
    }
    const definition = TOOL_DEFINITIONS[toolId];
    if (!definition) throw new ToolExecutionError(`Unknown tool: ${toolId}`, { toolId });
    if (!arguments_ || typeof arguments_ !== 'object' || Array.isArray(arguments_)) {
      throw new ToolExecutionError('Tool arguments must be an object.', { toolId });
    }
    const unknown = Object.keys(arguments_).filter((key) => !definition.allowedArguments.includes(key));
    if (unknown.length > 0) throw new ToolExecutionError('Tool arguments contain unknown fields.', { toolId, unknown });

    const args = structuredClone(arguments_);
    if (toolId === 'filesystem.read') {
      if (typeof args.path !== 'string' || args.path.length < 1 || args.path.length > 4096 || /[\0\r\n]/.test(args.path)) {
        throw new ToolExecutionError('filesystem.read requires a safe path string.', { toolId });
      }
    }
    if (toolId === 'git.log' && args.limit !== undefined) {
      if (!Number.isSafeInteger(args.limit) || args.limit < 1 || args.limit > 100) {
        throw new ToolExecutionError('git.log limit must be an integer between 1 and 100.', { toolId });
      }
    }
    return Object.freeze(args);
  }

  #authorize(toolId, args) {
    const definition = TOOL_DEFINITIONS[toolId];
    const permissions = this.mission.permissions.filter((permission) =>
      permission.resourceType === definition.resourceType && ['discover', 'read', 'analyze'].includes(permission.operation)
    );
    if (permissions.length === 0) {
      throw new ToolExecutionError(`Mission does not authorize ${definition.resourceType} reads.`, {
        toolId,
        resourceType: definition.resourceType
      });
    }
    if (toolId === 'filesystem.read' && !permissions.some((permission) => matchesPermission(args.path, permission.scope))) {
      throw new ToolExecutionError('Mission permission scope does not authorize this file.', { toolId, path: args.path });
    }
  }

  #filesystemPathAuthorized(relativePath) {
    return this.mission.permissions.some((permission) =>
      permission.resourceType === 'filesystem' &&
      ['discover', 'read', 'analyze'].includes(permission.operation) &&
      matchesPermission(relativePath, permission.scope)
    );
  }
}

function matchesPermission(relativePath, scope) {
  if (scope === '**') return true;
  if (scope === '.') return relativePath === '.';
  return matchesGlob(relativePath, scope);
}

function validateContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new ToolExecutionError('Tool calls require task context.');
  }
  for (const key of ['taskId', 'agentRunId']) {
    if (typeof context[key] !== 'string' || context[key].length < 8 || context[key].length > 256 || /[\0\r\n]/.test(context[key])) {
      throw new ToolExecutionError(`Tool context ${key} is invalid.`);
    }
  }
}
