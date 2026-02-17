# git-informed-context - Dynamic snippet selection based on recent git activity

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: high
- source_refs: generate-proposal.js

## Rationale

Prioritizing files that have changed recently provides the LLM with context on active development areas, leading to more relevant and timely proposals.

## Acceptance Criteria

- [ ] Implement a 'git log' parser to identify recently modified files.
- [ ] Incorporate recently changed files into the chooseSnippetFiles logic.
- [ ] Apply a weighting system to snippets based on commit frequency and recency.

## Approval

- This proposal branch is approval-only.
- After PR approval and closure, a dev branch will be created from main.
