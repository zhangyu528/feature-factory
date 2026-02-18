"use strict";

const { ensureMainBranch } = require("./lib/git");
const { ensureLabel, listIssues, closeIssue } = require("./lib/github");
const { ROOT } = require("./lib/registry");

function normalizeLabels(labels) {
  return (labels || []).map((x) => String((x && x.name) || "").toLowerCase()).filter(Boolean);
}

async function main() {
  await ensureMainBranch(ROOT);

  await ensureLabel("feature-proposal", ROOT, "0E8A16", "Feature proposal items");
  await ensureLabel("pending-review", ROOT, "D4C5F9", "Waiting for proposal decision");
  await ensureLabel("approved", ROOT, "0E8A16", "Proposal approved");
  await ensureLabel("rejected", ROOT, "B60205", "Proposal rejected");

  const openIssues = await listIssues({ state: "open", limit: 200 }, ROOT);
  let approvedOpen = 0;
  let rejectedClosed = 0;
  let pending = 0;
  let skipped = 0;

  for (const issue of openIssues) {
    const labels = normalizeLabels(issue.labels);
    if (!labels.includes("feature-proposal")) {
      skipped += 1;
      continue;
    }

    const isApproved = labels.includes("approved");
    const isRejected = labels.includes("rejected");

    if (isApproved && !isRejected) {
      approvedOpen += 1;
      continue;
    }

    if (isRejected) {
      await closeIssue(issue.number, ROOT);
      rejectedClosed += 1;
      continue;
    }

    pending += 1;
  }

  console.log(
    `[feature:issue:sync] approved_open=${approvedOpen} rejected_closed=${rejectedClosed} pending=${pending} skipped=${skipped}`
  );
}

module.exports = {
  main,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
}

