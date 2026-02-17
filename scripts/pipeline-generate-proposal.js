const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ensureMainBranch, mainSha, currentBranch } = require("../lib/git");
const { readJson, writeJson, writeText, ensureDir } = require("../lib/fs-utils");
const { ROOT, FEATURES_ROOT, upsertFeatureItems, saveLatest } = require("../lib/registry");
const { readStringConfig, readNumberConfig } = require("../lib/config");

const ENGINE_RUNNER = path.resolve(__dirname, "pipeline-run-engine.js");

const MAX_FILE_LIST = Math.max(1, Math.floor(readNumberConfig("FEATURE_CONTEXT_MAX_FILES", 120)));
const MAX_SNIPPET_FILES = Math.max(1, Math.floor(readNumberConfig("FEATURE_CONTEXT_MAX_SNIPPET_FILES", 8)));
const MAX_SNIPPET_CHARS = Math.max(1, Math.floor(readNumberConfig("FEATURE_CONTEXT_MAX_SNIPPET_CHARS", 1500)));

function runId(now = new Date()) {
  const iso = now.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19).replace(/:/g, "");
  return { date, time, iso };
}

function listGitTrackedFiles(root) {
  const r = spawnSync("git", ["ls-files"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: false,
  });
  if (r.error) {
    throw new Error(`git ls-files failed: ${r.error.message}`);
  }
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "git ls-files failed").trim());
  }
  return String(r.stdout || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .sort();
}

function likelyTextFile(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  return [
    ".md",
    ".txt",
    ".json",
    ".js",
    ".cjs",
    ".mjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".env",
    ".sh",
    ".ps1",
  ].includes(ext);
}

function chooseTrackedFiles(files, maxCount) {
  const priorityExact = [
    "README.md",
    "AGENTS.md",
    "package.json",
    "scripts/pipeline-run.js",
    "scripts/pipeline-generate-proposal.js",
    "scripts/pipeline-create-proposal-issues.js",
    "scripts/pipeline-sync-proposal-issue-approvals.js",
    "scripts/pipeline-create-dev-branches-from-approved.js",
  ];
  const priorityPrefixes = ["lib/", "engines/"];

  const picked = [];
  const pickedSet = new Set();
  const push = (f) => {
    if (!f || pickedSet.has(f)) return;
    picked.push(f);
    pickedSet.add(f);
  };

  for (const f of priorityExact) {
    if (files.includes(f)) push(f);
    if (picked.length >= maxCount) return picked;
  }

  for (const f of files) {
    if (!likelyTextFile(f)) continue;
    if (!priorityPrefixes.some((p) => f.startsWith(p))) continue;
    push(f);
    if (picked.length >= maxCount) return picked;
  }

  for (const f of files) {
    if (!likelyTextFile(f)) continue;
    push(f);
    if (picked.length >= maxCount) return picked;
  }

  return picked;
}

function chooseSnippetFiles(files) {
  const priority = [
    "README.md",
    "AGENTS.md",
    "scripts/pipeline-run.js",
    "scripts/pipeline-generate-proposal.js",
    "scripts/pipeline-create-proposal-issues.js",
    "scripts/pipeline-sync-proposal-issue-approvals.js",
    "scripts/pipeline-create-dev-branches-from-approved.js",
    "lib/prompt-utils.js",
    "lib/git.js",
  ];

  const picked = [];
  for (const p of priority) {
    if (files.includes(p)) picked.push(p);
    if (picked.length >= MAX_SNIPPET_FILES) return picked;
  }

  for (const f of files) {
    if (!likelyTextFile(f)) continue;
    if (picked.includes(f)) continue;
    if (!(f.startsWith("lib/") || f.startsWith("engines/"))) continue;
    picked.push(f);
    if (picked.length >= MAX_SNIPPET_FILES) break;
  }
  return picked;
}

function safeReadSnippet(absPath) {
  try {
    const raw = fs.readFileSync(absPath, "utf8").replace(/^\uFEFF/, "");
    return raw.slice(0, MAX_SNIPPET_CHARS);
  } catch {
    return "";
  }
}

function collectRepoContext() {
  const tracked = listGitTrackedFiles(ROOT);
  const snippets = {};
  for (const rel of chooseSnippetFiles(tracked)) {
    const abs = path.resolve(ROOT, rel);
    const text = safeReadSnippet(abs);
    if (text) snippets[rel] = text;
  }

  return {
    repositoryRoot: ROOT,
    branch: currentBranch(ROOT),
    trackedFiles: chooseTrackedFiles(tracked, MAX_FILE_LIST),
    trackedFilesTotal: tracked.length,
    fileSnippets: snippets,
  };
}

function chooseEngine() {
  const configuredRaw = readStringConfig("FEATURE_AGENT_ENGINE", "glm").trim().toLowerCase();
  const configured = configuredRaw;

  if (["glm", "deepseek", "openai"].includes(configured)) {
    return [configured];
  }

  // Compatibility: if model name is mistakenly set in FEATURE_AGENT_ENGINE,
  // treat it as a GLM model and keep provider as glm.
  if (configured.startsWith("glm-")) {
    const currentModel = readStringConfig("FEATURE_LLM_MODEL", "").trim();
    if (!currentModel) {
      process.env.FEATURE_LLM_MODEL = configuredRaw;
    }
    console.warn(
      `[feature:generate] FEATURE_AGENT_ENGINE=${configuredRaw} looks like a model name; ` +
      `using provider=glm and model=${readStringConfig("FEATURE_LLM_MODEL", configuredRaw)}`
    );
    return ["glm"];
  }

  throw new Error(`unsupported FEATURE_AGENT_ENGINE=${configured}. supported: glm, deepseek, openai`);
}

function callRunner(engine, inputPath, outputPath) {
  const result = spawnSync("node", [ENGINE_RUNNER, engine, inputPath, outputPath], {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function renderSummary(meta, payload) {
  const lines = [];
  lines.push(`# Feature Proposal Summary (${meta.date} ${meta.time} UTC)`);
  lines.push("");
  lines.push(`- run_id: ${meta.runId}`);
  lines.push(`- generated_at: ${meta.generatedAt}`);
  lines.push(`- engine: ${payload.engine}`);
  lines.push(`- base_branch: main`);
  lines.push(`- base_sha: ${meta.baseSha}`);
  lines.push(`- feature_count: ${payload.features.length}`);
  lines.push("");
  lines.push("## Features");
  lines.push("");
  for (const f of payload.features) {
    lines.push(`### ${f.featureId} - ${f.title}`);
    lines.push(`- priority: ${f.priority}`);
    lines.push(`- source_refs: ${f.sourceRefs.join(", ")}`);
    lines.push(`- rationale: ${f.rationale}`);
    lines.push("- acceptance_criteria:");
    for (const c of f.acceptanceCriteria) lines.push(`  - ${c}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function validatePayload(data) {
  if (!data || !Array.isArray(data.features)) throw new Error("invalid runner output: missing features");
  for (const f of data.features) {
    if (!f.featureId || !f.title) throw new Error("invalid runner output: featureId/title required");
    if (!Array.isArray(f.sourceRefs)) f.sourceRefs = [];
    if (!Array.isArray(f.acceptanceCriteria)) f.acceptanceCriteria = [];
  }
}

function main() {
  ensureMainBranch(ROOT);

  const info = runId();
  const runIdValue = `${info.date}-${info.time}`;
  const runDir = path.resolve(FEATURES_ROOT, "runs", info.date, info.time);
  ensureDir(runDir);

  const input = collectRepoContext();

  const inputPath = path.resolve(runDir, "agent_input.json");
  const outputPath = path.resolve(runDir, "agent_output.json");
  writeJson(inputPath, input);

  let payload = null;
  let selected = "";
  const attempts = [];
  for (const engine of chooseEngine()) {
    const r = callRunner(engine, inputPath, outputPath);
    attempts.push({ engine, ok: r.ok, stderr: r.stderr.trim(), stdout: r.stdout.trim() });
    if (!r.ok) continue;
    payload = readJson(outputPath);
    selected = engine;
    break;
  }
  if (!payload) {
    throw new Error(`all engines failed: ${JSON.stringify(attempts)}`);
  }

  validatePayload(payload);
  const baseSha = mainSha(ROOT);
  const generatedAt = info.iso;

  const featuresJsonPath = path.resolve(runDir, "features.json");
  const summaryPath = path.resolve(runDir, "FEATURE_SUMMARY.md");

  const featuresData = {
    version: 1,
    runId: runIdValue,
    generatedAt,
    engine: selected,
    baseBranch: "main",
    baseSha,
    features: payload.features,
  };
  writeJson(featuresJsonPath, featuresData);
  writeText(
    summaryPath,
    renderSummary(
      {
        runId: runIdValue,
        date: info.date,
        time: info.time,
        generatedAt,
        baseSha,
      },
      { engine: selected, features: payload.features }
    )
  );

  upsertFeatureItems(payload.features, { generatedAt, baseSha });
  saveLatest({
    version: 1,
    runId: runIdValue,
    generatedAt,
    engine: selected,
    baseBranch: "main",
    baseSha,
    runDir: path.relative(ROOT, runDir).replace(/\\/g, "/"),
    featuresPath: path.relative(ROOT, featuresJsonPath).replace(/\\/g, "/"),
    summaryPath: path.relative(ROOT, summaryPath).replace(/\\/g, "/"),
  });

  console.log(`[feature:generate] run=${runIdValue} engine=${selected} features=${payload.features.length}`);
}

main();















