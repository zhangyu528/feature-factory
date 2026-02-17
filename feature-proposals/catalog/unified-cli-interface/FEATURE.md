# unified-cli-interface - Refactor Entry Points into Unified CLI

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: Medium
- source_refs: README.md (Commands section), pipeline-run.js

## Rationale

The current structure requires running specific scripts directly (e.g., `node scripts/pipeline-generate-proposal.js`). A unified CLI improves user experience via standardized argument parsing and help text.

## Acceptance Criteria

- [ ] Introduce a CLI framework (e.g., `commander` or `yargs`) to `pipeline-run.js`
- [ ] Map existing scripts (`generate-proposal`, `create-branches`, etc.) to subcommands
- [ ] Standardize global options (config file path, verbosity) across subcommands
- [ ] Update README documentation to reflect the new CLI usage patterns

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
