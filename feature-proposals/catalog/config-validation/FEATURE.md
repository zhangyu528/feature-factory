# config-validation - Implement Configuration Schema Validation

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: High
- source_refs: README.md, lib/config.js

## Rationale

Prevent runtime errors caused by missing keys, invalid types, or malformed values in `feature-factory.config.json` before the pipeline execution begins.

## Acceptance Criteria

- [ ] Integrate a validation library (e.g., Joi or Zod) into `lib/config.js`.
- [ ] Define a schema covering all supported keys (`FEATURE_AGENT_ENGINE`, `FEATURE_LLM_MODEL`, API keys, etc.).
- [ ] Throw a descriptive error and exit if the config file fails validation on startup.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
