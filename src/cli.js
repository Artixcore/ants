#!/usr/bin/env node

import { getProjectInfo } from './index.js';

const HELP = `Ants v0.1.0

Investigative multi-agent infrastructure by Artixcore.

Usage:
  ants --help       Show this help message
  ants --version    Print the current version

The investigation engine is not implemented in Phase 1. Follow the roadmap at:
https://github.com/Artixcore/ants/blob/master/ROADMAP.md
`;

function run(argv = process.argv.slice(2)) {
  const project = getProjectInfo();

  if (argv.includes('--version') || argv.includes('-v')) {
    console.log(project.version);
    return 0;
  }

  console.log(HELP.trimEnd());
  return 0;
}

process.exitCode = run();
