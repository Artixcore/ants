export const PROJECT_NAME = 'Ants';
export const PROJECT_VERSION = '0.2.0';

export function getProjectInfo() {
  return Object.freeze({
    name: PROJECT_NAME,
    version: PROJECT_VERSION,
    organization: 'Artixcore',
    status: 'architecture-specified',
    autonomy: 'read-only-by-default',
    currentPhase: 2,
    nextPhase: 'local-incident-investigation-mvp'
  });
}
