import { randomUUID } from 'node:crypto';
import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import { AntsError } from './errors.js';

const DEFAULT_MISSION_FILE = 'mission.json';

export function createStarterMission({ now = new Date(), missionId } = {}) {
  const createdAt = normalizeDate(now);
  const resolvedMissionId = missionId ?? `mis_${randomUUID().replaceAll('-', '').slice(0, 24)}`;

  return {
    schemaVersion: '1.0.0',
    missionId: resolvedMissionId,
    title: 'Investigate a local Node.js service',
    objective: 'Determine the most likely cause of a local Node.js service failure using logs, runtime diagnostics, source code, package metadata, and Git history when available.',
    mode: 'read-only',
    scope: {
      environment: 'local',
      include: [
        'logs/**',
        'diagnostics/**',
        'src/**',
        'package.json'
      ],
      exclude: [
        '.env',
        '.env.*',
        'node_modules/**',
        '.git/**',
        '.ants/**'
      ]
    },
    permissions: [
      {
        resourceType: 'filesystem',
        operation: 'read',
        scope: '**'
      },
      {
        resourceType: 'git',
        operation: 'read',
        scope: '.'
      }
    ],
    budgets: {
      durationSeconds: 120,
      maxTasks: 10,
      maxTaskDepth: 4,
      maxToolCalls: 200,
      maxModelTokens: 0,
      maxEstimatedCostUsd: 0,
      maxBytesRead: 10485760,
      maxRetriesPerTask: 1
    },
    stopConditions: {
      minimumConfidence: 0.75,
      requiredIndependentValidations: 1,
      maxNoProgressTasks: 3,
      completeWhenDefensible: true,
      pauseOnSecretDetection: true
    },
    reporting: {
      format: 'markdown+json',
      includeEvidenceIndex: true,
      includeContradictions: true,
      includeLimitations: true
    },
    requestedBy: {
      type: 'user',
      id: 'local-user'
    },
    knownFacts: [],
    sensitivity: 'internal',
    retentionDays: 7,
    createdAt
  };
}

export async function writeStarterMission(filePath = DEFAULT_MISSION_FILE, { cwd = process.cwd(), now, missionId } = {}) {
  const target = await resolveSafeTarget(filePath, cwd);
  const mission = createStarterMission({ now, missionId });
  let handle;

  try {
    handle = await open(target, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(mission, null, 2)}\n`, 'utf8');
    await handle.sync();
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new AntsError('Mission file already exists. Refusing to overwrite it.', {
        code: 'MISSION_INIT_ERROR',
        details: { filePath: target }
      });
    }
    throw new AntsError('Unable to create starter mission file.', {
      code: 'MISSION_INIT_ERROR',
      details: { filePath: target, causeCode: error.code ?? 'UNKNOWN' },
      cause: error
    });
  } finally {
    if (handle) await handle.close().catch(() => {});
  }

  return { filePath: target, mission };
}

async function resolveSafeTarget(filePath, cwd) {
  if (typeof filePath !== 'string' || filePath.length === 0 || filePath.length > 2048 || /[\0\r\n]/.test(filePath)) {
    throw new AntsError('Mission output path must be a non-empty relative path.', {
      code: 'MISSION_INIT_ERROR'
    });
  }
  if (path.isAbsolute(filePath) || filePath.split(/[\\/]+/).includes('..')) {
    throw new AntsError('Mission output path must remain inside the current directory.', {
      code: 'MISSION_INIT_ERROR',
      details: { filePath }
    });
  }
  if (path.extname(filePath).toLowerCase() !== '.json') {
    throw new AntsError('Mission output file must use the .json extension.', {
      code: 'MISSION_INIT_ERROR',
      details: { filePath }
    });
  }

  try {
    const canonicalRoot = await realpath(path.resolve(cwd));
    const target = path.resolve(canonicalRoot, filePath);
    const canonicalParent = await realpath(path.dirname(target));
    const relativeParent = path.relative(canonicalRoot, canonicalParent);
    if (relativeParent.startsWith('..') || path.isAbsolute(relativeParent)) {
      throw new AntsError('Mission output path escaped the current directory.', {
        code: 'MISSION_INIT_ERROR',
        details: { filePath }
      });
    }
    return path.join(canonicalParent, path.basename(target));
  } catch (error) {
    if (error instanceof AntsError) throw error;
    throw new AntsError('Mission output parent directory must already exist and be accessible.', {
      code: 'MISSION_INIT_ERROR',
      details: { filePath, causeCode: error.code ?? 'UNKNOWN' },
      cause: error
    });
  }
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AntsError('Starter mission timestamp is invalid.', {
      code: 'MISSION_INIT_ERROR'
    });
  }
  return date.toISOString();
}
