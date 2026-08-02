import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MissionValidationError } from './errors.js';

const REQUIRED_TOP_LEVEL = [
  'schemaVersion',
  'missionId',
  'title',
  'objective',
  'mode',
  'scope',
  'permissions',
  'budgets',
  'stopConditions',
  'reporting',
  'requestedBy',
  'createdAt'
];

export async function loadMission(filePath) {
  const absolutePath = path.resolve(filePath);
  let raw;

  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error) {
    throw new MissionValidationError(`Unable to read mission file: ${absolutePath}`, {
      cause: error.message
    });
  }

  let mission;
  try {
    mission = JSON.parse(raw);
  } catch (error) {
    throw new MissionValidationError('Mission file is not valid JSON.', {
      filePath: absolutePath,
      cause: error.message
    });
  }

  return { mission: validateMission(mission), filePath: absolutePath };
}

export function validateMission(mission) {
  const errors = [];

  if (!mission || typeof mission !== 'object' || Array.isArray(mission)) {
    throw new MissionValidationError('Mission must be a JSON object.');
  }

  for (const field of REQUIRED_TOP_LEVEL) {
    if (!(field in mission)) errors.push(`Missing required field: ${field}`);
  }

  if (mission.schemaVersion !== '1.0.0') errors.push('schemaVersion must be 1.0.0.');
  if (!/^mis_[A-Za-z0-9_-]{8,128}$/.test(mission.missionId ?? '')) {
    errors.push('missionId must match the Ants mission identifier format.');
  }
  if (typeof mission.title !== 'string' || mission.title.length < 3) errors.push('title is too short.');
  if (typeof mission.objective !== 'string' || mission.objective.length < 10) {
    errors.push('objective is too short.');
  }
  if (mission.mode !== 'read-only') {
    errors.push('Phase 3 supports read-only missions only.');
  }
  if (mission.scope?.environment !== 'local') {
    errors.push('Phase 3 supports local missions only.');
  }
  if (!Array.isArray(mission.scope?.include) || mission.scope.include.length === 0) {
    errors.push('scope.include must contain at least one path or glob.');
  }
  if (!Array.isArray(mission.scope?.exclude)) errors.push('scope.exclude must be an array.');
  if (!Array.isArray(mission.permissions)) errors.push('permissions must be an array.');

  for (const permission of mission.permissions ?? []) {
    if (!['discover', 'read', 'analyze'].includes(permission.operation)) {
      errors.push(`Permission ${permission.resourceType ?? 'unknown'}:${permission.operation ?? 'unknown'} is not read-only.`);
    }
  }

  const budgets = mission.budgets ?? {};
  for (const key of ['durationSeconds', 'maxTasks', 'maxToolCalls', 'maxModelTokens', 'maxEstimatedCostUsd']) {
    if (typeof budgets[key] !== 'number' || budgets[key] < 0) errors.push(`budgets.${key} must be non-negative.`);
  }
  if ((budgets.maxTasks ?? 0) < 4) errors.push('budgets.maxTasks must allow the four MVP agent stages.');
  if ((budgets.maxToolCalls ?? 0) < 1) errors.push('budgets.maxToolCalls must be at least 1.');

  const stop = mission.stopConditions ?? {};
  if (!Number.isInteger(stop.requiredIndependentValidations) || stop.requiredIndependentValidations < 0) {
    errors.push('stopConditions.requiredIndependentValidations must be a non-negative integer.');
  }
  if (!Number.isInteger(stop.maxNoProgressTasks) || stop.maxNoProgressTasks < 1) {
    errors.push('stopConditions.maxNoProgressTasks must be at least 1.');
  }

  if (!['json', 'markdown', 'markdown+json'].includes(mission.reporting?.format)) {
    errors.push('reporting.format must be json, markdown, or markdown+json.');
  }

  if (errors.length > 0) {
    throw new MissionValidationError('Mission validation failed.', errors);
  }

  return structuredClone(mission);
}
