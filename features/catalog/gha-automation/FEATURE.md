# gha-automation - Automate feature discovery with GitHub Actions

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: high
- source_refs: run-pipeline.js, README.md

## Rationale

Running the discovery pipeline manually is inefficient. A scheduled GitHub Actions workflow ensures continuous feature identification and proposal generation.

## Acceptance Criteria

- [ ] Create a .github/workflows/feature-discovery.yml workflow file.
- [ ] Configure necessary secrets for GitHub tokens and engine API keys.
- [ ] Enable scheduled and manual (workflow_dispatch) triggers.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
