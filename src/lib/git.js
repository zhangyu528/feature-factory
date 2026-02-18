"use strict";

const { getOctokit, getRepo, branchFromEnv } = require("./github-api");

async function run() {
  throw new Error("run() is not supported in API mode.");
}

async function runQuiet() {
  throw new Error("runQuiet() is not supported in API mode.");
}

async function currentBranch() {
  return branchFromEnv() || "";
}

async function mainSha() {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();
  const ref = await octokit.git.getRef({ owner, repo, ref: "heads/main" });
  return String(ref.data.object.sha || "").trim();
}

async function ensureMainBranch() {
  const branch = await currentBranch();
  if (branch !== "main") {
    throw new Error(`feature pipeline only allowed on main. current=${branch || "unknown"}`);
  }
}

async function ensureCleanForPath() {
  return true;
}

async function branchExists(cwd, branch) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();
  try {
    await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    return true;
  } catch {
    return false;
  }
}

async function remoteBranchExists(cwd, branch) {
  return branchExists(cwd, branch);
}

async function checkoutNewBranch(cwd, branch, fromSha) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const exists = await branchExists(cwd, branch);
  if (!exists) {
    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: fromSha });
    return;
  }

  await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: fromSha, force: true });
}

async function checkout() {
  return true;
}

async function commitAll() {
  return true;
}

async function pushBranch() {
  return true;
}

async function commitTextFile(cwd, branch, filePath, content, message) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const parentCommitSha = ref.data.object.sha;

  const parentCommit = await octokit.git.getCommit({ owner, repo, commit_sha: parentCommitSha });
  const parentTreeSha = parentCommit.data.tree.sha;

  const blob = await octokit.git.createBlob({ owner, repo, content: String(content || ""), encoding: "utf-8" });

  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: parentTreeSha,
    tree: [
      {
        path: filePath,
        mode: "100644",
        type: "blob",
        sha: blob.data.sha,
      },
    ],
  });

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.data.sha,
    parents: [parentCommitSha],
  });

  await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.data.sha, force: false });
  return commit.data.sha;
}

module.exports = {
  run,
  runQuiet,
  currentBranch,
  mainSha,
  ensureMainBranch,
  ensureCleanForPath,
  branchExists,
  remoteBranchExists,
  checkoutNewBranch,
  checkout,
  commitAll,
  pushBranch,
  commitTextFile,
};

