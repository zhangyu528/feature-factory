# dry-run-mode - Implement Global Dry-Run Mode

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: Medium
- source_refs: pipeline-run.js, lib/git.js, lib/github.js

## Rationale

Users need a way to validate the pipeline logic and view generated proposals without creating actual Git branches or modifying the remote GitHub repository.

## Acceptance Criteria

- [ ] Add a `--dry-run` flag to the root `pipeline-run.js` entry point.
- [ ] Pass the dry-run state to `lib/git.js` and `lib/github.js` modules.
- [ ] In dry-run mode, log intended side effects (branch creation, PR comments) instead of executing them.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
