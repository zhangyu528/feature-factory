"use strict";

function requiredMessage(name) {
  return `${name} is required in environment variables`;
}

function readStringConfig(name, fallback = "") {
  const envValue = process.env[name];
  if (envValue !== undefined && envValue !== "") return String(envValue);
  return fallback;
}

function readNumberConfig(name, fallback) {
  const raw = readStringConfig(name, "");
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function readRequiredStringConfig(name) {
  const value = readStringConfig(name, "");
  if (!value) {
    throw new Error(requiredMessage(name));
  }
  return value;
}

function readRequiredNumberConfig(name) {
  const raw = readRequiredStringConfig(name);
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`${name} must be a valid number`);
  }
  return n;
}

module.exports = {
  readStringConfig,
  readNumberConfig,
  readRequiredStringConfig,
  readRequiredNumberConfig,
};
