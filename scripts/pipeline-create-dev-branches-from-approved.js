const fs = require("fs");
const path = require("path");
const {
  ensureMainBranch,
  mainSha,
  checkout,
  checkoutNewBranch,
  pushBranch,
  runQuiet,
  commitAll,
  branchExists,
  remoteBranchExists,
} = require("../lib/git");
const { listIssues } = require("../lib/github");
const { ROOT } = require("../lib/registry");

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

function main() {
  ensureMainBranch(ROOT);
  const issues = listIssues({ state: "closed", limit: 200 }, ROOT);
  const baseSha = mainSha(ROOT);
  let created = 0;
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

    if (branchExists(ROOT, devBranch) || remoteBranchExists(ROOT, devBranch)) {
      skipped += 1;
      continue;
    }

    const markdown = extractProposalMarkdown(issue.body) || fallbackMarkdown(featureId, featureTitle);
    const docRelPath = featureDocRelPath(featureId);
    const docAbsPath = path.resolve(ROOT, docRelPath);

    checkoutNewBranch(ROOT, devBranch, baseSha);
    try {
      fs.mkdirSync(path.dirname(docAbsPath), { recursive: true });
      fs.writeFileSync(docAbsPath, markdown, "utf8");

      const committed = commitAll(
        ROOT,
        `chore(feature): init dev branch for ${featureId}`,
        docRelPath
      );

      if (!committed) {
        runQuiet(
          ["commit", "--allow-empty", "-m", `chore(feature): init dev branch for ${featureId}`],
          ROOT
        );
      }

      pushBranch(ROOT, devBranch);
      checkout(ROOT, "main");
      created += 1;
    } catch (error) {
      checkout(ROOT, "main");
      console.warn(`[feature:dev:create] skip issue=${issue.number} reason=${String(error.message || error)}`);
      skipped += 1;
    }
  }

  checkout(ROOT, "main");
  console.log(`[feature:dev:create] created=${created} skipped=${skipped}`);
}

main();