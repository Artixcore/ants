const SIGNALS = [
  { id: 'node-heap-oom', severity: 'critical', pattern: /heap out of memory|reached heap limit|allocation failed.*javascript heap/i },
  { id: 'memory-pressure', severity: 'high', pattern: /(?:heapUsed|rss|memory)[=: ]+(\d+(?:\.\d+)?)\s*(?:MB|MiB)/i },
  { id: 'address-in-use', severity: 'high', pattern: /EADDRINUSE|address already in use/i },
  { id: 'disk-full', severity: 'high', pattern: /ENOSPC|no space left on device/i },
  { id: 'permission-denied', severity: 'high', pattern: /EACCES|permission denied/i },
  { id: 'module-not-found', severity: 'high', pattern: /MODULE_NOT_FOUND|cannot find module/i },
  { id: 'unhandled-error', severity: 'high', pattern: /uncaught exception|unhandled rejection|unhandledRejection/i },
  { id: 'fatal', severity: 'critical', pattern: /\bFATAL\b|SIGABRT|SIGSEGV|OOMKilled/i },
  { id: 'error', severity: 'medium', pattern: /\bERROR\b|\bError:/ }
];

export function analyzeLog(path, content, { maxMatches = 200 } = {}) {
  const matches = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length && matches.length < maxMatches; index += 1) {
    const line = lines[index];
    for (const signal of SIGNALS) {
      if (signal.pattern.test(line)) {
        matches.push({
          signal: signal.id,
          severity: signal.severity,
          line: index + 1,
          excerpt: line.slice(0, 1000)
        });
      }
      signal.pattern.lastIndex = 0;
    }
  }

  return {
    path,
    lineCount: lines.length,
    matches,
    criticalCount: matches.filter((item) => item.severity === 'critical').length
  };
}
