"use strict";

const path = require("path");
const { ensureMainBranch, mainSha, currentBranch } = require("./lib/git");
const { readJson, writeJson, writeText, ensureDir } = require("./lib/fs-utils");
const { ROOT, FEATURES_ROOT, upsertFeatureItems, saveLatest } = require("./lib/registry");
const { readRequiredStringConfig, readNumberConfig } = require("./lib/config");
const { getOctokit, getRepo } = require("./lib/github-api");
const { runEngine } = require("./pipeline-run-engine");

const MAX_FILE_LIST = Math.max(1, Math.floor(readNumberConfig("FEATURE_CONTEXT_MAX_FILES", 120)));
const MAX_SNIPPET_FILES = Math.max(1, Math.floor(readNumberConfig("FEATURE_CONTEXT_MAX_SNIPPET_FILES", 8)));
const MAX_SNIPPET_CHARS = Math.max(1, Math.floor(readNumberConfig("FEATURE_CONTEXT_MAX_SNIPPET_CHARS", 1500)));

function runId(now = new Date()) {
  const iso = now.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19).replace(/:/g, "");
  return { date, time, iso };
}

async function listRepoTrackedFiles() {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const mainRef = await octokit.git.getRef({ owner, repo, ref: "heads/main" });
  const commit = await octokit.git.getCommit({ owner, repo, commit_sha: mainRef.data.object.sha });
  const tree = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commit.data.tree.sha,
    recursive: "true",
  });

  return (tree.data.tree || [])
    .filter((x) => x && x.type === "blob" && x.path)
    .map((x) => String(x.path))
    .sort();
}

function isMarkdownFile(relPath) {
  return path.extname(relPath).toLowerCase() === ".md";
}

function chooseTrackedFiles(files, maxCount) {
  const mdFiles = files.filter(isMarkdownFile);
  return mdFiles.slice(0, maxCount);
}

function chooseSnippetFiles(files) {
  const mdFiles = files.filter(isMarkdownFile);
  return mdFiles.slice(0, MAX_SNIPPET_FILES);
}

async function readFileSnippetFromRepo(relPath) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: relPath,
      ref: "main",
    });
    if (Array.isArray(response.data)) return "";

    const content = String(response.data.content || "");
    const encoding = String(response.data.encoding || "").toLowerCase();
    if (!content || encoding !== "base64") return "";

    const decoded = Buffer.from(content, "base64").toString("utf8").replace(/^\uFEFF/, "");
    return decoded.slice(0, MAX_SNIPPET_CHARS);
  } catch {
    return "";
  }
}

async function collectRepoContext() {
  const tracked = await listRepoTrackedFiles();
  const markdownFiles = tracked.filter(isMarkdownFile);
  const snippets = {};

  for (const rel of chooseSnippetFiles(markdownFiles)) {
    const text = await readFileSnippetFromRepo(rel);
    if (text) snippets[rel] = text;
  }

  return {
    repositoryRoot: ROOT,
    branch: await currentBranch(ROOT),
    trackedFiles: chooseTrackedFiles(markdownFiles, MAX_FILE_LIST),
    trackedFilesTotal: markdownFiles.length,
    fileSnippets: snippets,
  };
}

function chooseEngine() {
  const configured = readRequiredStringConfig("FEATURE_AGENT_ENGINE").trim().toLowerCase();
  if (["glm", "deepseek", "openai"].includes(configured)) {
    return [configured];
  }
  throw new Error(`unsupported FEATURE_AGENT_ENGINE=${configured}. supported: glm, deepseek, openai`);
}

async function callRunner(engine, inputPath, outputPath) {
  try {
    await runEngine(engine, inputPath, outputPath);
    return { ok: true, status: 0, stdout: "", stderr: "" };
  } catch (error) {
    return {
      ok: false,
      status: 1,
      stdout: "",
      stderr: error && error.stack ? error.stack : String(error),
    };
  }
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

async function main() {
  await ensureMainBranch(ROOT);

  const info = runId();
  const runIdValue = `${info.date}-${info.time}`;
  const runDir = path.resolve(FEATURES_ROOT, "runs", info.date, info.time);
  ensureDir(runDir);

  const input = await collectRepoContext();

  const inputPath = path.resolve(runDir, "agent_input.json");
  const outputPath = path.resolve(runDir, "agent_output.json");
  writeJson(inputPath, input);

  let payload = null;
  let selected = "";
  const attempts = [];
  for (const engine of chooseEngine()) {
    const r = await callRunner(engine, inputPath, outputPath);
    attempts.push({ engine, ok: r.ok, stderr: String(r.stderr || "").trim(), stdout: String(r.stdout || "").trim() });
    if (!r.ok) continue;
    payload = readJson(outputPath);
    selected = engine;
    break;
  }
  if (!payload) {
    throw new Error(`all engines failed: ${JSON.stringify(attempts)}`);
  }

  validatePayload(payload);
  const baseSha = await mainSha(ROOT);
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

module.exports = {
  main,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exit(1);
  });
}
