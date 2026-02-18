const path = require("path");
const fs = require("fs");
const { readJson, writeJson, ensureDir } = require("./fs-utils");

function findGitRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.resolve(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function resolveRoot(startDir) {
  const workspace = String(process.env.GITHUB_WORKSPACE || "").trim();
  if (workspace) return path.resolve(workspace);

  const gitRoot = findGitRoot(startDir);
  if (gitRoot) return gitRoot;

  return path.resolve(process.cwd());
}

const ROOT = resolveRoot(__dirname);
const FEATURES_ROOT = path.resolve(ROOT, "feature-proposals");
const STATE_DIR = path.resolve(FEATURES_ROOT, "state");
const REGISTRY_PATH = path.resolve(STATE_DIR, "registry.json");
const LATEST_PATH = path.resolve(FEATURES_ROOT, "LATEST.json");

function initRegistry() {
  ensureDir(STATE_DIR);
  if (!readJson(REGISTRY_PATH)) {
    writeJson(REGISTRY_PATH, {
      version: 1,
      updatedAt: "",
      items: [],
    });
  }
}

function normalizeRegistryItem(item) {
  const next = { ...item };

  if (!next.approvalStatus) next.approvalStatus = "pending";
  if (!next.proposalIssueState) next.proposalIssueState = "open";
  if (next.proposalIssueNumber === undefined) next.proposalIssueNumber = null;
  if (!next.proposalIssueUrl) next.proposalIssueUrl = "";

  delete next.proposalBranch;
  delete next.proposalPrNumber;
  delete next.proposalPrUrl;
  delete next.proposalPrState;
  delete next.proposalBranchDeletedAt;
  delete next.proposalBranchCleanupError;

  return next;
}

function loadRegistry() {
  initRegistry();
  const data = readJson(REGISTRY_PATH, { version: 1, updatedAt: "", items: [] });
  if (!Array.isArray(data.items)) data.items = [];
  data.items = data.items.map(normalizeRegistryItem);
  return data;
}

function saveRegistry(registry) {
  registry.updatedAt = new Date().toISOString();
  registry.items = Array.isArray(registry.items) ? registry.items.map(normalizeRegistryItem) : [];
  writeJson(REGISTRY_PATH, registry);
}

function upsertFeatureItems(items, runMeta) {
  const reg = loadRegistry();
  const map = new Map(reg.items.map((x) => [x.featureId, x]));
  for (const item of items) {
    const existing = map.get(item.featureId);
    if (existing) {
      map.set(item.featureId, {
        ...existing,
        title: item.title,
        sourceRefs: item.sourceRefs,
        priority: item.priority,
        acceptanceCriteria: item.acceptanceCriteria,
        lastSeenAt: runMeta.generatedAt,
      });
      continue;
    }
    map.set(item.featureId, {
      featureId: item.featureId,
      title: item.title,
      sourceRefs: item.sourceRefs,
      priority: item.priority,
      acceptanceCriteria: item.acceptanceCriteria,
      baseBranch: "main",
      baseSha: runMeta.baseSha,
      proposalIssueNumber: null,
      proposalIssueUrl: "",
      approvalStatus: "pending",
      proposalIssueState: "open",
      devBranch: "",
      status: "discovered",
      firstSeenAt: runMeta.generatedAt,
      lastSeenAt: runMeta.generatedAt,
    });
  }
  reg.items = [...map.values()].sort((a, b) => a.featureId.localeCompare(b.featureId));
  saveRegistry(reg);
  return reg;
}

function saveLatest(meta) {
  ensureDir(path.dirname(LATEST_PATH));
  writeJson(LATEST_PATH, meta);
}

function loadLatest() {
  return readJson(LATEST_PATH, null);
}

module.exports = {
  ROOT,
  FEATURES_ROOT,
  REGISTRY_PATH,
  LATEST_PATH,
  loadRegistry,
  saveRegistry,
  upsertFeatureItems,
  saveLatest,
  loadLatest,
};
