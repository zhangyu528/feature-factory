"use strict";

const { runByMode } = require("./src/pipeline-run");

/**
 * Bridge between GitHub Action inputs and Feature Factory configuration.
 * GitHub Actions maps 'inputs: name' to 'process.env.INPUT_NAME'.
 */
async function run() {
  // Map inputs to the environment variables used by the codebase
  const mapping = {
    INPUT_MODE: "FEATURE_MODE",
    INPUT_ENGINE: "FEATURE_AGENT_ENGINE",
    INPUT_LLM_MODEL: "FEATURE_LLM_MODEL",
    INPUT_LLM_API_KEY: "FEATURE_LLM_API_KEY",
    INPUT_LLM_BASE_URL: "FEATURE_LLM_BASE_URL",
    INPUT_FEISHU_WEBHOOK: "FEATURE_NOTIFY_FEISHU_WEBHOOK",
    INPUT_WECHAT_WEBHOOK: "FEATURE_NOTIFY_WECHAT_WEBHOOK",
    INPUT_GITHUB_TOKEN: "GITHUB_TOKEN",
  };

  for (const [inputKey, envKey] of Object.entries(mapping)) {
    const val = process.env[inputKey];
    if (val) {
      process.env[envKey] = val;
    }
  }

  // Default mode to propose if not set
  const mode = process.env.FEATURE_MODE || "propose";

  console.log(`[action] starting feature-factory in mode: ${mode}`);
  
  try {
    await runByMode(mode);
    console.log(`[action] completed successfully.`);
  } catch (error) {
    console.error(`[action] failed: ${error.message}`);
    process.exit(1);
  }
}

run();
