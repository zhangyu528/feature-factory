#!/usr/bin/env node
"use strict";

const { runByMode } = require("./src/pipeline-run");

async function main() {
  const mode = process.argv[2] || "";
  await runByMode(mode);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
