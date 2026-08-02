#!/usr/bin/env node

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getProjectInfo, investigateLocal, loadMission, createDemoWorkspace } from './index.js';

const HELP = `Ants v0.3.0

Read-only local incident investigation by Artixcore.

Usage:
  ants investigate <mission.json> --workspace <path> [--output <path>]
  ants validate <mission.json>
  ants demo [--output <path>]
  ants --version
  ants --help

Examples:
  ants investigate ./mission.json --workspace ./service
  ants demo

Phase 3 reads bounded local artifacts, Git history, logs, runtime metadata, and source signals.
It writes reports only to the selected output directory and performs no remediation.
`;

export async function run(argv = process.argv.slice(2), io = console) {
  const project = getProjectInfo();

  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    io.log(HELP.trimEnd());
    return 0;
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    io.log(project.version);
    return 0;
  }

  const command = argv[0];
  if (command === 'validate') {
    const missionPath = argv[1];
    if (!missionPath) throw new Error('validate requires a mission JSON path.');
    const loaded = await loadMission(missionPath);
    io.log(`Valid mission: ${loaded.mission.missionId}`);
    return 0;
  }

  if (command === 'investigate') {
    const missionPath = argv[1];
    if (!missionPath) throw new Error('investigate requires a mission JSON path.');
    const workspaceRoot = optionValue(argv, '--workspace');
    if (!workspaceRoot) throw new Error('investigate requires --workspace <path>.');
    const outputDir = optionValue(argv, '--output');
    const report = await investigateLocal({ missionPath, workspaceRoot, outputDir });
    printResult(report, outputDir ?? path.join(path.resolve(workspaceRoot), '.ants', 'runs', report.mission.missionId), io);
    return report.status === 'completed' ? 0 : 2;
  }

  if (command === 'demo') {
    const requestedOutput = optionValue(argv, '--output');
    const demo = await createDemoWorkspace();
    const report = await investigateLocal({
      missionPath: demo.missionPath,
      workspaceRoot: demo.workspaceRoot,
      outputDir: requestedOutput ?? demo.outputDir
    });
    printResult(report, requestedOutput ?? demo.outputDir, io);
    io.log(`Demo workspace: ${demo.workspaceRoot}`);
    return report.status === 'completed' ? 0 : 2;
  }

  throw new Error(`Unknown command: ${command}`);
}

function optionValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return value;
}

function printResult(report, outputDir, io) {
  io.log(`Mission: ${report.mission.missionId}`);
  io.log(`Status: ${report.status}`);
  io.log(`Summary: ${report.summary}`);
  io.log(`Report directory: ${path.resolve(outputDir)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(`${error.code ? `${error.code}: ` : ''}${error.message}`);
      if (error.details) console.error(JSON.stringify(error.details, null, 2));
      process.exitCode = 1;
    });
}
