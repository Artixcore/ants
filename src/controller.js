import { loadMission, validateMission } from './core/mission.js';
import { BudgetTracker } from './core/budget.js';
import { TaskScheduler } from './core/task-scheduler.js';
import { serializeError } from './core/safe-error.js';
import { PathPolicy } from './security/path-policy.js';
import { prepareOutputDirectory } from './security/output-policy.js';
import { FilesystemTool } from './tools/filesystem.js';
import { GitTool } from './tools/git.js';
import { ToolGateway } from './tools/tool-gateway.js';
import { EvidenceStore } from './store/evidence-store.js';
import { InvestigationGraph } from './store/graph-store.js';
import { runScout } from './agents/scout.js';
import { runInvestigator } from './agents/investigator.js';
import { runValidator } from './agents/validator.js';
import { runReporter } from './agents/reporter.js';

export async function investigateLocal(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('investigateLocal options must be an object.');
  }

  const clock = options.clock ?? (() => new Date().toISOString());
  const nowMs = options.nowMs ?? (() => Date.now());
  const loaded = options.mission
    ? { mission: validateMission(options.mission), filePath: null }
    : await loadMission(options.missionPath);
  const mission = loaded.mission;
  const policy = new PathPolicy({
    workspaceRoot: options.workspaceRoot ?? process.cwd(),
    include: mission.scope.include,
    exclude: mission.scope.exclude
  });
  const outputDir = await prepareOutputDirectory({
    workspaceRoot: policy.workspaceRoot,
    requestedOutput: options.outputDir,
    missionId: mission.missionId
  });
  const budget = new BudgetTracker(mission.budgets, { now: nowMs });
  const filesystem = new FilesystemTool({ policy, budget });
  const git = new GitTool({ workspaceRoot: policy.workspaceRoot, budget });
  const gateway = new ToolGateway({ mission, budget, filesystem, git, clock });
  const evidenceStore = new EvidenceStore({ missionId: mission.missionId, clock });
  const graph = new InvestigationGraph({ missionId: mission.missionId });
  const scheduler = new TaskScheduler({ missionId: mission.missionId, budget, clock });

  let hypotheses = [];
  let forcedStatus = null;
  const executionErrors = [];

  try {
    const scout = await scheduler.run('scout', 'Collect local logs, runtime metadata, source signals, and Git history.', (context) =>
      runScout({ context, gateway, evidenceStore, graph })
    );

    if (scout.secretDetected && mission.stopConditions.pauseOnSecretDetection) {
      forcedStatus = 'paused';
    } else {
      const investigated = await scheduler.run('investigator', 'Generate ranked, testable root-cause hypotheses.', (context) =>
        runInvestigator({ context, mission, evidenceStore, graph, clock })
      );
      hypotheses = investigated.hypotheses;

      const validated = await scheduler.run('validator', 'Challenge hypotheses using independent evidence groups.', (context) =>
        runValidator({ context, mission, hypotheses, evidenceStore, graph, clock })
      );
      hypotheses = validated.hypotheses;
    }
  } catch (error) {
    forcedStatus = 'partial';
    executionErrors.push(serializeError(error));
  }

  const reported = await scheduler.run(
    'reporter',
    'Persist evidence, graph, audit trail, and human-readable reports.',
    (context) => runReporter({
      context,
      mission,
      hypotheses,
      evidenceStore,
      graph,
      scheduler,
      gateway,
      budget,
      outputDir,
      clock,
      forcedStatus,
      executionErrors
    }),
    { budgetExempt: true }
  );

  return reported.report;
}
