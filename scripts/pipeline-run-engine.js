const fs = require("fs");
const path = require("path");
const { extractJsonObject, buildPrompt, validateEngineOutput } = require("../lib/prompt-utils");
const { runLlmPrompt } = require("../lib/llm-client");
const { ROOT } = require("../lib/registry");

const PROMPT_PATH = path.resolve(__dirname, "..", "engines", "proposal.prompt.md");

async function main() {
  const engine = (process.argv[2] || "").trim().toLowerCase();
  const inputPath = process.argv[3];
  const outputPath = process.argv[4];
  if (!engine || !inputPath || !outputPath) {
    throw new Error("usage: node scripts/pipeline-run-engine.js <glm|deepseek|openai> <input.json> <output.json>");
  }
  if (!["glm", "deepseek", "openai"].includes(engine)) {
    throw new Error(`unsupported engine: ${engine}. supported: glm, deepseek, openai`);
  }

  const raw = fs.readFileSync(path.resolve(ROOT, inputPath), "utf8").replace(/^\uFEFF/, "");
  const input = JSON.parse(raw);
  const promptTemplate = fs.readFileSync(PROMPT_PATH, "utf8");
  const prompt = buildPrompt(promptTemplate, input);

  const response = await runLlmPrompt(prompt, engine);
  const engineOut = extractJsonObject(response.text);
  validateEngineOutput(engineOut);

  const out = {
    engine: response.provider,
    features: engineOut.features,
  };
  fs.writeFileSync(path.resolve(ROOT, outputPath), `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`[feature-runner:${response.provider}] model=${response.model} features=${out.features.length}`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});


