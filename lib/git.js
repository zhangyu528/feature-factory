const { spawnSync } = require("child_process");

function run(args, cwd) {
  const r = spawnSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: false,
  });
  if (r.error) {
    throw new Error(`git spawn failed: ${r.error.message}`);
  }
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "git command failed").trim());
  }
  return String(r.stdout || "").trim();
}

function runQuiet(args, cwd) {
  const r = spawnSync("git", args, {
    cwd,
    stdio: "inherit",
    encoding: "utf8",
    shell: false,
  });
  if (r.error) {
    throw new Error(`git spawn failed: ${r.error.message}`);
  }
  if (r.status !== 0) {
    throw new Error(`git command failed: ${args.join(" ")}`);
  }
}

function currentBranch(cwd) {
  return run(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
}

function mainSha(cwd) {
  return run(["rev-parse", "main"], cwd);
}

function ensureMainBranch(cwd) {
  const branch = currentBranch(cwd);
  if (branch !== "main") {
    throw new Error(`feature pipeline only allowed on main. current=${branch}`);
  }
}

function ensureCleanForPath(cwd, targetPath) {
  const out = run(["status", "--porcelain", "--", targetPath], cwd);
  if (out) {
    throw new Error(`working tree has pending changes under ${targetPath}`);
  }
}

function branchExists(cwd, branch) {
  try {
    run(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], cwd);
    return true;
  } catch {
    return false;
  }
}

function remoteBranchExists(cwd, branch, remote = "origin") {
  const out = run(["ls-remote", "--heads", remote, branch], cwd);
  return Boolean(String(out || "").trim());
}

function checkoutNewBranch(cwd, branch, fromSha) {
  runQuiet(["checkout", "-B", branch, fromSha], cwd);
}

function commitAll(cwd, message, onlyPath) {
  if (onlyPath) {
    runQuiet(["add", onlyPath], cwd);
  } else {
    runQuiet(["add", "-A"], cwd);
  }
  try {
    runQuiet(["commit", "-m", message], cwd);
    return true;
  } catch {
    return false;
  }
}

function checkout(cwd, ref) {
  runQuiet(["checkout", ref], cwd);
}

function pushBranch(cwd, branch) {
  runQuiet(["push", "-u", "origin", branch], cwd);
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
};