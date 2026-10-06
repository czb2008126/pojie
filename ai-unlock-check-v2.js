/**
 * Quantumult X - AI Unlock Check V2
 * Compatible event-interaction UI structure based on KOP-XIAO style.
 *
 * [task_local]
 * event-interaction https://raw.githubusercontent.com/czb2008126/pojie/main/ai-unlock-check-v2.js, tag=🤖 AI解锁查询V2, img-url=brain.head.profile, enabled=true
 */

const PARAM = (typeof $environment !== "undefined" && $environment.params) ? $environment.params : "";
const opts = PARAM ? { policy: PARAM } : {};
const optsNoRedirect = PARAM ? { policy: PARAM, redirection: false } : { redirection: false };

const result = {
  title: "    🤖  AI 服务解锁查询",
  Gemini: "<b>Gemini: </b>检测失败，请重试 ❗️",
  AIStudio: "<b>AI Studio: </b>检测失败，请重试 ❗️",
  Antigravity: "<b>Antigravity: </b>检测失败，请重试 ❗️",
  ChatGPT: "<b>ChatGPT: </b>检测失败，请重试 ❗️",
  Claude: "<b>Claude: </b>检测失败，请重试 ❗️",
  IP: "<b>出口 IP: </b>未知",
  Region: "<b>地区: </b>未知"
};

function req(url, extra) {
  const o = Object.assign({
    url,
    opts,
    timeout: 5000,
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      "Accept-Language": "en-US,en;q=0.9"
    }
  }, extra || {});
  return $task.fetch(o);
}

function blocked(body) {
  const t = String(body || "").toLowerCase();
  return [
    "not available in your country",
    "not available in your region",
    "unsupported country",
    "unsupported region",
    "在此国家/地区无法使用",
    "此国家/地区无法使用",
    "此地区无法使用"
  ].some(x => t.indexOf(x) !== -1);
}

async function checkIP() {
  try {
    const r = await req("https://ipwho.is/");
    const j = JSON.parse(r.body || "{}");
    if (j && j.ip) result.IP = "<b>出口 IP: </b>" + j.ip;
    if (j && (j.country || j.country_code)) {
      const cc = j.country_code || "";
      result.Region = "<b>地区: </b>" + (j.country || cc) + (cc ? " (" + cc + ")" : "");
    }
  } catch (_) {}
}

async function checkGemini() {
  try {
    const r = await req("https://gemini.google.com/app");
    const code = Number(r.statusCode || 0);
    if (blocked(r.body)) result.Gemini = "<b>Gemini: </b>地区限制 🚫";
    else if (code === 403 || code === 451) result.Gemini = "<b>Gemini: </b>受限 🚫";
    else if (code >= 200 && code < 400) result.Gemini = "<b>Gemini: </b>网页可访问 ✅";
    else result.Gemini = "<b>Gemini: </b>HTTP " + code + " ⚠️";
  } catch (_) {
    result.Gemini = "<b>Gemini: </b>连接失败 ❌";
  }
}

async function checkAIStudio() {
  try {
    const r = await req("https://aistudio.google.com/");
    const code = Number(r.statusCode || 0);
    if (blocked(r.body)) result.AIStudio = "<b>AI Studio: </b>地区限制 🚫";
    else if (code === 403 || code === 451) result.AIStudio = "<b>AI Studio: </b>受限 🚫";
    else if (code >= 200 && code < 400) result.AIStudio = "<b>AI Studio: </b>可访问 ✅";
    else result.AIStudio = "<b>AI Studio: </b>HTTP " + code + " ⚠️";
  } catch (_) {
    result.AIStudio = "<b>AI Studio: </b>连接失败 ❌";
  }
}

async function checkAntigravity() {
  try {
    const r = await req("https://antigravity.google/");
    const code = Number(r.statusCode || 0);
    if (blocked(r.body)) result.Antigravity = "<b>Antigravity: </b>地区限制 🚫";
    else if (code === 403 || code === 451) result.Antigravity = "<b>Antigravity: </b>受限 🚫";
    else if (code >= 200 && code < 400) result.Antigravity = "<b>Antigravity: </b>官网可访问 ✅";
    else result.Antigravity = "<b>Antigravity: </b>HTTP " + code + " ⚠️";
  } catch (_) {
    result.Antigravity = "<b>Antigravity: </b>连接失败 ❌";
  }
}

async function checkChatGPT() {
  try {
    const r = await $task.fetch({
      url: "https://chatgpt.com/cdn-cgi/trace",
      opts: optsNoRedirect,
      timeout: 5000
    });
    const code = Number(r.statusCode || 0);
    if (code >= 200 && code < 400) {
      const m = String(r.body || "").match(/(?:^|\n)loc=([^\n]+)/);
      result.ChatGPT = "<b>ChatGPT: </b>支持" + (m ? " ➟ [" + m[1] + "]" : "") + " ✅";
    } else {
      result.ChatGPT = "<b>ChatGPT: </b>HTTP " + code + " ⚠️";
    }
  } catch (_) {
    result.ChatGPT = "<b>ChatGPT: </b>连接失败 ❌";
  }
}

async function checkClaude() {
  try {
    const r = await req("https://claude.ai/");
    const code = Number(r.statusCode || 0);
    if (blocked(r.body)) result.Claude = "<b>Claude: </b>地区限制 🚫";
    else if (code === 403 || code === 451) result.Claude = "<b>Claude: </b>受限 🚫";
    else if (code >= 200 && code < 500) result.Claude = "<b>Claude: </b>可访问 ✅";
    else result.Claude = "<b>Claude: </b>HTTP " + code + " ⚠️";
  } catch (_) {
    result.Claude = "<b>Claude: </b>连接失败 ❌";
  }
}

function render(nodeText) {
  let content =
    "--------------------------------------</br>" +
    [
      result.Gemini,
      result.AIStudio,
      result.Antigravity,
      result.ChatGPT,
      result.Claude,
      result.Region,
      result.IP
    ].join("</br></br>") +
    "</br>--------------------------------------</br>" +
    "<font color=#CD5C5C><b>节点</b> ➟ " + (nodeText || PARAM || "当前策略") + "</font>";

  content =
    '<p style="text-align:center;font-family:-apple-system;font-size:large;font-weight:thin">' +
    content +
    "</p>";

  $done({ title: result.title, htmlMessage: content });
}

;(async () => {
  await Promise.all([
    checkIP(),
    checkGemini(),
    checkAIStudio(),
    checkAntigravity(),
    checkChatGPT(),
    checkClaude()
  ]);

  if (typeof $configuration !== "undefined" && PARAM) {
    const message = { action: "get_policy_state", content: PARAM };
    try {
      const resolve = await $configuration.sendMessage(message);
      if (resolve && resolve.ret) {
        let output = JSON.stringify(resolve.ret[message.content])
          .replace(/\"|\[|\]/g, "")
          .replace(/,/g, " ➟ ");
        render(output || PARAM);
        return;
      }
    } catch (_) {}
  }

  render(PARAM || "当前策略");
})().catch(err => {
  $done({
    title: result.title,
    htmlMessage:
      '<p style="text-align:center;font-family:-apple-system;font-size:large">🚥 检测异常</br></br>' +
      String(err) +
      "</p>"
  });
});
