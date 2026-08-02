#!/usr/bin/env node

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getProjectInfo, investigateLocal, loadMission, createDemoWorkspace } from './index.js';
import { serializeError } from './core/safe-error.js';
import { sanitizeText } from './security/redaction.js';

const HELP = `Ants v0.3.1

Read-only local incident investigation by Artixcore.

Usage:
  ants investigate <mission.json> --workspace <path> [--output .ants/<path>]
  ants validate <mission.json>
  ants demo [--output .ants/<path>]
  ants --version
  ants --help

Examples:
  ants investigate ./mission.json --workspace ./service
  ants investigate ./mission.json --workspace ./service --output .ants/manual-run
  ants demo

Report writes are restricted to the selected workspace's .ants directory.
Ants performs no remediation and executes no arbitrary shell command.
`;

export async function run(argv = process.argv.slice(2), io = console) {
  const project = getProjectInfo();

  if (argv.length === 0 || (argv.length === 1 && ['--help', '-h'].includes(argv[0]))) {
    io.log(HELP.trimEnd());
    return 0;
  }
  if (argv.length === 1 && ['--version', '-v'].includes(argv[0])) {
    io.log(project.version);
    return 0;
  }

  const command = argv[0];
  if (command === 'validate') {
    if (argv.length !== 2) throw new Error('validate requires exactly one mission JSON path.');
    const loaded = await loadMission(argv[1]);
    io.log(`Valid mission: ${safeTerminal(loaded.mission.missionId)}`);
    return 0;
  }

  if (command === 'investigate') {
    const missionPath = argv[1];
    if (!missionPath || missionPath.startsWith('--')) throw new Error('investigate requires a mission JSON path.');
    const options = parseOptions(argv.slice(2), new Set(['--workspace', '--output']));
    if (!options['--workspace']) throw new Error('investigate requires --workspace <path>.');
    const report = await investigateLocal({
      missionPath,
      workspaceRoot: options['--workspace'],
      outputDir: options['--output']
    });
    printResult(report, io);
    return report.status === 'completed' ? 0 : 2;
  }

  if (command === 'demo') {
    const options = parseOptions(argv.slice(1), new Set(['--output']));
    const demo = await createDemoWorkspace();
    const report = await investigateLocal({
      missionPath: demo.missionPath,
      workspaceRoot: demo.workspaceRoot,
      outputDir: options['--output'] ?? demo.outputDir
    });
    printResult(report, io);
    io.log(`Demo workspace: ${safeTerminal(demo.workspaceRoot)}`);
    return report.status === 'completed' ? 0 : 2;
  }

  throw new Error(`Unknown command: ${safeTerminal(command)}`);
}

function parseOptions(args, allowed) {
  const output = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!allowed.has(name)) throw new Error(`Unknown option: ${safeTerminal(name ?? '')}`);
    if (Object.hasOwn(output, name)) throw new Error(`Duplicate option: ${name}`);
    if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
    output[name] = value;
  }
  return output;
}

function printResult(report, io) {
  io.log(`Mission: ${safeTerminal(report.mission.missionId)}`);
  io.log(`Status: ${safeTerminal(report.status)}`);
  io.log(`Summary: ${safeTerminal(report.summary)}`);
  io.log(`Report directory: ${safeTerminal(path.resolve(report.outputDirectory))}`);
}

function safeTerminal(value) {
  return sanitizeText(value).replace(/[\r\n]+/g, ' ').slice(0, 4000);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      const safe = serializeError(error);
      console.error(`${safe.code}: ${safe.message}`);
      if (safe.details !== null) console.error(JSON.stringify(safe.details, null, 2));
      process.exitCode = 1;
    });
}
