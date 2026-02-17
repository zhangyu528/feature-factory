const { spawnSync } = require("child_process");

function gh(args, cwd) {
  const r = spawnSync("gh", args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: false,
  });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || "gh command failed").trim());
  }
  return String(r.stdout || "").trim();
}

function tryGh(args, cwd) {
  try {
    return { ok: true, output: gh(args, cwd) };
  } catch (error) {
    return {
      ok: false,
      output: "",
      error: error?.message || String(error),
    };
  }
}

function ensureLabel(name, cwd, color = "0E8A16", description = "") {
  const list = tryGh(["label", "list", "--limit", "200", "--json", "name"], cwd);
  if (list.ok) {
    const labels = JSON.parse(list.output || "[]");
    if (labels.some((x) => String(x.name || "").toLowerCase() === String(name).toLowerCase())) {
      return true;
    }
  }

  const created = tryGh(
    ["label", "create", name, "--color", color, ...(description ? ["--description", description] : [])],
    cwd
  );
  return created.ok;
}

function findOpenIssueByTitle(title, cwd) {
  const result = tryGh(
    ["issue", "list", "--state", "open", "--limit", "200", "--json", "number,title,url,state,labels"],
    cwd
  );
  if (!result.ok) return null;
  const items = JSON.parse(result.output || "[]");
  return items.find((x) => String(x.title || "") === title) || null;
}

function createIssue({ title, body, labels = [] }, cwd) {
  const args = ["issue", "create", "--title", title, "--body", body];
  for (const label of labels) {
    if (!label) continue;
    args.push("--label", label);
  }
  return gh(args, cwd);
}

function createIssueSafe({ title, body, labels = [] }, cwd) {
  const withLabels = tryGh(
    [
      "issue",
      "create",
      "--title",
      title,
      "--body",
      body,
      ...labels.flatMap((x) => (x ? ["--label", x] : [])),
    ],
    cwd
  );
  if (withLabels.ok) return withLabels.output;

  const fallback = tryGh(["issue", "create", "--title", title, "--body", body], cwd);
  if (fallback.ok) return fallback.output;
  throw new Error(withLabels.error || fallback.error || "failed to create issue");
}

function issueView(number, cwd) {
  const out = gh(
    ["issue", "view", String(number), "--json", "number,url,state,title,labels,body"],
    cwd
  );
  return JSON.parse(out);
}

function listIssues({ state = "open", limit = 200 } = {}, cwd) {
  const out = gh(
    [
      "issue",
      "list",
      "--state",
      String(state || "open"),
      "--limit",
      String(limit || 200),
      "--json",
      "number,url,state,title,labels,body",
    ],
    cwd
  );
  return JSON.parse(out || "[]");
}

function addIssueLabels(number, labels, cwd) {
  const list = (labels || []).filter(Boolean);
  if (list.length === 0) return true;
  const r = tryGh(["issue", "edit", String(number), "--add-label", list.join(",")], cwd);
  return r.ok;
}

function removeIssueLabels(number, labels, cwd) {
  const list = (labels || []).filter(Boolean);
  if (list.length === 0) return true;
  const r = tryGh(["issue", "edit", String(number), "--remove-label", list.join(",")], cwd);
  return r.ok;
}

function closeIssue(number, cwd) {
  gh(["issue", "close", String(number)], cwd);
}

module.exports = {
  tryGh,
  ensureLabel,
  findOpenIssueByTitle,
  createIssue,
  createIssueSafe,
  issueView,
  listIssues,
  addIssueLabels,
  removeIssueLabels,
  closeIssue,
};