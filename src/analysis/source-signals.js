const SIGNALS = [
  {
    id: 'full-file-buffer',
    severity: 'high',
    pattern: /\b(?:readFileSync|readFile)\s*\(/g,
    rationale: 'Reads a complete file into memory.'
  },
  {
    id: 'buffer-copy',
    severity: 'high',
    pattern: /\bBuffer\.(?:from|alloc|concat)\s*\(/g,
    rationale: 'Allocates or copies Buffer data.'
  },
  {
    id: 'retained-buffer',
    severity: 'high',
    pattern: /\b(?:cache|buffers?|uploads?|items?)\s*\.\s*push\s*\(/gi,
    rationale: 'Adds values to a long-lived collection that may grow without a bound.'
  },
  {
    id: 'listener-without-limit',
    severity: 'medium',
    pattern: /\.on\s*\([^)]*(?:data|message)[^)]*\)/g,
    rationale: 'Consumes streamed events and requires explicit backpressure or bounds.'
  },
  {
    id: 'process-exit',
    severity: 'medium',
    pattern: /\bprocess\.exit\s*\(/g,
    rationale: 'Terminates the process directly.'
  }
];

export function analyzeSource(path, content, { maxFindings = 100 } = {}) {
  const findings = [];

  for (const signal of SIGNALS) {
    for (const match of content.matchAll(signal.pattern)) {
      const location = offsetToLine(content, match.index ?? 0);
      findings.push({
        signal: signal.id,
        severity: signal.severity,
        line: location.line,
        excerpt: lineAt(content, location.line).slice(0, 1000),
        rationale: signal.rationale
      });
      if (findings.length >= maxFindings) break;
    }
    signal.pattern.lastIndex = 0;
    if (findings.length >= maxFindings) break;
  }

  return { path, findings };
}

function offsetToLine(content, offset) {
  return { line: content.slice(0, offset).split('\n').length };
}

function lineAt(content, lineNumber) {
  return content.split(/\r?\n/)[lineNumber - 1] ?? '';
}
