"use strict";

const { main: runGenerateProposal } = require("./pipeline-generate-proposal");
const { main: runCreateProposalIssues } = require("./pipeline-create-proposal-issues");
const { main: runSyncProposalIssueApprovals } = require("./pipeline-sync-proposal-issue-approvals");
const { main: runCreateDevBranchesFromApproved } = require("./pipeline-create-dev-branches-from-approved");

function normalizeMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (!mode) {
    throw new Error("missing mode. usage: node src/pipeline-run.js <propose|sync>");
  }
  if (["propose", "phase1", "discover"].includes(mode)) return "propose";
  if (["sync", "phase2", "approve"].includes(mode)) return "sync";
  throw new Error(`unsupported mode=${mode}. supported: propose|sync`);
}

async function runByMode(modeInput) {
  const mode = normalizeMode(modeInput);

  if (mode === "propose") {
    await runGenerateProposal();
    await runCreateProposalIssues();
    return;
  }

  await runSyncProposalIssueApprovals();
  await runCreateDevBranchesFromApproved();
}

async function main() {
  await runByMode(process.argv[2]);
}

module.exports = {
  normalizeMode,
  runByMode,
  main,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
}

