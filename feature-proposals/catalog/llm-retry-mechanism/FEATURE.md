# llm-retry-mechanism - Add Exponential Backoff Retry for LLM Client

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: High
- source_refs: lib/llm-client.js, scripts/pipeline-run-engine.js

## Rationale

External API calls to `glm`, `deepseek`, or `openai` are prone to transient network failures or rate limits, which can abort the proposal generation workflow prematurely.

## Acceptance Criteria

- [ ] Wrap the API call logic in `lib/llm-client.js` with a retry wrapper.
- [ ] Implement exponential backoff delay (e.g., 1s, 2s, 4s) between attempts.
- [ ] Make the maximum number of retry attempts configurable via `feature-factory.config.json`.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
