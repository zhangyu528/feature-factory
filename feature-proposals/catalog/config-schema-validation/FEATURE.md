# config-schema-validation - Implement JSON Schema Validation for Configuration

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: High
- source_refs: README.md (Configuration File section), lib/config.js

## Rationale

The project relies on `feature-factory.config.json` for critical runtime values (API keys, models). Without validation, missing keys or invalid types cause unclear runtime errors during LLM or Git operations.

## Acceptance Criteria

- [ ] Define a JSON Schema covering supported keys (FEATURE_AGENT_ENGINE, GLM_API_KEY, etc.)
- [ ] Integrate schema validation within `lib/config.js` upon loading
- [ ] Provide clear console error messages identifying specific validation failures
- [ ] Fail process startup immediately if config is invalid

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
