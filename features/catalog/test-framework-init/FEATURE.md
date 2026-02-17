# test-framework-init - Initialize a dedicated test framework

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: high
- source_refs: AGENTS.md, package.json

## Rationale

The project currently lacks a dedicated test framework. Adding one (e.g., Jest) will allow for automated verification of utility logic and engine integration.

## Acceptance Criteria

- [ ] Install Jest and configure it for the project.
- [ ] Add initial unit tests for lib/fs-utils.js and lib/registry.js.
- [ ] Add a 'test' script to package.json.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
