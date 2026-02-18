"use strict";

const { Octokit } = require("@octokit/rest");

let cached = null;

function getToken() {
  const token = String(process.env.GITHUB_TOKEN || "").trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN is required. This build supports workflow-only execution.");
  }
  return token;
}

function getRepo() {
  const full = String(process.env.GITHUB_REPOSITORY || "").trim();
  if (!full || !full.includes("/")) {
    throw new Error("GITHUB_REPOSITORY is required (expected owner/repo).");
  }
  const [owner, repo] = full.split("/");
  if (!owner || !repo) {
    throw new Error("invalid GITHUB_REPOSITORY format. expected owner/repo.");
  }
  return { owner, repo };
}

function getOctokit() {
  if (cached) return cached;
  cached = new Octokit({ auth: getToken() });
  return cached;
}

function branchFromEnv() {
  const fromName = String(process.env.GITHUB_REF_NAME || "").trim();
  if (fromName) return fromName;

  const ref = String(process.env.GITHUB_REF || "").trim();
  if (ref.startsWith("refs/heads/")) return ref.slice("refs/heads/".length);
  return "";
}

module.exports = {
  getOctokit,
  getRepo,
  getToken,
  branchFromEnv,
};

