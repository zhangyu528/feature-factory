# centralized-config - Replace environment variables with a centralized config file

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: medium
- source_refs: run-engine.js, generate-proposal.js, lib/engine-cli.js

## Rationale

Managing engine commands and arguments via numerous environment variables is error-prone. A JSON or YAML config file improves usability and reproducibility.

## Acceptance Criteria

- [ ] Implement support for a 'factory.config.json' file.
- [ ] Ensure environment variables can still override specific config values.
- [ ] Update engine runners to load parameters from the centralized configuration.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
