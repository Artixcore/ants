export const PROJECT_NAME = 'Ants';
export const PROJECT_VERSION = '0.3.0';

export { investigateLocal } from './controller.js';
export { loadMission, validateMission } from './core/mission.js';
export { createDemoWorkspace } from './demo/create-demo-workspace.js';

export function getProjectInfo() {
  return Object.freeze({
    name: PROJECT_NAME,
    version: PROJECT_VERSION,
    organization: 'Artixcore',
    status: 'local-investigation-mvp',
    autonomy: 'read-only-by-default',
    currentPhase: 3,
    nextPhase: 'repository-and-ci-integrations'
  });
}
