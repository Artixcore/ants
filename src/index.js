export const PROJECT_NAME = 'Ants';
export const PROJECT_VERSION = '0.1.0';

export function getProjectInfo() {
  return Object.freeze({
    name: PROJECT_NAME,
    version: PROJECT_VERSION,
    organization: 'Artixcore',
    status: 'foundation',
    autonomy: 'read-only-by-default'
  });
}
