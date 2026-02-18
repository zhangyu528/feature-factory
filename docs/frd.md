# Feature Factory FRD

## 1. Purpose
This document defines the functional requirements, scope, runtime constraints, and acceptance criteria for `feature-factory`.

Current product shape:
- Node.js CLI tool (entry: `feature-factory.js`)
- Executed by GitHub workflows
- Uses GitHub API / Git Data API for issues, labels, branches, and file commits

## 2. Goals and Scope
### 2.1 Goals
- Automatically discover and generate feature proposals.
- Manage proposal approval via GitHub issue labels.
- Automatically initialize dev branches and dev tracking issues for approved proposals.

### 2.2 In Scope
- `propose` phase: generate proposals and create proposal issues.
- `sync` phase: sync approval state, close rejected proposals, create dev branches and `[Dev]` issues.
- Publish flow: publish npm package to GitHub Packages on release events.

### 2.3 Out of Scope
- Auto implementation of business code.
- Auto merge of PRs.
- Cross-repo orchestration and multi-tenant platform features.

## 3. Terms
- Proposal Issue: `[Proposal] <FEATURE_ID> <TITLE>`
- Dev Issue: `[Dev] <FEATURE_ID> <TITLE>`
- Registry: `feature-proposals/state/registry.json`
- Latest: `feature-proposals/LATEST.json`

## 4. Runtime Prerequisites
- Runtime: `node`
- Execution context: GitHub Actions (workflow mode)
- Credentials: `GITHUB_TOKEN` and required LLM key
- Branch guard: propose/sync jobs run on `main` only

## 5. User Flow
### 5.1 Propose
1. Trigger `Feature Proposals - Propose` workflow.
2. Collect repository context and generate `features[]`.
3. Persist run artifacts and state files.
4. Create/reuse proposal issues.

### 5.2 Sync
1. Trigger `Feature Proposals - Sync` workflow.
2. Sync by labels:
- `approved`: go to dev initialization.
- `rejected`: auto close proposal issue.
- otherwise: keep pending.
3. For approved proposals, create/reuse `dev/*`, write `FEATURE.md`, create/reuse `[Dev]` issue.

## 6. Functional Requirements
### FR-01 Proposal Generation
- Must generate structured proposals from `main` baseline.
- Each feature must include: `featureId`, `title`, `sourceRefs`, `rationale`, `priority`, `acceptanceCriteria`.

### FR-02 State Persistence
- Must maintain run artifacts, `LATEST.json`, and `registry.json` for traceability and idempotency.

### FR-03 Proposal Issue Management
- Must ensure labels exist: `feature-proposal`, `pending-review`, `approved`, `rejected`.
- Must not create duplicate open proposal issues for the same feature.

### FR-04 Approval Sync
- Rejected proposals must be closed automatically.
- Approved proposals must enter dev initialization flow.

### FR-05 Dev Initialization
- Must create/reuse `dev/<featureId>-<slug>` for approved proposals.
- Must commit `docs/feature-proposals/<featureId>/FEATURE.md` to the dev branch.
- Must create/reuse `[Dev]` issue.

### FR-06 Package Publishing
- Must support publish to GitHub Packages on `release.published` event.

## 7. Non-Functional Requirements
- Idempotent: repeat runs do not duplicate existing resources.
- Traceable: every run has observable artifacts and state updates.
- Resilient: single-issue failure should not stop whole batch (best effort).
- Secure: tokens/keys are provided by secrets, not committed.

## 8. Acceptance Criteria
- AC-01: `propose` creates run artifacts and proposal issues.
- AC-02: `sync` handles `approved/rejected/pending` correctly.
- AC-03: approved proposal produces dev branch, FEATURE.md, and `[Dev]` issue.
- AC-04: rejected proposal is auto-closed.
- AC-05: publish workflow runs on release published and can execute `npm publish` to GitHub Packages.
