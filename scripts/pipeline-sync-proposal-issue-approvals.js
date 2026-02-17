const { ensureMainBranch } = require("../lib/git");
const { listIssues, closeIssue } = require("../lib/github");
const { ROOT } = require("../lib/registry");

function normalizeLabels(labels) {
  return (labels || []).map((x) => String((x && x.name) || "").toLowerCase()).filter(Boolean);
}

function hasAllLabels(labels, required) {
  return required.every((x) => labels.includes(String(x).toLowerCase()));
}

function main() {
  ensureMainBranch(ROOT);

  const openIssues = listIssues({ state: "open", limit: 200 }, ROOT);
  let approvedClosed = 0;
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

    if (isApproved) {
      closeIssue(issue.number, ROOT);
      approvedClosed += 1;
      continue;
    }

    if (isRejected) {
      closeIssue(issue.number, ROOT);
      rejectedClosed += 1;
      continue;
    }

    if (hasAllLabels(labels, ["feature-proposal", "pending-review"])) {
      pending += 1;
      continue;
    }

    pending += 1;
  }

  console.log(
    `[feature:issue:sync] approved_closed=${approvedClosed} rejected_closed=${rejectedClosed} pending=${pending} skipped=${skipped}`
  );
}

main();