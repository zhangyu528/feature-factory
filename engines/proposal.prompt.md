# Feature Proposal Prompt

Generate implementation-oriented feature proposals strictly from the current Git repository context.

Input JSON contains:
- repositoryRoot
- branch
- trackedFiles
- trackedFilesTotal
- fileSnippets

Output JSON only:
- features[]
  - featureId
  - title
  - sourceRefs[]
  - rationale
  - priority
  - acceptanceCriteria[]

Constraints:
- Infer opportunities from existing code and file layout.
- Prefer actionable, testable features.
- Avoid duplicates.
- Keep each feature concise and implementation-facing.
- Return exactly one JSON object and include only the `features` top-level field.
