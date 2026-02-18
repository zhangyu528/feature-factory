"use strict";

const {
  ensureMainBranch,
  mainSha,
  checkoutNewBranch,
  branchExists,
  remoteBranchExists,
  commitTextFile,
} = require("./lib/git");
const {
  ensureLabel,
  listIssues,
  findOpenIssueByTitle,
  createIssueSafe,
  removeIssueLabels,
  closeIssue,
} = require("./lib/github");
const { ROOT } = require("./lib/registry");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeLabels(labels) {
  return (labels || []).map((x) => String((x && x.name) || "").toLowerCase()).filter(Boolean);
}

function parseFeatureId(issue) {
  const body = String(issue.body || "");
  const fromBody = body.match(/^\s*-\s*feature_id:\s*([^\s]+)\s*$/im);
  if (fromBody && fromBody[1]) return fromBody[1].trim();

  const fromTitle = String(issue.title || "").match(/^\[Proposal\]\s+([^\s]+)\s+/i);
  if (fromTitle && fromTitle[1]) return fromTitle[1].trim();

  return "";
}

function parseFeatureTitle(issue, featureId) {
  const title = String(issue.title || "").trim();
  const m = title.match(/^\[Proposal\]\s+[^\s]+\s+(.+)$/i);
  if (m && m[1]) return m[1].trim();
  if (title) return title;
  return featureId || "feature";
}

function extractProposalMarkdown(issueBody) {
  const text = String(issueBody || "");
  const m = text.match(/```(?:md|markdown)?\s*\r?\n([\s\S]*?)\r?\n```/i);
  if (m && m[1]) return `${m[1].trim()}\n`;
  return "";
}

function fallbackMarkdown(featureId, title) {
  const lines = [];
  lines.push(`# ${featureId} - ${title}`);
  lines.push("");
  lines.push("## Rationale");
  lines.push("");
  lines.push("Generated from approved issue because proposal markdown block was missing.");
  lines.push("");
  lines.push("## Acceptance Criteria");
  lines.push("");
  lines.push("- [ ] Define detailed acceptance criteria in development planning.");
  return `${lines.join("\n")}\n`;
}

function devBranchName(featureId, title) {
  return `dev/${featureId.toLowerCase()}-${slugify(title) || "feature"}`;
}

function featureDocRelPath(featureId) {
  return `docs/feature-proposals/${featureId}/FEATURE.md`;
}

function trackingIssueTitle(featureId, title) {
  return `[Dev] ${featureId} ${title}`;
}

function trackingIssueBody({ proposalIssue, featureId, featureTitle, devBranch, docRelPath }) {
  return [
    "Development tracking issue.",
    "",
    `- feature_id: ${featureId}`,
    `- feature_title: ${featureTitle}`,
    `- proposal_issue: #${proposalIssue.number}`,
    `- proposal_url: ${proposalIssue.html_url || proposalIssue.url || ""}`,
    `- dev_branch: ${devBranch}`,
    `- feature_doc: \`${docRelPath}\``,
    "",
    "## Suggested Checklist",
    "",
    "- [ ] Confirm implementation scope from FEATURE.md",
    "- [ ] Break down tasks",
    "- [ ] Implement and self-test",
    "- [ ] Open PR from dev branch",
  ].join("\n");
}

async function findExistingDevIssue(featureId, featureTitle) {
  const targetTitle = trackingIssueTitle(featureId, featureTitle);
  const issues = await listIssues({ state: "all", limit: 200 }, ROOT);
  for (const issue of issues) {
    const labels = normalizeLabels(issue.labels);
    if (!labels.includes("feature-dev")) continue;

    const title = String(issue.title || "").trim();
    const body = String(issue.body || "");
    const bodyFeatureId = body.match(/^\s*-\s*feature_id:\s*([^\s]+)\s*$/im);
    if (bodyFeatureId && String(bodyFeatureId[1]).trim().toLowerCase() === featureId.toLowerCase()) {
      return issue;
    }

    if (title.toLowerCase() === targetTitle.toLowerCase()) {
      return issue;
    }
  }
  return null;
}

async function ensureDevTrackingIssue({ proposalIssue, featureId, featureTitle, devBranch, docRelPath }) {
  const existing = await findExistingDevIssue(featureId, featureTitle);
  if (existing) {
    return {
      created: false,
      existedBefore: true,
      number: existing.number,
      url: existing.html_url || existing.url || "",
    };
  }

  const title = trackingIssueTitle(featureId, featureTitle);
  const quick = await findOpenIssueByTitle(title, ROOT);
  if (quick) {
    return {
      created: false,
      existedBefore: true,
      number: quick.number,
      url: quick.html_url || quick.url || "",
    };
  }

  const url = await createIssueSafe(
    {
      title,
      body: trackingIssueBody({ proposalIssue, featureId, featureTitle, devBranch, docRelPath }),
      labels: ["feature-dev"],
    },
    ROOT
  );
  const m = String(url || "").match(/\/issues\/(\d+)/);
  return { created: true, existedBefore: false, number: m ? Number(m[1]) : null, url };
}

async function main() {
  await ensureMainBranch(ROOT);

  await ensureLabel("feature-dev", ROOT, "0052CC", "Development tracking issues");

  const issues = await listIssues({ state: "open", limit: 200 }, ROOT);
  const baseSha = await mainSha(ROOT);
  let createdBranches = 0;
  let createdDevIssues = 0;
  let reusedDevIssues = 0;
  let closedProposalIssues = 0;
  let skipped = 0;

  for (const issue of issues) {
    const labels = normalizeLabels(issue.labels);
    const isEligible = labels.includes("feature-proposal") && labels.includes("approved") && !labels.includes("rejected");
    if (!isEligible) {
      skipped += 1;
      continue;
    }

    const featureId = parseFeatureId(issue);
    if (!featureId) {
      skipped += 1;
      continue;
    }

    const featureTitle = parseFeatureTitle(issue, featureId);
    const devBranch = devBranchName(featureId, featureTitle);
    const markdown = extractProposalMarkdown(issue.body) || fallbackMarkdown(featureId, featureTitle);
    const docRelPath = featureDocRelPath(featureId);

    const hasBranch = (await branchExists(ROOT, devBranch)) || (await remoteBranchExists(ROOT, devBranch));
    if (!hasBranch) {
      try {
        await checkoutNewBranch(ROOT, devBranch, baseSha);
        await commitTextFile(
          ROOT,
          devBranch,
          docRelPath,
          markdown,
          `chore(feature): init dev branch for ${featureId}`
        );
        createdBranches += 1;
      } catch (error) {
        console.warn(`[feature:dev:create] skip issue=${issue.number} reason=${String(error.message || error)}`);
        skipped += 1;
        continue;
      }
    }

    const tracked = await ensureDevTrackingIssue({
      proposalIssue: issue,
      featureId,
      featureTitle,
      devBranch,
      docRelPath,
    });
    if (tracked.created) createdDevIssues += 1;
    else reusedDevIssues += 1;

    await removeIssueLabels(issue.number, ["pending-review"], ROOT);

    if (tracked.existedBefore) {
      try {
        await closeIssue(issue.number, ROOT);
        closedProposalIssues += 1;
      } catch {
        // best-effort close; keep sync resilient
      }
    }
  }

  console.log(
    `[feature:dev:create] branches_created=${createdBranches} dev_issues_created=${createdDevIssues} dev_issues_reused=${reusedDevIssues} proposal_closed=${closedProposalIssues} skipped=${skipped}`
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

