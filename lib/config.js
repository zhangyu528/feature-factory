const fs = require("fs");
const path = require("path");
const { ROOT } = require("./registry");

const DEFAULT_CONFIG_PATH = path.resolve(ROOT, "feature-factory.config.json");

let cached = null;

function loadConfigFile() {
  if (cached) return cached;

  const explicit = process.env.FEATURE_FACTORY_CONFIG_PATH;
  const configPath = explicit ? path.resolve(ROOT, explicit) : DEFAULT_CONFIG_PATH;
  if (!fs.existsSync(configPath)) {
    cached = { data: {}, path: configPath };
    return cached;
  }

  const raw = fs.readFileSync(configPath, "utf8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`invalid config file: ${configPath}`);
  }

  const flat = {
    ...(parsed.env && typeof parsed.env === "object" ? parsed.env : {}),
    ...parsed,
  };
  delete flat.env;

  cached = { data: flat, path: configPath };
  return cached;
}

function readStringConfig(name, fallback = "") {
  const envValue = process.env[name];
  if (envValue !== undefined && envValue !== "") return String(envValue);

  const { data } = loadConfigFile();
  if (data[name] !== undefined && data[name] !== null && data[name] !== "") {
    return String(data[name]);
  }
  return fallback;
}

function readNumberConfig(name, fallback) {
  const raw = readStringConfig(name, "");
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  DEFAULT_CONFIG_PATH,
  loadConfigFile,
  readStringConfig,
  readNumberConfig,
};
