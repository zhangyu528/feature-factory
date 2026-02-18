"use strict";

const { getOctokit, getRepo } = require("./github-api");

async function ensureLabel(name, cwd, color = "0E8A16", description = "") {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const labels = await octokit.paginate(octokit.issues.listLabelsForRepo, {
    owner,
    repo,
    per_page: 100,
  });
  const exists = labels.some((x) => String(x.name || "").toLowerCase() === String(name).toLowerCase());
  if (exists) return true;

  try {
    await octokit.issues.createLabel({ owner, repo, name, color, description });
    return true;
  } catch {
    return false;
  }
}

async function findOpenIssueByTitle(title, cwd) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const issues = await octokit.paginate(octokit.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

  return (
    issues.find((x) => String(x.title || "") === title) || null
  );
}

async function createIssue({ title, body, labels = [] }, cwd) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const result = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels: (labels || []).filter(Boolean),
  });
  return result.data.html_url;
}

async function createIssueSafe({ title, body, labels = [] }, cwd) {
  try {
    return await createIssue({ title, body, labels }, cwd);
  } catch {
    return await createIssue({ title, body, labels: [] }, cwd);
  }
}

async function issueView(number, cwd) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();
  const result = await octokit.issues.get({ owner, repo, issue_number: Number(number) });
  return result.data;
}

async function listIssues({ state = "open", limit = 200 } = {}, cwd) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  const issues = await octokit.paginate(octokit.issues.listForRepo, {
    owner,
    repo,
    state: String(state || "open"),
    per_page: 100,
  });

  return issues.slice(0, Math.max(1, Number(limit || 200)));
}

async function addIssueLabels(number, labels, cwd) {
  const list = (labels || []).filter(Boolean);
  if (list.length === 0) return true;

  const octokit = getOctokit();
  const { owner, repo } = getRepo();
  try {
    await octokit.issues.addLabels({ owner, repo, issue_number: Number(number), labels: list });
    return true;
  } catch {
    return false;
  }
}

async function removeIssueLabels(number, labels, cwd) {
  const list = (labels || []).filter(Boolean);
  if (list.length === 0) return true;

  const octokit = getOctokit();
  const { owner, repo } = getRepo();

  for (const label of list) {
    try {
      await octokit.issues.removeLabel({ owner, repo, issue_number: Number(number), name: label });
    } catch {
      // ignore missing labels
    }
  }
  return true;
}

async function closeIssue(number, cwd) {
  const octokit = getOctokit();
  const { owner, repo } = getRepo();
  await octokit.issues.update({ owner, repo, issue_number: Number(number), state: "closed" });
}

module.exports = {
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

