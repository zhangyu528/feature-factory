# Repository Guidelines

## Project Structure & Module Organization
This repository is a Node.js automation toolkit for feature proposal workflow orchestration.

- Root entry script: `pipeline-run.js`
- Workflow scripts: `scripts/pipeline-generate-proposal.js`, `scripts/pipeline-create-proposal-issues.js`, `scripts/pipeline-sync-proposal-issue-approvals.js`, `scripts/pipeline-create-dev-branches-from-approved.js`, `scripts/pipeline-run-engine.js`, `scripts/pipeline-run.js`
- Shared utilities: `lib/` (`git.js`, `github.js`, `prompt-utils.js`, `llm-client.js`, `config.js`, `registry.js`, `fs-utils.js`)
- Engine prompt templates: `engines/proposal.prompt.md`
- Generated state and outputs are written outside this folder via `lib/registry.js` path resolution (for example under `feature-proposals/` at project root).

Keep new workflow steps in `scripts/` and place reusable logic in `lib/`.

## Build, Test, and Development Commands
No package runner is defined here; run scripts directly with Node.js:

- `node pipeline-run.js propose`: phase 1 only (generate proposals, create proposal issues).
- `node pipeline-run.js sync`: phase 2 only (sync proposal issue approval state, create dev branches).
- `node scripts/pipeline-generate-proposal.js`: generates feature proposals from repository context.
- `node scripts/pipeline-create-proposal-issues.js`: creates GitHub issues for proposal approval.
- `node scripts/pipeline-sync-proposal-issue-approvals.js`: syncs approval state from issue labels and closes resolved issues.
- `node scripts/pipeline-create-dev-branches-from-approved.js`: creates `dev/*` branches from approved proposals.

Prerequisites: `node`, `git`, `gh`, and configured LLM API credentials.

## Coding Style & Naming Conventions
- Language: CommonJS JavaScript (`require`, `module.exports`).
- Formatting: 2-space indentation, semicolons, double quotes.
- Naming: `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants, kebab-case filenames.
- Branch pattern: `dev/<featureId>-<slug>`.

## Testing Guidelines
There is currently no dedicated test framework in this folder. For changes:

- Run the smallest affected script directly (example: `node scripts/pipeline-run-engine.js glm input.json output.json`).
- Validate JSON outputs and automation behavior.
- If adding tests, place them in `tests/` and use `*.test.js` naming.

## Commit & Pull Request Guidelines
Follow the conventions already used by automation:

- `docs(feature): proposal <FEATURE_ID>`
- `chore(feature): init dev branch for <FEATURE_ID>`

Use imperative, scoped commit messages (`type(scope): summary`). PRs should include:

- Purpose and impacted script/module list
- Any required config/env keys (for example `FEATURE_AGENT_ENGINE`, `GLM_API_KEY`, `FEATURE_LLM_MODEL`)
- Sample command used to validate behavior