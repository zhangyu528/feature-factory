const { spawnSync } = require("child_process");
const path = require("path");
const { ROOT } = require("../lib/registry");

function runNode(scriptPath) {
  const r = spawnSync("node", [scriptPath], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) {
    throw new Error(`script failed: ${scriptPath}`);
  }
}

function normalizeMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (!mode) {
    throw new Error("missing mode. usage: node pipeline-run.js <propose|sync>");
  }
  if (["propose", "phase1", "discover"].includes(mode)) return "propose";
  if (["sync", "phase2", "approve"].includes(mode)) return "sync";
  throw new Error(`unsupported mode=${mode}. supported: propose|sync`);
}

function main() {
  const mode = normalizeMode(process.argv[2]);

  if (mode === "propose") {
    runNode(path.resolve(__dirname, "pipeline-generate-proposal.js"));
    runNode(path.resolve(__dirname, "pipeline-create-proposal-issues.js"));
    return;
  }

  runNode(path.resolve(__dirname, "pipeline-sync-proposal-issue-approvals.js"));
  runNode(path.resolve(__dirname, "pipeline-create-dev-branches-from-approved.js"));
}

main();
