import { constants as fsConstants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { MissionValidationError } from './errors.js';

const REQUIRED_TOP_LEVEL = [
  'schemaVersion', 'missionId', 'title', 'objective', 'mode', 'scope', 'permissions',
  'budgets', 'stopConditions', 'reporting', 'requestedBy', 'createdAt'
];
const TOP_LEVEL_FIELDS = new Set([
  ...REQUIRED_TOP_LEVEL, 'knownFacts', 'initialHypotheses', 'sensitivity', 'retentionDays', 'providerPreferences'
]);
const SCOPE_FIELDS = new Set(['environment', 'include', 'exclude', 'timeRange']);
const TIME_RANGE_FIELDS = new Set(['from', 'to']);
const PERMISSION_FIELDS = new Set(['resourceType', 'operation', 'scope']);
const BUDGET_FIELDS = new Set([
  'durationSeconds', 'maxTasks', 'maxTaskDepth', 'maxToolCalls', 'maxModelTokens',
  'maxEstimatedCostUsd', 'maxBytesRead', 'maxRetriesPerTask'
]);
const STOP_FIELDS = new Set([
  'minimumConfidence', 'requiredIndependentValidations', 'maxNoProgressTasks',
  'completeWhenDefensible', 'pauseOnSecretDetection'
]);
const REPORTING_FIELDS = new Set(['format', 'includeEvidenceIndex', 'includeContradictions', 'includeLimitations']);
const REQUESTED_BY_FIELDS = new Set(['type', 'id']);
const PROVIDER_FIELDS = new Set(['allowedProviders', 'preferLocal', 'maximumTier']);
const READ_OPERATIONS = new Set(['discover', 'read', 'analyze']);
const REQUESTER_TYPES = new Set(['user', 'service', 'schedule', 'alert', 'test']);
const SENSITIVITY_LEVELS = new Set(['public', 'internal', 'confidential', 'restricted']);
const MAX_MISSION_BYTES = 1024 * 1024;

export async function loadMission(filePath) {
  if (typeof filePath !== 'string' || filePath.length === 0 || filePath.includes('\0')) {
    throw new MissionValidationError('Mission path must be a non-empty string without null bytes.');
  }

  const absolutePath = path.resolve(filePath);
  let initialStat;
  try {
    initialStat = await lstat(absolutePath);
    if (initialStat.isSymbolicLink()) {
      throw new MissionValidationError('Mission files must not be symbolic links.', { filePath: absolutePath });
    }
    if (!initialStat.isFile()) {
      throw new MissionValidationError('Mission path must identify a regular file.', { filePath: absolutePath });
    }
    if (initialStat.size > MAX_MISSION_BYTES) {
      throw new MissionValidationError('Mission file exceeds the one MiB size limit.', {
        filePath: absolutePath,
        sizeBytes: initialStat.size,
        limitBytes: MAX_MISSION_BYTES
      });
    }
  } catch (error) {
    if (error instanceof MissionValidationError) throw error;
    throw new MissionValidationError(`Unable to inspect mission file: ${absolutePath}`, {
      causeCode: error.code ?? 'UNKNOWN'
    }, error);
  }

  const flags = process.platform === 'win32'
    ? fsConstants.O_RDONLY
    : fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  let handle;
  let raw;
  try {
    handle = await open(absolutePath, flags);
    const currentStat = await handle.stat();
    if (!currentStat.isFile()) throw new MissionValidationError('Mission path must identify a regular file.');
    if ((initialStat.dev !== undefined && currentStat.dev !== initialStat.dev) ||
        (initialStat.ino !== undefined && currentStat.ino !== initialStat.ino)) {
      throw new MissionValidationError('Mission file changed while it was being opened.');
    }
    if (currentStat.size > MAX_MISSION_BYTES) {
      throw new MissionValidationError('Mission file exceeds the one MiB size limit.', {
        sizeBytes: currentStat.size,
        limitBytes: MAX_MISSION_BYTES
      });
    }
    const buffer = Buffer.alloc(currentStat.size + 1);
    const result = await handle.read(buffer, 0, buffer.length, 0);
    if (result.bytesRead > MAX_MISSION_BYTES) {
      throw new MissionValidationError('Mission file exceeds the one MiB size limit.', {
        limitBytes: MAX_MISSION_BYTES
      });
    }
    raw = buffer.subarray(0, result.bytesRead).toString('utf8');
  } catch (error) {
    if (error instanceof MissionValidationError) throw error;
    throw new MissionValidationError(`Unable to read mission file: ${absolutePath}`, {
      causeCode: error.code ?? 'UNKNOWN'
    }, error);
  } finally {
    if (handle) await handle.close().catch(() => {});
  }

  let mission;
  try {
    mission = JSON.parse(raw);
  } catch (error) {
    throw new MissionValidationError('Mission file is not valid JSON.', {
      filePath: absolutePath,
      parseError: String(error.message ?? 'Unknown JSON error').slice(0, 500)
    }, error);
  }

  return { mission: validateMission(mission), filePath: absolutePath };
}

export function validateMission(input) {
  const errors = [];
  if (!isPlainObject(input)) {
    throw new MissionValidationError('Mission must be a plain JSON object.');
  }

  rejectUnknownFields(input, TOP_LEVEL_FIELDS, 'mission', errors);
  for (const field of REQUIRED_TOP_LEVEL) {
    if (!Object.hasOwn(input, field)) errors.push(`Missing required field: ${field}`);
  }

  validateBoundedString(input.schemaVersion, 'schemaVersion', 1, 32, errors);
  if (input.schemaVersion !== '1.0.0') errors.push('schemaVersion must be 1.0.0.');
  if (!/^mis_[A-Za-z0-9_-]{8,128}$/.test(input.missionId ?? '')) {
    errors.push('missionId must match the Ants mission identifier format.');
  }
  validateBoundedString(input.title, 'title', 3, 160, errors);
  validateBoundedString(input.objective, 'objective', 10, 4000, errors);
  if (input.mode !== 'read-only') errors.push('Phase 3 supports read-only missions only.');

  validateScope(input.scope, errors);
  validatePermissions(input.permissions, errors);
  validateBudgets(input.budgets, errors);
  validateStopConditions(input.stopConditions, errors);
  validateReporting(input.reporting, errors);
  validateRequestedBy(input.requestedBy, errors);

  if (!isDateTime(input.createdAt)) errors.push('createdAt must be a valid date-time string.');
  validateOptionalStringArray(input.knownFacts, 'knownFacts', 100, 2000, errors);
  validateOptionalStringArray(input.initialHypotheses, 'initialHypotheses', 50, 2000, errors);

  if (input.sensitivity !== undefined && !SENSITIVITY_LEVELS.has(input.sensitivity)) {
    errors.push('sensitivity is invalid.');
  }
  if (input.retentionDays !== undefined && !isIntegerInRange(input.retentionDays, 0, 3650)) {
    errors.push('retentionDays must be an integer between 0 and 3650.');
  }
  validateProviderPreferences(input.providerPreferences, errors);

  if (errors.length > 0) throw new MissionValidationError('Mission validation failed.', errors);

  const mission = structuredClone(input);
  return deepFreeze(mission);
}

function validateScope(scope, errors) {
  if (!isPlainObject(scope)) {
    errors.push('scope must be an object.');
    return;
  }
  rejectUnknownFields(scope, SCOPE_FIELDS, 'scope', errors);
  if (scope.environment !== 'local') errors.push('Phase 3 supports local missions only.');
  validatePathPatterns(scope.include, 'scope.include', { min: 1, max: 256 }, errors);
  validatePathPatterns(scope.exclude, 'scope.exclude', { min: 0, max: 256 }, errors);

  if (scope.timeRange !== undefined) {
    if (!isPlainObject(scope.timeRange)) errors.push('scope.timeRange must be an object.');
    else {
      rejectUnknownFields(scope.timeRange, TIME_RANGE_FIELDS, 'scope.timeRange', errors);
      if (!isDateTime(scope.timeRange.from) || !isDateTime(scope.timeRange.to)) {
        errors.push('scope.timeRange.from and scope.timeRange.to must be valid date-time strings.');
      } else if (Date.parse(scope.timeRange.from) > Date.parse(scope.timeRange.to)) {
        errors.push('scope.timeRange.from must not be after scope.timeRange.to.');
      }
    }
  }
}

function validatePermissions(permissions, errors) {
  if (!Array.isArray(permissions)) {
    errors.push('permissions must be an array.');
    return;
  }
  if (permissions.length > 256) errors.push('permissions must contain at most 256 entries.');

  let filesystemAuthorized = false;
  permissions.forEach((permission, index) => {
    const label = `permissions[${index}]`;
    if (!isPlainObject(permission)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    rejectUnknownFields(permission, PERMISSION_FIELDS, label, errors);
    if (!['filesystem', 'git'].includes(permission.resourceType)) {
      errors.push(`${label}.resourceType must be filesystem or git in Phase 3.`);
    }
    if (!READ_OPERATIONS.has(permission.operation)) {
      errors.push(`${label} is not read-only.`);
    }
    if (!isSafeRelativePattern(permission.scope, { allowDot: true })) {
      errors.push(`${label}.scope must be a safe relative path or glob.`);
    }
    if (permission.resourceType === 'git' && !['.', '**'].includes(permission.scope)) {
      errors.push(`${label}.scope must be . or ** for Git access.`);
    }
    if (permission.resourceType === 'filesystem' && READ_OPERATIONS.has(permission.operation)) filesystemAuthorized = true;
  });

  if (!filesystemAuthorized) errors.push('At least one read-only filesystem permission is required.');
}

function validateBudgets(budgets, errors) {
  if (!isPlainObject(budgets)) {
    errors.push('budgets must be an object.');
    return;
  }
  rejectUnknownFields(budgets, BUDGET_FIELDS, 'budgets', errors);
  validateInteger(budgets.durationSeconds, 'budgets.durationSeconds', 1, 604800, errors);
  validateInteger(budgets.maxTasks, 'budgets.maxTasks', 4, 10000, errors);
  if (budgets.maxTaskDepth !== undefined) validateInteger(budgets.maxTaskDepth, 'budgets.maxTaskDepth', 1, 64, errors);
  validateInteger(budgets.maxToolCalls, 'budgets.maxToolCalls', 1, 100000, errors);
  validateInteger(budgets.maxModelTokens, 'budgets.maxModelTokens', 0, 1000000000, errors);
  validateNumber(budgets.maxEstimatedCostUsd, 'budgets.maxEstimatedCostUsd', 0, 1000000, errors);
  if (budgets.maxBytesRead !== undefined) validateInteger(budgets.maxBytesRead, 'budgets.maxBytesRead', 0, Number.MAX_SAFE_INTEGER, errors);
  if (budgets.maxRetriesPerTask !== undefined) validateInteger(budgets.maxRetriesPerTask, 'budgets.maxRetriesPerTask', 0, 20, errors);
}

function validateStopConditions(stop, errors) {
  if (!isPlainObject(stop)) {
    errors.push('stopConditions must be an object.');
    return;
  }
  rejectUnknownFields(stop, STOP_FIELDS, 'stopConditions', errors);
  if (stop.minimumConfidence !== undefined) validateNumber(stop.minimumConfidence, 'stopConditions.minimumConfidence', 0, 1, errors);
  validateInteger(stop.requiredIndependentValidations, 'stopConditions.requiredIndependentValidations', 0, 20, errors);
  validateInteger(stop.maxNoProgressTasks, 'stopConditions.maxNoProgressTasks', 1, 100, errors);
  validateBoolean(stop.completeWhenDefensible, 'stopConditions.completeWhenDefensible', errors);
  if (stop.pauseOnSecretDetection !== undefined) validateBoolean(stop.pauseOnSecretDetection, 'stopConditions.pauseOnSecretDetection', errors);
}

function validateReporting(reporting, errors) {
  if (!isPlainObject(reporting)) {
    errors.push('reporting must be an object.');
    return;
  }
  rejectUnknownFields(reporting, REPORTING_FIELDS, 'reporting', errors);
  if (!['json', 'markdown', 'markdown+json'].includes(reporting.format)) {
    errors.push('reporting.format must be json, markdown, or markdown+json.');
  }
  validateBoolean(reporting.includeEvidenceIndex, 'reporting.includeEvidenceIndex', errors);
  validateBoolean(reporting.includeContradictions, 'reporting.includeContradictions', errors);
  validateBoolean(reporting.includeLimitations, 'reporting.includeLimitations', errors);
}

function validateRequestedBy(requestedBy, errors) {
  if (!isPlainObject(requestedBy)) {
    errors.push('requestedBy must be an object.');
    return;
  }
  rejectUnknownFields(requestedBy, REQUESTED_BY_FIELDS, 'requestedBy', errors);
  if (!REQUESTER_TYPES.has(requestedBy.type)) errors.push('requestedBy.type is invalid.');
  validateBoundedString(requestedBy.id, 'requestedBy.id', 1, 256, errors);
}

function validateProviderPreferences(preferences, errors) {
  if (preferences === undefined) return;
  if (!isPlainObject(preferences)) {
    errors.push('providerPreferences must be an object.');
    return;
  }
  rejectUnknownFields(preferences, PROVIDER_FIELDS, 'providerPreferences', errors);
  if (preferences.allowedProviders !== undefined) {
    validateOptionalStringArray(preferences.allowedProviders, 'providerPreferences.allowedProviders', 100, 100, errors, 1);
  }
  if (preferences.preferLocal !== undefined) validateBoolean(preferences.preferLocal, 'providerPreferences.preferLocal', errors);
  if (preferences.maximumTier !== undefined && !['economy', 'standard', 'reasoning', 'reporting', 'local-sensitive'].includes(preferences.maximumTier)) {
    errors.push('providerPreferences.maximumTier is invalid.');
  }
}

function validatePathPatterns(value, label, { min, max }, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  if (value.length < min || value.length > max) errors.push(`${label} must contain between ${min} and ${max} entries.`);
  value.forEach((item, index) => {
    if (!isSafeRelativePattern(item)) errors.push(`${label}[${index}] must be a safe relative path or glob.`);
  });
}

function isSafeRelativePattern(value, { allowDot = false } = {}) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048 || /[\0\r\n]/.test(value)) return false;
  if (allowDot && value === '.') return true;
  if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(value)) return false;
  return !value.split(/[\\/]+/).includes('..');
}

function validateOptionalStringArray(value, label, maxItems, maxLength, errors, minLength = 0) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  if (value.length > maxItems) errors.push(`${label} must contain at most ${maxItems} entries.`);
  value.forEach((item, index) => validateBoundedString(item, `${label}[${index}]`, minLength, maxLength, errors));
}

function validateBoundedString(value, label, min, max, errors) {
  if (typeof value !== 'string' || value.length < min || value.length > max || value.includes('\0')) {
    errors.push(`${label} must be a string between ${min} and ${max} characters without null bytes.`);
  }
}

function validateInteger(value, label, min, max, errors) {
  if (!isIntegerInRange(value, min, max)) errors.push(`${label} must be an integer between ${min} and ${max}.`);
}

function validateNumber(value, label, min, max, errors) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${label} must be a finite number between ${min} and ${max}.`);
  }
}

function validateBoolean(value, label, errors) {
  if (typeof value !== 'boolean') errors.push(`${label} must be a boolean.`);
}

function isIntegerInRange(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function isDateTime(value) {
  return typeof value === 'string' &&
    value.length <= 100 &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function rejectUnknownFields(object, allowed, label, errors) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) errors.push(`Unknown field: ${label}.${key}`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
