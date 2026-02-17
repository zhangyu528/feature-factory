# feature-factory

Node.js automation toolkit for feature proposal workflow orchestration.

## Project Structure

- Root entry script:
  - `pipeline-run.js`
- Workflow implementation scripts in `scripts/`:
  - `scripts/pipeline-generate-proposal.js`
  - `scripts/pipeline-create-proposal-issues.js`
  - `scripts/pipeline-sync-proposal-issue-approvals.js`
  - `scripts/pipeline-create-dev-branches-from-approved.js`
  - `scripts/pipeline-run-engine.js`
  - `scripts/pipeline-run.js`
- Shared modules in `lib/`:
  - `config.js`
  - `prompt-utils.js`
  - `llm-client.js`
  - `git.js`
  - `github.js`
  - `registry.js`
  - `fs-utils.js`
- Prompt templates in `engines/`.
- Runtime config files at repo root (`feature-factory.config.json`, `feature-factory.config.example.json`).

## Commands

- `node pipeline-run.js propose`: phase 1 only (generate proposals + create issues).
- `node pipeline-run.js sync`: phase 2 only (sync issue labels + create dev branches + create dev tracking issues).
- `node scripts/pipeline-generate-proposal.js`: proposal generation only.
- `node scripts/pipeline-run-engine.js <glm|deepseek|openai> <input.json> <output.json>`: low-level model runner.

## Proposal Approval on GitHub

- Each proposal is created as a GitHub Issue.
- Add label `approved` to approve a proposal.
- Add label `rejected` to reject a proposal.
- Rejected proposals are auto-closed by sync.
- For each approved proposal, sync creates a `dev/*` branch and an additional `[Dev] ...` tracking issue.
- If a dev tracking issue already exists for that feature, proposal issue is auto-closed.

## Configuration File (Recommended)

Create `feature-factory.config.json` in repo root. You can copy `feature-factory.config.example.json`.

Supported keys (same names as env vars):

- `FEATURE_AGENT_ENGINE`: default `glm` (provider only; supported: `glm`, `deepseek`, `openai`)
- `FEATURE_LLM_MODEL`: set the model name (for example `glm-4.7`)
- `GLM_API_KEY` (or `LLM_API_KEY` / `OPENAI_API_KEY`)
- `FEATURE_LLM_BASE_URL`
- `FEATURE_LLM_TIMEOUT_MS`
- `FEATURE_LLM_TEMPERATURE`
- `FEATURE_CONTEXT_MAX_FILES`
- `FEATURE_CONTEXT_MAX_SNIPPET_FILES`
- `FEATURE_CONTEXT_MAX_SNIPPET_CHARS`

You can also put these under an `env` object in the JSON file.

## Environment Variables (Optional)

Environment variables still work and override config-file values.

## Prerequisites

- `node`
- `git`
- `gh` (for GitHub issue/branch automation)