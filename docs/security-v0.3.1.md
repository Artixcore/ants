# Security Review: v0.3.1

Date: 2026-08-03

Scope: Phase 3 local incident-investigation runtime, CLI, filesystem and Git tools, mission validation, report persistence, error handling, and public repository policies.

## Fixed findings

| Severity | Area | Finding | Resolution |
| --- | --- | --- | --- |
| High | Filesystem | Oversized files were read fully before truncation, allowing local memory exhaustion. | Reads now allocate and read only the permitted prefix. |
| High | Git | Repository diff drivers or text-conversion filters could execute during Git diff analysis. | External diff and textconv are disabled, configuration is isolated, and the environment is reduced. |
| High | Output | A caller could select an arbitrary report path and overwrite unrelated files. | Output is restricted to `<workspace>/.ants/`, symlink components are denied, and writes are atomic. |
| Medium | Validation | Malformed or oversized mission files could trigger incidental errors or excessive allocation. | Mission files are bounded, symlink paths are rejected, and nested values receive strict structural, type, range, date, path, and unknown-field checks. |
| Medium | Authorization | Tool permission scope was not applied to file reads and inventory output. | Tool Gateway permission scopes are now enforced and denied calls are audited. |
| Medium | Secrets | Collection stopped on secrets even when pause was disabled, while Git redaction metadata was discarded. | Pause behavior now follows policy and Git redaction metadata is preserved. |
| Medium | Reliability | Duration exhaustion could block the Reporter and lose the partial audit record. | Reporter runs as a safety-critical budget-exempt task without investigation-tool access. |
| Low | Errors | Raw control characters and insufficiently normalized errors could reach terminal or reports. | Safe error serialization, redaction, length bounds, and control stripping were added. |
| Low | Demo | An explicit demo parent could reuse an existing service path. | Demo workspaces are always unique temporary directories. |

## Verification

Regression tests cover:

- malformed, oversized, and symlinked mission files;
- unsafe relative patterns and absolute paths;
- bounded reads of oversized files;
- binary input handling;
- output traversal and symlink rejection;
- permission-scope enforcement;
- reporting after normal budget expiry;
- secret continuation under explicit policy;
- cyclic stable-hash input;
- terminal and secret sanitization;
- malicious Git textconv and external diff configuration.

## Residual risks

- Git still runs as a local subprocess and is not contained by cgroups, seccomp, or a virtual machine.
- Pattern-based secret detection is incomplete.
- The deterministic analyzers can misclassify evidence.
- Running Ants with administrator or root privileges increases impact if a future flaw exists.
- CI actions use maintained major-version tags rather than immutable commit pins.

Use an unprivileged account and disposable evidence copy for hostile repositories.
