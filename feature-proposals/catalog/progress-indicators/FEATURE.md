# progress-indicators - Add CLI Progress Indicators for Long Operations

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: Low
- source_refs: scripts/pipeline-generate-proposal.js, lib/prompt-utils.js

## Rationale

LLM proposal generation can take significant time. Providing visual feedback improves user experience and confirms the process has not hung.

## Acceptance Criteria

- [ ] Integrate a CLI progress bar library (e.g., `cli-progress`).
- [ ] Attach progress indicators to the `pipeline-run-engine.js` execution step.
- [ ] Display current status text (e.g., 'Generating proposal...', 'Waiting for API response...').

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
