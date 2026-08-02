const RULES = [
  { category: 'private-key', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { category: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { category: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
  { category: 'generic-secret', pattern: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^\s"']{8,}["']?/gi },
  { category: 'bearer-token', pattern: /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi }
];

export function redactSecrets(input) {
  let text = String(input);
  const categories = new Set();
  let removedCount = 0;

  for (const rule of RULES) {
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
