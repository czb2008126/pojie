/**
 * Quantumult X - AI Unlock Check V3
 * Deep node qualification checker (avoid false-green)
 *
 * Design goal:
 * - Distinguish "website reachable" from "service actually verified"
 * - Only show green when a stronger node-level signal is available
 * - Account-level availability remains UNKNOWN unless login/session auth is available
 *
 * [task_local]
 * event-interaction https://raw.githubusercontent.com/czb2008126/pojie/main/ai-unlock-check-v3.js, tag=🤖 AI深度节点检测V3, img-url=brain.head.profile, enabled=true
 */

const PARAM = (typeof $environment !== "undefined" && $environment.params) ? $environment.params : "";
const opts = PARAM ? { policy: PARAM } : {};
const optsNoRedirect = PARAM ? { policy: PARAM, redirection: false } : { redirection: false };

const result = {
  title: "    🤖  AI 深度节点检测 V3",
  Gemini: "<b>Gemini: </b>检测失败，请重试 ❗️",
  AIStudio: "<b>AI Studio: </b>检测失败，请重试 ❗️",
  Antigravity: "<b>Antigravity: </b>检测失败，请重试 ❗️",
  ChatGPT: "<b>ChatGPT: </b>检测失败，请重试 ❗️",
  Claude: "<b>Claude: </b>检测失败，请重试 ❗️",
  Region: "<b>地区: </b>未知",
  IP: "<b>出口 IP: </b>未知",
  ASN: "<b>ASN: </b>未知"
};

const GOOGLE_AI_REGION_OK = new Set([
  "US","GB","CA","AU","NZ","JP","KR","SG","MY","TH","PH","ID","VN",
  "DE","FR","IT","ES","NL","BE","SE","NO","DK","FI","IE","PT","PL",
  "AT","CH","CZ","RO","HU","GR","HR","SI","SK","EE","LV","LT","LU",
  "MX","BR","AR","CL","CO","PE","UY","ZA","IN","TW"
]);

function req(url, extra) {
  const o = Object.assign({
    url,
    opts,
    timeout: 6000,
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
    "not currently available in your country",
    "not currently available in your region",
    "unsupported country",
    "unsupported region",
    "country or region",
    "在此国家/地区无法使用",
    "此国家/地区无法使用",
    "此地区无法使用",
    "暂不支持你所在的国家",
    "暂不支持你所在的地区"
  ].some(x => t.indexOf(x) !== -1);
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

let ipInfo = {
  ip: "",
  cc: "",
  country: "",
  city: "",
  asn: "",
  org: ""
};

async function checkIP() {
  const sources = [
    "https://ipwho.is/",
    "https://ipapi.co/json/",
    "https://api.ip.sb/geoip"
  ];

  for (const url of sources) {
    try {
      const r = await req(url);
      if (!(r.statusCode >= 200 && r.statusCode < 400)) continue;
      const j = JSON.parse(r.body || "{}");

      if (url.indexOf("ipwho.is") !== -1) {
        ipInfo = {
          ip: j.ip || "",
          cc: (j.country_code || "").toUpperCase(),
          country: j.country || "",
          city: j.city || "",
          asn: j.connection && j.connection.asn ? "AS" + j.connection.asn : "",
          org: j.connection && (j.connection.isp || j.connection.org) ? (j.connection.isp || j.connection.org) : ""
        };
      } else if (url.indexOf("ipapi.co") !== -1) {
        ipInfo = {
          ip: j.ip || "",
          cc: (j.country_code || "").toUpperCase(),
          country: j.country_name || "",
          city: j.city || "",
          asn: j.asn || "",
          org: j.org || ""
        };
      } else {
        ipInfo = {
          ip: j.ip || "",
          cc: (j.country_code || "").toUpperCase(),
          country: j.country || "",
          city: j.city || "",
          asn: j.asn ? "AS" + j.asn : "",
          org: j.organization || j.isp || ""
        };
      }

      if (ipInfo.ip) break;
    } catch (_) {}
  }

  result.Region = "<b>地区: </b>" + esc((ipInfo.country || ipInfo.cc || "未知") + (ipInfo.cc ? " (" + ipInfo.cc + ")" : ""));
  result.IP = "<b>出口 IP: </b>" + esc(ipInfo.ip || "未知");
  result.ASN = "<b>ASN: </b>" + esc([ipInfo.asn, ipInfo.org].filter(Boolean).join(" ") || "未知");
}

async function checkGemini() {
  let homepageReachable = false;
  let regionBlocked = false;

  try {
    const r = await req("https://gemini.google.com/app");
    const code = Number(r.statusCode || 0);
    homepageReachable = code >= 200 && code < 400;
    regionBlocked = blocked(r.body) || code === 403 || code === 451;
  } catch (_) {}

  if (regionBlocked) {
    result.Gemini = "<b>Gemini: </b>地区受限 🚫";
    return;
  }

  if (!homepageReachable) {
    result.Gemini = "<b>Gemini: </b>连接失败 ❌";
    return;
  }

  if (GOOGLE_AI_REGION_OK.has(ipInfo.cc)) {
    result.Gemini = "<b>Gemini: </b>节点地区符合 🟡｜账号状态未验证";
  } else if (ipInfo.cc) {
    result.Gemini = "<b>Gemini: </b>网页可达，但地区资格不确定 🟡";
  } else {
    result.Gemini = "<b>Gemini: </b>网页可达，地区未知 🟡";
  }
}

async function checkAIStudio() {
  let reachable = false;
  let regionBlocked = false;

  try {
    const r = await req("https://aistudio.google.com/");
    const code = Number(r.statusCode || 0);
    reachable = code >= 200 && code < 400;
    regionBlocked = blocked(r.body) || code === 403 || code === 451;
  } catch (_) {}

  if (regionBlocked) {
    result.AIStudio = "<b>AI Studio: </b>地区受限 🚫";
    return;
  }

  if (!reachable) {
    result.AIStudio = "<b>AI Studio: </b>连接失败 ❌";
    return;
  }

  if (GOOGLE_AI_REGION_OK.has(ipInfo.cc)) {
    result.AIStudio = "<b>AI Studio: </b>节点地区符合 🟡｜账号状态未验证";
  } else {
    result.AIStudio = "<b>AI Studio: </b>网页可达，资格未验证 🟡";
  }
}

async function checkAntigravity() {
  let reachable = false;
  let regionBlocked = false;

  try {
    const r = await req("https://antigravity.google/");
    const code = Number(r.statusCode || 0);
    reachable = code >= 200 && code < 400;
    regionBlocked = blocked(r.body) || code === 403 || code === 451;
  } catch (_) {}

  if (regionBlocked) {
    result.Antigravity = "<b>Antigravity: </b>地区受限 🚫";
    return;
  }

  if (!reachable) {
    result.Antigravity = "<b>Antigravity: </b>连接失败 ❌";
    return;
  }

  if (ipInfo.cc === "US") {
    result.Antigravity = "<b>Antigravity: </b>US 节点地区符合 🟡｜账号资格未验证";
  } else if (GOOGLE_AI_REGION_OK.has(ipInfo.cc)) {
    result.Antigravity = "<b>Antigravity: </b>节点地区可能符合 🟡｜账号资格未验证";
  } else if (ipInfo.cc) {
    result.Antigravity = "<b>Antigravity: </b>网页可达，但地区资格不确定 🟡";
  } else {
    result.Antigravity = "<b>Antigravity: </b>网页可达，地区未知 🟡";
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
      result.ChatGPT = "<b>ChatGPT: </b>节点支持" + (m ? " ➟ [" + esc(m[1]) + "]" : "") + " ✅";
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
    if (blocked(r.body) || code === 403 || code === 451) {
      result.Claude = "<b>Claude: </b>地区受限 🚫";
    } else if (code >= 200 && code < 500) {
      result.Claude = "<b>Claude: </b>网页可达 🟡｜账号状态未验证";
    } else {
      result.Claude = "<b>Claude: </b>HTTP " + code + " ⚠️";
    }
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
      result.IP,
      result.ASN
    ].join("</br></br>") +
    "</br>--------------------------------------</br>" +
    "<font color=#CD5C5C><b>节点</b> ➟ " + esc(nodeText || PARAM || "当前策略") + "</font>" +
    "</br></br><font color=#999999>🟡 = 节点条件符合，但未验证账号级权限</font>";

  content =
    '<p style="text-align:center;font-family:-apple-system;font-size:large;font-weight:thin">' +
    content +
    "</p>";

  $done({ title: result.title, htmlMessage: content });
}

;(async () => {
  await checkIP();

  await Promise.all([
    checkGemini(),
    checkAIStudio(),
    checkAntigravity(),
    checkChatGPT(),
    checkClaude()
  ]);

  if (typeof $configuration !== "undefined" && PARAM) {
    try {
      const message = { action: "get_policy_state", content: PARAM };
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
      esc(String(err)) +
      "</p>"
  });
});
