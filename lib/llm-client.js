const { readStringConfig, readNumberConfig } = require("./config");

function resolveLlmConfig(providerInput) {
  const provider = (providerInput || readStringConfig("FEATURE_LLM_PROVIDER", "glm")).toLowerCase();
  const apiKey = readStringConfig("GLM_API_KEY", "") || readStringConfig("LLM_API_KEY", "") || readStringConfig("OPENAI_API_KEY", "");
  if (!apiKey.trim()) {
    throw new Error("GLM_API_KEY (or LLM_API_KEY / OPENAI_API_KEY) is required");
  }

  if (provider === "glm") {
    return {
      provider,
      apiKey,
      baseUrl: readStringConfig("FEATURE_LLM_BASE_URL", "https://open.bigmodel.cn/api/coding/paas/v4").replace(/\/$/, ""),
      model: readStringConfig("FEATURE_LLM_MODEL", "glm-5"),
      timeoutMs: Math.max(1000, Math.floor(readNumberConfig("FEATURE_LLM_TIMEOUT_MS", 60000))),
      temperature: readNumberConfig("FEATURE_LLM_TEMPERATURE", 0.2),
    };
  }

  if (provider === "deepseek") {
    return {
      provider,
      apiKey,
      baseUrl: readStringConfig("FEATURE_LLM_BASE_URL", "https://api.deepseek.com/v1").replace(/\/$/, ""),
      model: readStringConfig("FEATURE_LLM_MODEL", "deepseek-chat"),
      timeoutMs: Math.max(1000, Math.floor(readNumberConfig("FEATURE_LLM_TIMEOUT_MS", 60000))),
      temperature: readNumberConfig("FEATURE_LLM_TEMPERATURE", 0.2),
    };
  }

  if (provider === "openai") {
    return {
      provider,
      apiKey,
      baseUrl: readStringConfig("FEATURE_LLM_BASE_URL", readStringConfig("OPENAI_BASE_URL", "https://api.openai.com/v1")).replace(/\/$/, ""),
      model: readStringConfig("FEATURE_LLM_MODEL", readStringConfig("FEATURE_OPENAI_MODEL", "gpt-4.1-mini")),
      timeoutMs: Math.max(1000, Math.floor(readNumberConfig("FEATURE_LLM_TIMEOUT_MS", 60000))),
      temperature: readNumberConfig("FEATURE_LLM_TEMPERATURE", 0.2),
    };
  }

  throw new Error(`unsupported provider: ${provider}. supported: glm, deepseek, openai`);
}

function extractChatText(payload) {
  if (!payload || typeof payload !== "object") return "";
  const content = payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
  if (typeof content === "string") return content.trim();
  return "";
}

async function runLlmPrompt(prompt, provider) {
  const config = resolveLlmConfig(provider);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = payload && payload.error && payload.error.message
        ? payload.error.message
        : `status ${response.status}`;
      throw new Error(`${config.provider} request failed: ${reason}`);
    }

    const text = extractChatText(payload);
    if (!text) {
      throw new Error(`${config.provider} response missing text output`);
    }
    return { text, model: config.model, provider: config.provider };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error(`${config.provider} request timed out after ${config.timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  runLlmPrompt,
  resolveLlmConfig,
};



