#!/usr/bin/env node

import { getProjectInfo } from './index.js';

const HELP = `Ants v0.2.0

Evidence-driven multi-agent investigation architecture by Artixcore.

Usage:
  ants --help       Show this help message
  ants --version    Print the current version

Phase 2 architecture specifications and machine-readable contracts are complete.
The local investigation engine is planned for Phase 3.

Architecture:
https://github.com/Artixcore/ants/blob/master/docs/architecture.md

Roadmap:
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
