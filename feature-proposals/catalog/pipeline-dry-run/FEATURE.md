# pipeline-dry-run - Add Dry Run Mode to Pipeline Execution

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: Medium
- source_refs: README.md (Commands section), lib/git.js, lib/github.js

## Rationale

Users need to verify the logic of proposal generation and branch naming conventions without altering the Git repository state or consuming LLM API quotas during development or testing.

## Acceptance Criteria

- [ ] Add a `--dry-run` flag argument to `pipeline-run.js`
- [ ] Pass dry-run state to `lib/git.js` and `lib/github.js` to skip actual system calls
- [ ] Output intended operations (e.g., 'Would create branch: feature/x') to standard output
- [ ] Ensure LLM client calls are skipped or mocked when dry run is active

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
