# semantic-dedupe - Implement semantic duplicate detection in registry

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: medium
- source_refs: lib/registry.js, generate-proposal.js

## Rationale

The current system uses exact featureId matching for deduplication. Semantic analysis or title similarity would prevent redundant proposals when IDs differ but content is similar.

## Acceptance Criteria

- [ ] Modify upsertFeatureItems to check for similar titles using a string similarity metric.
- [ ] Add a similarity threshold configuration to the registry settings.
- [ ] Include unit tests for detecting overlapping feature proposals.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
