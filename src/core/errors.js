export class AntsError extends Error {
  constructor(message, { code = 'ANTS_ERROR', details = null, cause } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

export class MissionValidationError extends AntsError {
  constructor(message, details) {
    super(message, { code: 'MISSION_VALIDATION_ERROR', details });
  }
}

export class BudgetExceededError extends AntsError {
  constructor(message, details) {
    super(message, { code: 'BUDGET_EXCEEDED', details });
  }
}

export class SandboxViolationError extends AntsError {
  constructor(message, details) {
    super(message, { code: 'SANDBOX_VIOLATION', details });
  }
}

export class ToolExecutionError extends AntsError {
  constructor(message, details, cause) {
    super(message, { code: 'TOOL_EXECUTION_ERROR', details, cause });
  }
}
