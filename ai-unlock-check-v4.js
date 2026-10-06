/**
 * Quantumult X - AI Deep Node Check V4
 * Real backend probe edition (avoid webpage false-green)
 *
 * Goal:
 * - Probe real Google AI / Antigravity backend hosts, not only websites.
 * - Never mark Gemini/Antigravity green merely because a webpage opens.
 * - Detect explicit region/location rejection when backend returns it.
 * - Distinguish backend reachability from authenticated account entitlement.
 *
 * [task_local]
 * event-interaction https://raw.githubusercontent.com/czb2008126/pojie/main/ai-unlock-check-v4.js, tag=🤖 AI深度节点检测V4, img-url=brain.head.profile, enabled=true
 */

const PARAM = (typeof $environment !== "undefined" && $environment.params) ? $environment.params : "";
const opts = PARAM ? { policy: PARAM } : {};
const optsNoRedirect = PARAM ? { policy: PARAM, redirection: false } : { redirection: false };

const result = {
  title: "    🤖  AI 深度节点检测 V4",
  GeminiWeb: "<b>Gemini Web: </b>检测失败 ❗️",
  GeminiAPI: "<b>Gemini API: </b>检测失败 ❗️",
  AntigravityWeb: "<b>Antigravity Web: </b>检测失败 ❗️",
  AntigravityDaily: "<b>Antigravity Backend: </b>检测失败 ❗️",
  AntigravityProd: "<b>Cloud Code Backend: </b>检测失败 ❗️",
  ChatGPT: "<b>ChatGPT: </b>检测失败 ❗️",
  Region: "<b>地区: </b>未知",
  IP: "<b>出口 IP: </b>未知",
  ASN: "<b>ASN: </b>未知",
  Verdict: "<b>结论: </b>未知"
};

let ipInfo = { ip: "", cc: "", country: "", asn: "", org: "" };

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function req(url, extra) {
  const base = {
    url,
    opts,
    timeout: 7000,
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9"
    }
  };
  return $task.fetch(Object.assign(base, extra || {}));
}

function codeOf(r) {
  return Number((r && (r.statusCode || r.status)) || 0);
}

function bodyOf(r) {
  return String((r && r.body) || "");
}

function lower(s) {
  return String(s || "").toLowerCase();
}

function hasLocationBlock(s) {
  const t = lower(s);
  return [
    "user location is not supported",
    "location is not supported",
    "not available in your country",
    "not available in your region",
    "unsupported country",
    "unsupported region",
    "country or region is not supported",
    "在此国家/地区无法使用",
    "此国家/地区无法使用",
    "此地区无法使用"
  ].some(x => t.includes(x));
}

function isAuthFailure(code, body) {
  const t = lower(body);
  return code === 401 ||
    (code === 403 && (
      t.includes("unauthenticated") ||
      t.includes("authentication") ||
      t.includes("credentials") ||
      t.includes("api key") ||
      t.includes("permission denied")
    ));
}

async function checkIP() {
  const sources = [
    "https://ipwho.is/",
    "https://ipapi.co/json/",
    "https://api.ip.sb/geoip"
  ];

  for (const url of sources) {
    try {
      const r = await req(url);
      if (codeOf(r) < 200 || codeOf(r) >= 400) continue;
      const j = JSON.parse(bodyOf(r) || "{}");

      if (url.includes("ipwho.is")) {
        ipInfo = {
          ip: j.ip || "",
          cc: (j.country_code || "").toUpperCase(),
          country: j.country || "",
          asn: j.connection && j.connection.asn ? "AS" + j.connection.asn : "",
          org: j.connection && (j.connection.isp || j.connection.org) ? (j.connection.isp || j.connection.org) : ""
        };
      } else if (url.includes("ipapi.co")) {
        ipInfo = {
          ip: j.ip || "",
          cc: (j.country_code || "").toUpperCase(),
          country: j.country_name || "",
          asn: j.asn || "",
          org: j.org || ""
        };
      } else {
        ipInfo = {
          ip: j.ip || "",
          cc: (j.country_code || "").toUpperCase(),
          country: j.country || "",
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

async function checkGeminiWeb() {
  try {
    const r = await req("https://gemini.google.com/app");
    const c = codeOf(r), b = bodyOf(r);
    if (hasLocationBlock(b) || c === 451) {
      result.GeminiWeb = "<b>Gemini Web: </b>明确地区受限 🚫";
    } else if (c >= 200 && c < 400) {
      result.GeminiWeb = "<b>Gemini Web: </b>网页可达 🟡";
    } else {
      result.GeminiWeb = "<b>Gemini Web: </b>HTTP " + c + " ⚠️";
    }
  } catch (_) {
    result.GeminiWeb = "<b>Gemini Web: </b>连接失败 ❌";
  }
}

async function checkGeminiAPI() {
  try {
    const r = await req("https://generativelanguage.googleapis.com/v1beta/models");
    const c = codeOf(r), b = bodyOf(r);

    if (hasLocationBlock(b)) {
      result.GeminiAPI = "<b>Gemini API: </b>后端明确地区拦截 🚫";
    } else if (isAuthFailure(c, b)) {
      result.GeminiAPI = "<b>Gemini API: </b>真实后端可达 🟡｜未认证";
    } else if (c >= 200 && c < 300) {
      result.GeminiAPI = "<b>Gemini API: </b>真实后端可达 ✅";
    } else {
      result.GeminiAPI = "<b>Gemini API: </b>HTTP " + c + " 🟡";
    }
  } catch (_) {
    result.GeminiAPI = "<b>Gemini API: </b>后端连接失败 ❌";
  }
}

async function probeAntigravity(url, labelKey, label) {
  try {
    const r = await req(url, {
      method: "POST",
      headers: {
        "User-Agent": "antigravity/1.0",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9"
      },
      body: "{}"
    });

    const c = codeOf(r), b = bodyOf(r);

    if (hasLocationBlock(b)) {
      result[labelKey] = "<b>" + label + ": </b>明确地区拦截 🚫";
      return { blocked: true, reachable: true, code: c };
    }

    if (isAuthFailure(c, b)) {
      result[labelKey] = "<b>" + label + ": </b>真实后端可达 🟡｜未认证";
      return { blocked: false, reachable: true, code: c };
    }

    if (c >= 200 && c < 300) {
      result[labelKey] = "<b>" + label + ": </b>真实后端可达 ✅";
      return { blocked: false, reachable: true, code: c };
    }

    if (c === 400) {
      const t = lower(b);
      if (t.includes("invalid argument") || t.includes("bad request") || t.includes("request")) {
        result[labelKey] = "<b>" + label + ": </b>后端已响应 🟡｜请求未认证/不完整";
        return { blocked: false, reachable: true, code: c };
      }
    }

    result[labelKey] = "<b>" + label + ": </b>HTTP " + c + " 🟡";
    return { blocked: false, reachable: c > 0, code: c };
  } catch (_) {
    result[labelKey] = "<b>" + label + ": </b>后端连接失败 ❌";
    return { blocked: false, reachable: false, code: 0 };
  }
}

async function checkAntigravityWeb() {
  try {
    const r = await req("https://antigravity.google/");
    const c = codeOf(r), b = bodyOf(r);
    if (hasLocationBlock(b) || c === 451) {
      result.AntigravityWeb = "<b>Antigravity Web: </b>明确地区受限 🚫";
    } else if (c >= 200 && c < 400) {
      result.AntigravityWeb = "<b>Antigravity Web: </b>网页可达 🟡";
    } else {
      result.AntigravityWeb = "<b>Antigravity Web: </b>HTTP " + c + " ⚠️";
    }
  } catch (_) {
    result.AntigravityWeb = "<b>Antigravity Web: </b>连接失败 ❌";
  }
}

async function checkChatGPT() {
  try {
    const r = await $task.fetch({
      url: "https://chatgpt.com/cdn-cgi/trace",
      opts: optsNoRedirect,
      timeout: 5000
    });
    const c = codeOf(r);
    if (c >= 200 && c < 400) {
      const m = bodyOf(r).match(/(?:^|\n)loc=([^\n]+)/);
      result.ChatGPT = "<b>ChatGPT: </b>节点支持" + (m ? " ➟ [" + esc(m[1]) + "]" : "") + " ✅";
    } else {
      result.ChatGPT = "<b>ChatGPT: </b>HTTP " + c + " ⚠️";
    }
  } catch (_) {
    result.ChatGPT = "<b>ChatGPT: </b>连接失败 ❌";
  }
}

function buildVerdict(geminiBlocked, antiDaily) {
  if (geminiBlocked || antiDaily.blocked) {
    result.Verdict = "<b>结论: </b>❌ 此节点存在 Google AI 地区拦截";
    return;
  }

  if (!antiDaily.reachable) {
    result.Verdict = "<b>结论: </b>❌ Antigravity 真实后端不可达";
    return;
  }

  result.Verdict =
    "<b>结论: </b>🟡 真实后端可达，未发现明确地区拦截；" +
    "是否最终可用仍需登录态/账号权限确认";
}

function render(nodeText) {
  const items = [
    result.GeminiWeb,
    result.GeminiAPI,
    result.AntigravityWeb,
    result.AntigravityDaily,
    result.AntigravityProd,
    result.ChatGPT,
    result.Region,
    result.IP,
    result.ASN,
    result.Verdict
  ];

  let content =
    "--------------------------------------</br>" +
    items.join("</br></br>") +
    "</br>--------------------------------------</br>" +
    "<font color=#CD5C5C><b>节点</b> ➟ " + esc(nodeText || PARAM || "当前策略") + "</font>" +
    "</br></br><font color=#999999>说明：🟡 表示真实后端可达，但没有账号登录凭据，不能当作最终可用证明。</font>";

  content =
    '<p style="text-align:center;font-family:-apple-system;font-size:large;font-weight:thin">' +
    content +
    "</p>";

  $done({ title: result.title, htmlMessage: content });
}

;(async () => {
  await checkIP();

  const [_, __, ___, antiDaily, antiProd] = await Promise.all([
    checkGeminiWeb(),
    checkGeminiAPI(),
    checkAntigravityWeb(),
    probeAntigravity(
      "https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent",
      "AntigravityDaily",
      "Antigravity Backend"
    ),
    probeAntigravity(
      "https://cloudcode-pa.googleapis.com/v1internal:generateContent",
      "AntigravityProd",
      "Cloud Code Backend"
    ),
    checkChatGPT()
  ]);

  const geminiBlocked =
    result.GeminiWeb.includes("地区受限") ||
    result.GeminiAPI.includes("地区拦截");

  buildVerdict(geminiBlocked, antiDaily);

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
