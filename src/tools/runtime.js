export function normalizeRuntimeArtifact(path, content) {
  try {
    const parsed = JSON.parse(content);
    return { path, validJson: true, data: parsed };
  } catch {
    return { path, validJson: false, data: { raw: content.slice(0, 10000) } };
  }
}
