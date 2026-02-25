# feature-factory

Node.js automation toolkit for feature proposal workflow orchestration.

## Project Structure

- Root entry script:
  - `src/pipeline-run.js`
- Workflow implementation scripts in `src/`:
  - `src/pipeline-generate-proposal.js`
  - `src/pipeline-create-proposal-issues.js`
  - `src/pipeline-sync-proposal-issue-approvals.js`
  - `src/pipeline-create-dev-branches-from-approved.js`
  - `src/pipeline-run-engine.js`
  - `src/pipeline-run.js`
- Shared modules in `src/lib/`:
  - `config.js`
  - `prompt-utils.js`
  - `llm-client.js`
  - `git.js`
  - `github.js`
  - `registry.js`
  - `fs-utils.js`
- Prompt templates in `engines/`.

## Commands

- `node src/pipeline-run.js propose`: phase 1 only (generate proposals + create issues).
- `node src/pipeline-run.js sync`: phase 2 only (sync issue labels + create dev branches + create dev tracking issues).
- `node src/pipeline-generate-proposal.js`: proposal generation only.
- `node src/pipeline-run-engine.js <glm|deepseek|openai> <input.json> <output.json>`: low-level model runner.

## Proposal Approval on GitHub

- Each proposal is created as a GitHub Issue.
- Add label `approved` to approve a proposal.
- Add label `rejected` to reject a proposal.
- Rejected proposals are auto-closed by sync.
- For each approved proposal, sync creates a `dev/*` branch and an additional `[Dev] ...` tracking issue.
- If a dev tracking issue already exists for that feature, proposal issue is auto-closed.

## Environment Variables (Required)

- `FEATURE_AGENT_ENGINE` (required; supported: `glm`, `deepseek`, `openai`)
- `FEATURE_LLM_MODEL`: model name (for example `glm-4.7`)
- `FEATURE_LLM_API_KEY`
- `FEATURE_LLM_BASE_URL`
- `FEATURE_LLM_TIMEOUT_MS` (optional; default: `60000`)
- `FEATURE_LLM_TEMPERATURE` (optional; default: `0.2`)
- `FEATURE_CONTEXT_MAX_FILES` (optional; default: `120`)
- `FEATURE_CONTEXT_MAX_SNIPPET_FILES` (optional; default: `8`)
- `FEATURE_CONTEXT_MAX_SNIPPET_CHARS` (optional; default: `1500`)

## Notifications (Optional)

Configure these variables to enable notifications after proposals are generated:

- `FEATURE_NOTIFY_FEISHU_WEBHOOK`: Webhook URL for Feishu/Lark custom bot.
- `FEATURE_NOTIFY_WECHAT_WEBHOOK`: Webhook URL for WeChat Work group bot.

## Usage as GitHub Action

You can use `feature-factory` directly in your GitHub Actions workflow. This is the recommended way to use it as it handles environment setup and dependency installation for you.

### Example Workflow

Create `.github/workflows/feature-factory.yml`:

```yaml
name: Feature Factory

on:
  workflow_dispatch: # Allow manual trigger
  schedule:
    - cron: '0 0 * * *' # Run daily at midnight

jobs:
  propose:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Generate Feature Proposals
        uses: zhangyu528/feature-factory@v1
        with:
          engine: 'glm'
          llm_api_key: ${{ secrets.FEATURE_LLM_API_KEY }}
          wechat_webhook: ${{ secrets.FEATURE_NOTIFY_WECHAT_WEBHOOK }}
```

## Prerequisites

- `node`
- `git`
- `GITHUB_TOKEN` in workflow environment (for GitHub issue/branch automation)


If any required variable is missing, the pipeline fails fast with an error message.



