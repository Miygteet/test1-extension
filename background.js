const api = globalThis.browser ?? globalThis.chrome;
const RULE_ID_START = 1000;

const DEFAULT_SETTINGS = {
  enabled: true,
  blockedDomains: [],
  disclosure: "This device uses Family Website Manager. Blocked websites are controlled by the device guardian."
};

async function getSettings() {
  const stored = await api.storage.local.get(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    blockedDomains: Array.isArray(stored.blockedDomains) ? stored.blockedDomains : []
  };
}

function normalizeDomain(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .split(/[/?#]/, 1)[0]
    .replace(/^\*\./, "")
    .replace(/^www\./, "");
}

function isValidDomain(domain) {
  return domain.length > 0 &&
    domain.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d+)?$/.test(domain) &&
    !domain.includes("..");
}

function domainRegex(domain) {
  const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^https?:\\/\\/(?:[^\\/]+\\.)?${escaped}(?:\\/|$)`;
}

async function updateBlockingRules() {
  const settings = await getSettings();
  const existing = await api.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);

  const domains = [...new Set(settings.blockedDomains.map(normalizeDomain))]
    .filter(isValidDomain)
    .slice(0, 100);

  const addRules = settings.enabled
    ? domains.map((domain, index) => ({
        id: RULE_ID_START + index,
        priority: 1,
        action: { type: "block" },
        condition: {
          regexFilter: domainRegex(domain),
          resourceTypes: ["main_frame"]
        }
      }))
    : [];

  await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  await api.storage.local.set({ blockedDomains: domains });
}

api.runtime.onInstalled.addListener(async () => {
  const current = await api.storage.local.get(DEFAULT_SETTINGS);
  await api.storage.local.set({ ...DEFAULT_SETTINGS, ...current });
  await updateBlockingRules();
});

api.runtime.onStartup.addListener(updateBlockingRules);

api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.enabled || changes.blockedDomains)) {
    updateBlockingRules().catch(console.error);
  }
});

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "refresh-rules") {
    updateBlockingRules()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "get-settings") {
    getSettings().then((settings) => sendResponse({ ok: true, settings }));
    return true;
  }
});

updateBlockingRules().catch(console.error);
