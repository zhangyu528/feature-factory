# registry-persistence - Persist Feature Registry to Local Storage

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: Medium
- source_refs: lib/registry.js

## Rationale

To track proposal status across different pipeline runs (e.g., from generation to approval), the `registry.js` module must persist state to disk rather than relying on volatile memory.

## Acceptance Criteria

- [ ] Implement `load()` and `save()` methods in `lib/registry.js` using `fs-utils.js`.
- [ ] Store registry data in a local JSON file (e.g., `.feature-factory-registry.json`).
- [ ] Ensure atomic writes to prevent data corruption if the process terminates unexpectedly.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
