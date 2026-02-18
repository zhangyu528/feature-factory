# Feature Factory Architecture

## 1. Overview
`feature-factory` is a Node.js CLI automation toolkit.

Execution chain:
`feature-factory.js` -> `src/pipeline-run.js` -> phase modules

Phases:
- `propose`: `src/pipeline-generate-proposal.js` + `src/pipeline-create-proposal-issues.js`
- `sync`: `src/pipeline-sync-proposal-issue-approvals.js` + `src/pipeline-create-dev-branches-from-approved.js`

## 2. Directory Layout
- `feature-factory.js`: root CLI entry.
- `src/`: orchestration and phase implementations.
- `src/lib/`: shared modules (git/github/config/llm/registry/fs/prompt).
- `engines/`: prompt templates.
- `.github/workflows/`: propose/sync/publish workflows.
- `feature-proposals/`: run artifacts and state, resolved by `src/lib/registry.js`.

## 3. Module Design
### 3.1 Orchestration
- `src/pipeline-run.js`
- `normalizeMode`: normalize `propose|sync`.
- `runByMode`: direct module calls, no script child-process chain.

### 3.2 Propose Subsystem
- `src/pipeline-generate-proposal.js`
- Reads repository tree/snippets through GitHub API.
- Calls `runEngine` from `src/pipeline-run-engine.js`.
- Writes run artifacts and updates latest/registry.

- `src/pipeline-create-proposal-issues.js`
- Creates/reuses proposal issues.
- Updates proposal issue metadata/state.

### 3.3 Sync Subsystem
- `src/pipeline-sync-proposal-issue-approvals.js`
- Syncs labels and closes rejected proposals.

- `src/pipeline-create-dev-branches-from-approved.js`
- Creates/reuses dev branches for approved proposals.
- Commits `FEATURE.md` via Git Data API.
- Creates/reuses `[Dev]` tracking issues.

### 3.4 Shared Layer
- `src/lib/github-api.js`: Octokit context, token and repo resolution.
- `src/lib/github.js`: issue/label operations.
- `src/lib/git.js`: Git Data API wrappers (ref/blob/tree/commit).
- `src/lib/llm-client.js`: provider adapters.
- `src/lib/prompt-utils.js`: prompt build and output validation.
- `src/lib/config.js`: config loading.
- `src/lib/registry.js`: state paths and registry operations.
- `src/lib/fs-utils.js`: fs helpers.

## 4. Data Flow
### 4.1 Propose
1. Entry command: `node feature-factory.js propose`
2. Read repo context -> call LLM -> generate features
3. Persist:
- `feature-proposals/runs/<date>/<time>/agent_input.json`
- `feature-proposals/runs/<date>/<time>/agent_output.json`
- `feature-proposals/runs/<date>/<time>/features.json`
- `feature-proposals/runs/<date>/<time>/FEATURE_SUMMARY.md`
- `feature-proposals/LATEST.json`
- `feature-proposals/state/registry.json`
4. Create/reuse proposal issues

### 4.2 Sync
1. Entry command: `node feature-factory.js sync`
2. Read proposal issue labels
3. `approved` -> create dev branch + FEATURE.md + dev issue
4. `rejected` -> close proposal issue

## 5. Publish Architecture
- Workflow: `.github/workflows/publish.yml`
- Trigger: `release.published`
- Target registry: `https://npm.pkg.github.com`
- Auth: `${{ secrets.GITHUB_TOKEN }}` with `packages: write`

## 6. Key Constraints
- Workflow token: `GITHUB_TOKEN`
- LLM config: `FEATURE_AGENT_ENGINE`, `FEATURE_LLM_MODEL`, `FEATURE_LLM_BASE_URL`, `FEATURE_LLM_API_KEY`.
- Propose/sync workflows are guarded to run on `main`.
- CLI command is exposed via `bin` in `package.json`.

## 7. Design Tradeoffs
- API-first approach replaces `gh/git` CLI dependencies.
- Module orchestration replaces script child-process orchestration for maintainability.
- File-based state is preserved for now, with a clear path to DB migration later.


