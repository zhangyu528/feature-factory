function extractJsonObject(text) {
  let src = String(text || "").trim();
  if (!src) throw new Error("empty output from engine");

  // Remove markdown code block wrappers if present
  if (src.startsWith("```json")) {
    src = src.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (src.startsWith("```")) {
    src = src.replace(/^```/, "").replace(/```$/, "").trim();
  }

  try {
    return JSON.parse(src);
  } catch (err) {
    // Attempt to find the first '{' and last '}'
    const start = src.indexOf("{");
    const end = src.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sub = src.slice(start, end + 1);
      try {
        return JSON.parse(sub);
      } catch (innerErr) {
        throw new Error(`engine output contains invalid JSON: ${innerErr.message}\nFull content:\n${src}`);
      }
    }
    throw new Error(`engine output does not contain valid JSON object. ${err.message}`);
  }
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
    "Return exactly ONE JSON object. Ensure it is valid JSON: use double quotes for all keys and string values, and escape any special characters.",
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

