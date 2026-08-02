const RULES = [
  { category: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { category: 'aws-access-key', pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { category: 'github-token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { category: 'gitlab-token', pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/g },
  { category: 'npm-token', pattern: /\bnpm_[A-Za-z0-9]{30,}\b/g },
  { category: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { category: 'stripe-key', pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { category: 'jwt', pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { category: 'generic-secret', pattern: /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|secret|token|password|passwd|pwd)\s*[:=]\s*["']?[^\s"']{8,}["']?/gi },
  { category: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+\/-]{8,}=*/gi }
];

export function sanitizeText(input, { preserveNul = false } = {}) {
  const text = String(input).replace(/\u001B\[[0-?]*[ -\/]*[@-~]/g, '');
  return preserveNul
    ? text.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function redactSecrets(input, options = {}) {
  let text = sanitizeText(input, options);
  const categories = new Set();
  let removedCount = 0;

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    text = text.replace(rule.pattern, () => {
      categories.add(rule.category);
      removedCount += 1;
      return `[REDACTED:${rule.category}]`;
    });
  }

  return {
    value: text,
    secretDetected: removedCount > 0,
    redaction: {
      applied: removedCount > 0,
      categories: [...categories].sort(),
      removedCount
    }
  };
}
