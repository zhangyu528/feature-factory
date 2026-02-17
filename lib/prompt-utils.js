function extractJsonObject(text) {
  const src = String(text || "").trim();
  if (!src) throw new Error("empty output from engine");

  try {
    return JSON.parse(src);
  } catch {}

  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sub = src.slice(start, end + 1);
    return JSON.parse(sub);
  }
  throw new Error("engine output does not contain valid JSON object");
}

function buildPrompt(template, input) {
  return [
    template.trim(),
    "",
    "Input JSON:",
    "```json",
    JSON.stringify(input, null, 2),
    "```",
    "",
    "Return a single JSON object only.",
  ].join("\n");
}

function validateEngineOutput(output) {
  if (!output || !Array.isArray(output.features)) {
    throw new Error("engine output missing features array");
  }
  for (const f of output.features) {
    if (!f.featureId || !f.title) {
      throw new Error("feature item missing featureId/title");
    }
    if (!Array.isArray(f.sourceRefs)) f.sourceRefs = [];
    if (!Array.isArray(f.acceptanceCriteria)) f.acceptanceCriteria = [];
    if (!f.priority) f.priority = "P2";
  }
}

module.exports = {
  extractJsonObject,
  buildPrompt,
  validateEngineOutput,
};
