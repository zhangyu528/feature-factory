const path = require("path");
const { ensureMainBranch, mainSha } = require("../lib/git");
const { ensureLabel, findOpenIssueByTitle, createIssueSafe } = require("../lib/github");
const { readJson } = require("../lib/fs-utils");
const { ROOT, loadLatest, loadRegistry, saveRegistry } = require("../lib/registry");

function renderFeatureDoc(feature, baseSha) {
  const lines = [];
  lines.push(`# ${feature.featureId} - ${feature.title}`);
  lines.push("");
  lines.push(`- base_branch: main`);
  lines.push(`- base_sha: ${baseSha}`);
  lines.push(`- priority: ${feature.priority}`);
  lines.push(`- source_refs: ${feature.sourceRefs.join(", ")}`);
  lines.push("");
  lines.push("## Rationale");
  lines.push("");
  lines.push(feature.rationale);
  lines.push("");
  lines.push("## Acceptance Criteria");
  lines.push("");
  for (const c of feature.acceptanceCriteria) lines.push(`- [ ] ${c}`);
  lines.push("");
  lines.push("## Approval");
  lines.push("");
  lines.push("- This proposal is approved via GitHub Issue labels.");
  lines.push("- Add label `approved` to approve, `rejected` to reject.");
  return `${lines.join("\n")}\n`;
}

function issueTitle(feature) {
  return `[Proposal] ${feature.featureId} ${feature.title}`;
}

function issueBody(feature, baseSha) {
  return [
    "Feature proposal approval item.",
    "",
    `- feature_id: ${feature.featureId}`,
    `- base_branch: main`,
    `- base_sha: ${baseSha}`,
    "",
    "Approval action:",
    "- Add label `approved` to approve.",
    "- Add label `rejected` to reject.",
    "",
    "Proposal markdown:",
    "",
    "```md",
    renderFeatureDoc(feature, baseSha).trim(),
    "```",
  ].join("\n");
}

function main() {
  ensureMainBranch(ROOT);
  const latest = loadLatest();
  if (!latest) throw new Error("LATEST.json not found. run propose generation first.");

  const featuresData = readJson(path.resolve(ROOT, latest.featuresPath));
  const items = (featuresData.features || []);
  if (items.length === 0) {
    console.log("[feature:issue:create] no features.");
    return;
  }

  ensureLabel("feature-proposal", ROOT, "0E8A16", "Feature proposal items");
  ensureLabel("pending-review", ROOT, "D4C5F9", "Waiting for proposal decision");
  ensureLabel("approved", ROOT, "0E8A16", "Proposal approved");
  ensureLabel("rejected", ROOT, "B60205", "Proposal rejected");

  const registry = loadRegistry();
  const regMap = new Map(registry.items.map((x) => [x.featureId, x]));
  const baseSha = mainSha(ROOT);
  let created = 0;
  let reused = 0;

  for (const feature of items) {
    const reg = regMap.get(feature.featureId);
    if (!reg) continue;

    const title = issueTitle(feature);

    if (reg.proposalIssueNumber && reg.proposalIssueState === "open") {
      reused += 1;
      continue;
    }

    let issue = findOpenIssueByTitle(title, ROOT);
    let issueNumber = null;
    let issueUrl = "";

    if (issue) {
      issueNumber = issue.number;
      issueUrl = issue.url;
      reused += 1;
    } else {
      const url = createIssueSafe(
        {
          title,
          body: issueBody(feature, baseSha),
          labels: ["feature-proposal", "pending-review"],
        },
        ROOT
      );
      issueUrl = url;
      const m = url.match(/\/issues\/(\d+)/);
      issueNumber = m ? Number(m[1]) : null;
      created += 1;
    }

    reg.proposalIssueNumber = issueNumber;
    reg.proposalIssueUrl = issueUrl;
    reg.proposalIssueState = "open";
    reg.approvalStatus = "pending";
    reg.status = "issue_open";
    reg.lastSeenAt = new Date().toISOString();
  }

  registry.items = [...regMap.values()];
  saveRegistry(registry);
  console.log(`[feature:issue:create] created=${created} reused=${reused}`);
}

main();