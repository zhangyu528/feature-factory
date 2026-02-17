# feat-dry-run-mode - Implement Global Dry-Run Mode

- base_branch: main
- base_sha: e1dab757667da26e73bb3fa45a03dd98f25c582a
- priority: High
- source_refs: README.md

## Rationale

The toolkit orchestrates destructive Git and GitHub operations (branch creation, status syncing). A safety mechanism is required to validate workflow logic without affecting the repository state.

## Acceptance Criteria

- [ ] Add a `--dry-run` flag argument to `pipeline-run.js`.
- [ ] Modify `lib/git.js` and `lib/github.js` to check the dry-run flag.
- [ ] When enabled, modules must log intended actions instead of executing them.
- [ ] Ensure dry-run status is passed to all child scripts in `scripts/`.

## Approval

- This proposal is approved via GitHub Issue labels.
- Add label `approved` to approve, `rejected` to reject.
