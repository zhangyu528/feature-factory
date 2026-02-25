"use strict";

const https = require("https");
const { URL } = require("url");

function post(urlStr, data) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString();
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            // resolve with error message but don't reject promise to avoid Promise.all failure
            console.error(`[notifier] Request failed with status ${res.statusCode}: ${body}`);
            resolve(null);
          }
        });
      });

      req.on("error", (e) => {
        console.error(`[notifier] Request error: ${e.message}`);
        resolve(null);
      });
      
      req.write(JSON.stringify(data));
      req.end();
    } catch (err) {
      console.error(`[notifier] URL parse error: ${err.message}`);
      resolve(null);
    }
  });
}

function formatFeishuCard(features) {
  // Documentation: https://open.feishu.cn/document/ukTMukTMukTM/uMjM3UjLzIzN14yMyMTN
  
  // Header
  const card = {
    header: {
      title: {
        tag: "plain_text",
        content: "🚀 New Feature Proposals Generated",
      },
      template: "blue",
    },
    elements: [],
  };

  // Body elements
  for (const f of features) {
    card.elements.push({
      tag: "div",
      text: {
        tag: "lark_md",
        content: `**[${f.priority}]** [${f.title}](${f.url})`,
      },
    });
  }

  return {
    msg_type: "interactive",
    card: card,
  };
}

function formatWechatMarkdown(features) {
  // Documentation: https://developer.work.weixin.qq.com/document/path/91770
  const lines = ["## 🚀 New Feature Proposals Generated"];
  for (const f of features) {
    // WeChat markdown uses <font color="info">text</font> for blue, "comment" for gray, "warning" for orange
    lines.push(`> <font color="comment">[${f.priority}]</font> [${f.title}](${f.url})`);
  }
  
  return {
    msgtype: "markdown",
    markdown: {
      content: lines.join("\n"),
    },
  };
}

async function sendNotifications(features) {
  if (!features || features.length === 0) return;

  const feishuUrl = process.env.FEATURE_NOTIFY_FEISHU_WEBHOOK;
  const wechatUrl = process.env.FEATURE_NOTIFY_WECHAT_WEBHOOK;

  if (!feishuUrl && !wechatUrl) {
    return;
  }

  console.log(`[notifier] sending notifications for ${features.length} features...`);
  
  const promises = [];

  if (feishuUrl) {
    const payload = formatFeishuCard(features);
    promises.push(post(feishuUrl, payload));
  }

  if (wechatUrl) {
    const payload = formatWechatMarkdown(features);
    promises.push(post(wechatUrl, payload));
  }

  await Promise.all(promises);
}

module.exports = {
  sendNotifications,
};
