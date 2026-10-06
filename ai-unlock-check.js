/*
 * Quantumult X - AI Unlock Check
 * Repo: https://github.com/czb2008126/pojie
 *
 * Checks:
 * - Gemini Web
 * - Google AI Studio
 * - Google Antigravity
 * - ChatGPT
 * - Claude
 * - Exit IP / Country / ASN
 *
 * Usage:
 * event-interaction https://raw.githubusercontent.com/czb2008126/pojie/main/ai-unlock-check.js, tag=🤖 AI解锁查询, img-url=brain.head.profile, enabled=true
 */

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

const TIMEOUT = 9000;

function request(url, opts = {}) {
  const req = {
    url,
    method: opts.method || "GET",
    headers: Object.assign({
      "User-Agent": UA,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9"
    }, opts.headers || {})
  };

  if (opts.body !== undefined) req.body = opts.body;

  return Promise.race([
    $task.fetch(req),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), TIMEOUT)
    )
  ]);
}

function flag(code) {
  if (!code || String(code).length !== 2) return "🌐";
  return String(code)
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
}

function isBlockedText(body) {
  const t = String(body || "").toLowerCase();
  const words = [
    "not available in your country",
    "not available in your region",
    "not currently available in your country",
    "not currently available in your region",
    "isn't currently supported in your country",
    "is not currently supported in your country",
    "unsupported country",
    "unsupported region",
    "this service is not available in your country",
    "此国家/地区无法使用",
    "在此国家/地区无法使用",
    "此地区无法使用",
    "暂不支持你所在的国家",
    "暂不支持你所在的地区"
  ];
  return words.some(x => t.includes(x));
}

function statusCode(resp) {
  return Number(resp && (resp.statusCode || resp.status)) || 0;
}

function good(code) {
  return code >= 200 && code < 400;
}

function result(icon, text) {
  return icon + " " + text;
}

async function getIPInfo() {
  const sources = [
    {
      url: "https://ipwho.is/",
      parse: j => ({
        ip: j.ip || "",
        country: j.country_code || "",
        countryName: j.country || "",
        city: j.city || "",
        asn: j.connection && j.connection.asn ? "AS" + j.connection.asn : "",
        org: j.connection && (j.connection.isp || j.connection.org)
          ? (j.connection.isp || j.connection.org)
          : ""
      })
    },
    {
      url: "https://ipapi.co/json/",
      parse: j => ({
        ip: j.ip || "",
        country: j.country_code || "",
        countryName: j.country_name || "",
        city: j.city || "",
        asn: j.asn || "",
        org: j.org || ""
      })
    },
    {
      url: "https://api.ip.sb/geoip",
      parse: j => ({
        ip: j.ip || "",
        country: j.country_code || "",
        countryName: j.country || "",
        city: j.city || "",
        asn: j.asn ? "AS" + j.asn : "",
        org: j.organization || j.isp || ""
      })
    }
  ];

  for (const s of sources) {
    try {
      const r = await request(s.url);
      if (!good(statusCode(r))) continue;
      const j = JSON.parse(r.body || "{}");
      const out = s.parse(j);
      if (out.ip) {
        out.country = String(out.country || "").toUpperCase();
        return out;
      }
    } catch (_) {}
  }

  return {
    ip: "Unknown",
    country: "",
    countryName: "",
    city: "",
    asn: "",
    org: ""
  };
}

async function checkGemini() {
  try {
    const r = await request("https://gemini.google.com/app");
    const code = statusCode(r);
    const body = r.body || "";

    if (isBlockedText(body)) return result("❌", "地区限制");
    if (code === 403 || code === 451) return result("❌", "受限 HTTP " + code);
    if (good(code)) return result("✅", "网页可访问");
    if (code >= 400) return result("⚠️", "HTTP " + code);
    return result("⚠️", "无法确认");
  } catch (e) {
    return result("❌", "连接失败");
  }
}

async function checkAIStudio() {
  try {
    const r = await request("https://aistudio.google.com/");
    const code = statusCode(r);
    const body = r.body || "";

    if (isBlockedText(body)) return result("❌", "地区限制");
    if (code === 403 || code === 451) return result("❌", "受限 HTTP " + code);
    if (good(code)) return result("✅", "可访问");
    if (code >= 400) return result("⚠️", "HTTP " + code);
    return result("⚠️", "无法确认");
  } catch (e) {
    return result("❌", "连接失败");
  }
}

async function checkAntigravity() {
  try {
    const r = await request("https://antigravity.google/");
    const code = statusCode(r);
    const body = r.body || "";

    if (isBlockedText(body)) return result("❌", "地区限制");
    if (code === 403 || code === 451) return result("❌", "受限 HTTP " + code);

    const t = String(body).toLowerCase();
    if (good(code) && (t.includes("antigravity") || t.includes("download"))) {
      return result("✅", "官网可访问");
    }
    if (good(code)) return result("✅", "可访问");
    if (code >= 400) return result("⚠️", "HTTP " + code);
    return result("⚠️", "无法确认");
  } catch (e) {
    return result("❌", "连接失败");
  }
}

async function checkChatGPT() {
  try {
    const r = await request("https://chatgpt.com/");
    const code = statusCode(r);
    const body = r.body || "";

    if (isBlockedText(body)) return result("❌", "地区限制");
    if (code === 403 || code === 451) return result("❌", "受限 HTTP " + code);
    if (code >= 200 && code < 500) return result("✅", "可访问");
    if (code >= 500) return result("⚠️", "HTTP " + code);
    return result("⚠️", "无法确认");
  } catch (e) {
    return result("❌", "连接失败");
  }
}

async function checkClaude() {
  try {
    const r = await request("https://claude.ai/");
    const code = statusCode(r);
    const body = r.body || "";

    if (isBlockedText(body)) return result("❌", "地区限制");
    if (code === 403 || code === 451) return result("❌", "受限 HTTP " + code);
    if (code >= 200 && code < 500) return result("✅", "可访问");
    if (code >= 500) return result("⚠️", "HTTP " + code);
    return result("⚠️", "无法确认");
  } catch (e) {
    return result("❌", "连接失败");
  }
}

(async () => {
  const ip = await getIPInfo();

  const [gemini, aiStudio, antigravity, chatgpt, claude] = await Promise.all([
    checkGemini(),
    checkAIStudio(),
    checkAntigravity(),
    checkChatGPT(),
    checkClaude()
  ]);

  const countryText =
    (ip.country ? flag(ip.country) + " " : "") +
    (ip.countryName || ip.country || "Unknown");

  let msg = "";
  msg += "━━━━━━━━━━━━━━━━━━━━\n";
  msg += "Gemini:       " + gemini + "\n\n";
  msg += "AI Studio:    " + aiStudio + "\n\n";
  msg += "Antigravity:  " + antigravity + "\n\n";
  msg += "ChatGPT:      " + chatgpt + "\n\n";
  msg += "Claude:       " + claude + "\n";
  msg += "━━━━━━━━━━━━━━━━━━━━\n";
  msg += "🌍 地区: " + countryText + "\n";
  msg += "🌐 IP: " + ip.ip + "\n";

  if (ip.city) msg += "📍 城市: " + ip.city + "\n";
  if (ip.asn || ip.org) {
    msg += "🏢 网络: " + [ip.asn, ip.org].filter(Boolean).join(" ") + "\n";
  }

  msg += "━━━━━━━━━━━━━━━━━━━━\n";
  msg += "说明：网页可访问 ≠ 已登录账号一定可用；";
  msg += "Gemini/AI Studio/Antigravity 最终权限仍可能受账号、套餐及地区策略影响。";

  // event-interaction 必须返回有效内容给 Quantumult X。
  // 如果只调用 $notify() 再 $done()，Quantumult X 会额外弹出“无有效内容”。
  $done({
    title: "🤖 AI 服务解锁查询",
    content: countryText + "\n" + msg
  });
})().catch(err => {
  $done({
    title: "🤖 AI 服务解锁查询",
    content: "❌ 检测失败\n" + String(err)
  });
});
