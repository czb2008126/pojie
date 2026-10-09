// YouTube web JSON and embedded bootstrap data. Runs locally in Quantumult X.
// ponytail: API schema changes may need new field names; unknown data passes through.
const adFields = new Set([
  'adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams',
  'adSignalsInfo', 'adsEngagementPanelContent', 'instreamAdPlayerOverlay',
  'playerLegacyDesktopWatchAdsRenderer',
]);
const adRenderers = new Set([
  'adSlotRenderer', 'displayAdRenderer', 'inFeedAdLayoutRenderer',
  'mastheadAdRenderer', 'promotedVideoRenderer', 'promotedSparklesWebRenderer',
  'promotedSparklesTextSearchRenderer', 'compactPromotedVideoRenderer',
  'promotedCarouselRenderer', 'brandVideoShelfRenderer', 'brandVideoSingletonRenderer',
]);
function isAd(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    (value.isAd === true || Object.keys(value).some(k => adRenderers.has(k)) ||
      isAd(value.richItemRenderer?.content));
}
function clean(value) {
  if (Array.isArray(value)) return value.filter(v => !isAd(v)).map(clean);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([k]) => !adFields.has(k) && !adRenderers.has(k))
    .map(([k, v]) => [k, clean(v)]));
}
function jsonEnd(text, start) {
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') depth++;
    else if ((c === '}' || c === ']') && --depth === 0) return i + 1;
  }
  return -1;
}
function rewrite(body) {
  if (typeof body !== 'string' || !body) return body;
  try { return JSON.stringify(clean(JSON.parse(body))); } catch (_) {}
  const assignments = /(?:\b(?:var\s+)?ytInitial(?:PlayerResponse|Data)|window\s*\[\s*["']ytInitial(?:PlayerResponse|Data)["']\s*\])\s*=\s*(?=\{)/g;
  const edits = [];
  for (const match of body.matchAll(assignments)) {
    const start = match.index + match[0].length, end = jsonEnd(body, start);
    if (end < 0) continue;
    try {
      const replacement = JSON.stringify(clean(JSON.parse(body.slice(start, end))))
        .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      edits.push({ start, end, replacement });
    } catch (_) {}
  }
  for (const {start, end, replacement} of edits.reverse())
    body = body.slice(0, start) + replacement + body.slice(end);
  return body;
}
if (typeof $done === 'function') $done({body: rewrite($response.body)});
if (typeof module !== 'undefined') module.exports = {rewrite};
