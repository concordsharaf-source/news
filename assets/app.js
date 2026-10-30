// =========================================================================
// Modular Newsroom App Engine — Custom Editorial Policy (lvo + Written Numbers + Strict Terms)
// =========================================================================
const GITHUB_REPO = "concordsharaf-source/news";
const memStore = {};
const SafeStorage = {
  get(key, fallback) {
    try {
      const val = window.localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return key in memStore ? memStore[key] : fallback;
    }
  },
  set(key, val) {
    memStore[key] = val;
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  },
  remove(key) {
    delete memStore[key];
    try { window.localStorage.removeItem(key); } catch (e) {}
  }
};

const ENGINES = {
  instant_free: {
    label: "🟢 مجاني فوري 100% (يعمل مباشرة بدون أي مفتاح أو تسجيل ✅)",
    models: [
      { id: "qwen-397b", name: "Qwen 3.5 Flagship 397B (الأقوى عربياً — فوري بدون مفتاح ✅)" },
      { id: "gpt-oss-120b", name: "OpenAI GPT-OSS 120B (سريع جداً — فوري بدون مفتاح ✅)" },
      { id: "qwen-3.8-27b", name: "Qwen 3.8 27B (الجيل الأحدث — فوري بدون مفتاح ✅)" },
      { id: "llama-3.3-70b", name: "Meta Llama 3.3 70B Instruct (نموذج ميتا الضخم — فوري بدون مفتاح ✅)" }
    ]
  },
  groq: {
    label: "⚡ Groq المجاني السريع (GPT-120B و Qwen 3.8 و Meta Llama — بدون بطاقة ✅)",
    models: [
      { id: "openai/gpt-oss-120b", name: "OpenAI GPT-OSS 120B (النموذج الرئيسي المعتمد على Groq — 1,000 طلب/يوم مجاناً ✅)" },
      { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B (دقة عربية عالية — 1,000 طلب/يوم مجاناً ✅)" },
      { id: "openai/gpt-oss-20b", name: "OpenAI GPT-OSS 20B (فائق السرعة 1000 كلمة/ثانية — 1,000 طلب/يوم مجاناً ✅)" },
      { id: "ovh-meta-llama-3.3-70b", name: "Meta Llama 3.3 70B Instruct (عبر خادم ميتا المفتوح المباشر ✅)" }
    ]
  },
  openrouter: {
    label: "🔀 OpenRouter المجاني (جميع النماذج المجانية المتاحة :free — يتحدث تلقائياً ✅)",
    models: [
      { id: "openrouter/free", name: "Free Models Router — الموجّه التلقائي لأفضل نموذج مجاني متاح (:free)" },
      { id: "thinkingmachines/inkling:free", name: "Thinking Machines: Inkling 1M (:free)" },
      { id: "thinkingmachines/inkling-small:free", name: "Thinking Machines: Inkling Small 1M (:free)" },
      { id: "google/gemma-4-31b-it:free", name: "Google: Gemma 4 31B (:free)" },
      { id: "google/gemma-4-26b-a4b-it:free", name: "Google: Gemma 4 26B A4B (:free)" },
      { id: "nvidia/nemotron-3.5-super-vl:free", name: "NVIDIA: Nemotron 3.5 Super (:free)" },
      { id: "nvidia/nemotron-3.5-lightning:free", name: "NVIDIA: Nemotron 3.5 Lightning (:free)" },
      { id: "dots-studio/dots-3-note-preview:free", name: "Dots Studio: Dots 3 Note 512K (:free)" },
      { id: "xingchen-agi/xing4.0-29b-a4b:free", name: "XingChen: Xing 4.0 29B (:free)" },
      { id: "recursive/flint-v1.0:free", name: "Recursive: Flint v1.0 (:free)" },
      { id: "poolside/laguna-s-2.1:free", name: "Poolside: Laguna S 2.1 (:free)" },
      { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "NVIDIA: Nemotron 3 Nano 30B (:free)" }
    ]
  },
  gemini: {
    label: "🟣 Google Gemini المجاني (يعمل باليمن بدون VPN ✅)",
    models: [
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite" },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro" }
    ]
  }
};

const FORMAT_INSTRUCTIONS = {
  lvo_standard: `التزم حرفياً بقالب الخبر الإجباري التالي سطراً بسطر دون أي عناوين إضافية أو شرح:
- السطر الأول: اسم المنطقة أو الجبهة أو الدولة فقط (مثل: قطاع غزة / الضفة الغربية / جنوب لبنان / اليمن).
- السطر الثاني: عنوان/كبشن تحريري قصير ومباشر يلخص جوهر الحدث (دون نقطة في نهايته).
- الفقرة الأولى (المقدمة): فقرة قصيرة ومباشرة تبدأ بالفعل الحدثي المبني للمعلوم وتلخص أهم ما حدث وفق الهرم المقلوب.
- الفاصل: سطر مستقل يحتوي فقط على الرمز:
lvo
- الفقرة الثانية (بعد lvo): تبدأ حرفياً بأحد الشكلين: «وأفادت مصادر إعلامية أن...» أو «وأفادت مصادر طبية أن...» (إذا كان الخبر يتعلق بالشهداء أو الجرحى) دون تكرار حرفي للمقدمة.
- الفقرة الثالثة: تبدأ حرفياً بـ: «وأضافت المصادر أن...» لأهم التفاصيل الميدانية المرتبطة مباشرة بالحدث.
- فقرة رابعة (اختيارية عند الحاجة فقط): يمكن إضافة فقرة رابعة تبدأ حرفياً بـ: «وأكدت المصادر أن...» إذا كانت هناك تفاصيل مهمة إضافية في النص الأصلي، مع حذف أي خلفيات تاريخية أو سياسية طويلة وعدم إضافة أي معلومة غير موجودة في النص.`,

  short_news: `حرر الخبر بإيجاز شديد دون فاصل lvo: السطر الأول اسم المنطقة أو الدولة فقط، السطر الثاني عنوان قصير ومباشر يلخص الحدث، يليه فقرتان قصيرتان تبدأ الأولى بالفعل الحدثي المبني للمعلوم والثانية بـ «وأفادت مصادر إعلامية/طبية أن...» مع الالتزام الكامل بكتابة الأرقام بالحروف والمصطلحات الثابتة ومنع التكرار.`,

  breaking: `صغ عنواناً تحريرياً عاجلاً ومباشراً مكوّناً من نحو عشر كلمات يلخص جوهر الحدث بأقصر وأدق العبارات مع الالتزام التام بالمصطلحات الثابتة وكتابة الأرقام بالحروف.`,

  proofread: `حافظ على النص وهيكله كما هو، ونفّذ تدقيقاً لغوياً وإملائياً ومصطلحياً صارماً فقط: حوّل أي رقم داخل الخبر إلى حروف، واكتب «مائة» ومشتقاتها بالألف دائماً، واستبدل أي مصطلح مخالف بالمصطلح المعتمد (صهيوني، استشهاد، إضافة إلى، نتيجة، مداهمة)، واحذف التواريخ والأيام والساعات والروابط وأسماء الوكالات والمراسلين والاتجاهات المركبة.`
};

const exampleFileCache = {};
let repoDefaults = { newsRules: [], tickerRules: [], dictionary: [], newsIndex: [], tickerIndex: [] };

let state = {
  newsRules: [],
  tickerRules: [],
  dictionary: [],
  localNewsExamples: SafeStorage.get("nr_local_news_ex", []),
  localTickerExamples: SafeStorage.get("nr_local_ticker_ex", []),
  learnedEdits: SafeStorage.get("nr_learned_edits_v2", { news: [], ticker: [] }),
  lastAiNewsDraft: "",
  lastAiTickerDraft: "",
  keys: SafeStorage.get("nr_keys_v1", { groq: "", openrouter: "", gemini: "", github: "" }),
  modelPrefs: SafeStorage.get("nr_model_prefs_v1", {
    primaryEngine: "", primaryModel: "",
    secondaryEngine: "", secondaryModel: "",
    tickerEngine: "", tickerModel: "",
    updatedAt: 0
  }),
  selectedFormat: "lvo_standard",
  ruleSubTab: "news",
  exSubTab: "news",
  theme: SafeStorage.get("nr_theme_v1", "light")
};

async function fetchJsonSafe(path, fallback) {
  try {
    const r = await fetch(path);
    if (!r.ok) return fallback;
    return await r.json();
  } catch (e) {
    return fallback;
  }
}

const VAULT_SALT = "MihbarahNewsroomVault2026!#Yemen";
function encodeVaultValue(plain) {
  const s = String(plain || "").trim();
  if (!s) return "";
  const rev = s.split("").reverse().join("");
  let hex = "";
  for (let i = 0; i < rev.length; i++) {
    const code = rev.charCodeAt(i) ^ VAULT_SALT.charCodeAt(i % VAULT_SALT.length) ^ ((i * 31) & 0xff);
    hex += (code & 0xff).toString(16).padStart(2, "0");
  }
  return "v1:" + hex;
}
function decodeVaultValue(enc) {
  const raw = String(enc || "").trim();
  if (!raw) return "";
  if (!raw.startsWith("v1:")) return raw;
  const hex = raw.slice(3);
  const chars = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const idx = i / 2;
    const byte = parseInt(hex.slice(i, i + 2), 16);
    const orig = byte ^ VAULT_SALT.charCodeAt(idx % VAULT_SALT.length) ^ ((idx * 31) & 0xff);
    chars.push(String.fromCharCode(orig));
  }
  return chars.reverse().join("");
}
function buildEncodedVaultObject(keysObj) {
  return {
    groq: encodeVaultValue(keysObj?.groq),
    openrouter: encodeVaultValue(keysObj?.openrouter),
    gemini: encodeVaultValue(keysObj?.gemini),
    github: encodeVaultValue(keysObj?.github),
    modelPrefs: state.modelPrefs || null,
    updatedAt: new Date().toISOString()
  };
}
function decodeVaultObject(vaultObj) {
  if (!vaultObj || typeof vaultObj !== "object") return { groq: "", openrouter: "", gemini: "", github: "", modelPrefs: null };
  return {
    groq: decodeVaultValue(vaultObj.groq),
    openrouter: decodeVaultValue(vaultObj.openrouter),
    gemini: decodeVaultValue(vaultObj.gemini),
    github: decodeVaultValue(vaultObj.github),
    modelPrefs: vaultObj.modelPrefs || null
  };
}
async function fetchLiveSharedVault(optionalToken) {
  // 1) Try GitHub Contents API first for zero-delay cross-device sync (instant even before Vercel rebuilds!)
  try {
    const headers = { "Accept": "application/vnd.github+json" };
    if (optionalToken) headers["Authorization"] = `Bearer ${optionalToken}`;
    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data/shared-keys.json?t=${Date.now()}`, { headers });
    if (ghRes.ok) {
      const meta = await ghRes.json();
      if (meta && meta.content) {
        const decodedJson = JSON.parse(decodeURIComponent(escape(atob(meta.content.replace(/\s+/g, "")))));
        return decodeVaultObject(decodedJson);
      }
    }
  } catch (e) {}
  // 2) Fallback to static file in repo/PWA cache
  const localVault = await fetchJsonSafe(`data/shared-keys.json?t=${Date.now()}`, null) || await fetchJsonSafe("data/shared-keys.json", null);
  return decodeVaultObject(localVault);
}
function updateKeysVaultStatusBadge() {
  const el = document.getElementById("keysVaultStatus");
  if (!el) return;
  const active = [];
  if (state.keys.groq) active.push("Groq ✅");
  if (state.keys.gemini) active.push("Gemini ✅");
  if (state.keys.openrouter) active.push("OpenRouter ✅");
  if (state.keys.github) active.push("مزامنة GitHub ✅");
  el.textContent = active.length
    ? `☁️ المفاتيح المحفوظة والنشطة عبر جميع أجهزتك الآن: ${active.join(" | ")}`
    : "ℹ️ لم يُحفظ مفتاح إضافي بعد (يعمل المحرك الفوري بدون مفتاح افتراضياً)";
}

async function loadExampleDetail(item) {
  if (item.raw && item.edited) return item;
  if (!item.file) return null;
  if (exampleFileCache[item.file]) return exampleFileCache[item.file];
  const full = await fetchJsonSafe(item.file, null);
  if (full) exampleFileCache[item.file] = full;
  return full;
}

async function init() {
  if (state.theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    document.getElementById("themeBtn").textContent = "☀️ نهاري";
  }

  // Load local browser keys first, then merge with shared repo vault so ANY PC/phone gets all saved keys automatically!
  const localInitialKeys = {
    groq: (state.keys.groq || "").trim(),
    openrouter: (state.keys.openrouter || "").trim(),
    gemini: (state.keys.gemini || "").trim(),
    github: (state.keys.github || "").trim()
  };

  document.getElementById("geminiKeyInput").value = localInitialKeys.gemini;
  document.getElementById("groqKeyInput").value = localInitialKeys.groq;
  document.getElementById("openrouterKeyInput").value = localInitialKeys.openrouter;
  document.getElementById("githubTokenInput").value = localInitialKeys.github;
  populateEngineSelectors();
  updateKeysVaultStatusBadge();

  const [nRules, tRules, dict, nIdx, tIdx, repoLearned, remoteVaultKeys] = await Promise.all([
    fetchJsonSafe("data/news-rules.json", []),
    fetchJsonSafe("data/ticker-rules.json", []),
    fetchJsonSafe("data/dictionary.json", []),
    fetchJsonSafe("data/news-examples/index.json", []),
    fetchJsonSafe("data/ticker-examples/index.json", []),
    fetchJsonSafe("data/learned-edits.json", { news: [], ticker: [] }),
    fetchLiveSharedVault(localInitialKeys.github)
  ]);

  // Merge shared vault keys + local keys:
  // - Cloud vault wins when populated (so updating a key on PC updates Phone too!)
  // - Local browser key fills in whenever cloud slot is still empty, then auto-uploads once!
  state.keys = {
    groq: remoteVaultKeys.groq || localInitialKeys.groq || "",
    openrouter: remoteVaultKeys.openrouter || localInitialKeys.openrouter || "",
    gemini: remoteVaultKeys.gemini || localInitialKeys.gemini || "",
    github: remoteVaultKeys.github || localInitialKeys.github || ""
  };
  SafeStorage.set("nr_keys_v1", state.keys);
  if (remoteVaultKeys.modelPrefs && (remoteVaultKeys.modelPrefs.updatedAt || 0) > (state.modelPrefs?.updatedAt || 0)) {
    state.modelPrefs = remoteVaultKeys.modelPrefs;
    SafeStorage.set("nr_model_prefs_v1", state.modelPrefs);
  }
  document.getElementById("geminiKeyInput").value = state.keys.gemini;
  document.getElementById("groqKeyInput").value = state.keys.groq;
  document.getElementById("openrouterKeyInput").value = state.keys.openrouter;
  document.getElementById("githubTokenInput").value = state.keys.github;
  populateEngineSelectors();
  updateKeysVaultStatusBadge();

  // If this device already has a local key (e.g. Groq/Gemini/OpenRouter) while the cloud slot is empty, auto-upload it immediately!
  const hasUnsyncedLocalKey =
    (localInitialKeys.groq && !remoteVaultKeys.groq) ||
    (localInitialKeys.openrouter && !remoteVaultKeys.openrouter) ||
    (localInitialKeys.gemini && !remoteVaultKeys.gemini);
  if (hasUnsyncedLocalKey && state.keys.github) {
    saveAndSyncKeysEverywhere(true);
  }

  repoDefaults = { newsRules: nRules, tickerRules: tRules, dictionary: dict, newsIndex: nIdx, tickerIndex: tIdx, learnedEdits: repoLearned };

  // Smart merge: keep user-added local rules AND adopt newly added/updated repo rules!
  const promotedOldIds = new Set(["rule-1793318458352", "rule-1793319424429"]);
  function mergeRulesSmart(repoList, localList) {
    if (!Array.isArray(localList) || !localList.length) return JSON.parse(JSON.stringify(repoList));
    const localById = new Map(localList.map(r => [r.id, r]));
    const repoIds = new Set(repoList.map(r => r.id));
    // Custom rules added locally by user (always prefixed "rule-<timestamp>") that are not yet in repoList
    const userOnlyRules = localList.filter(r => /^rule-\d+$/.test(r.id || "") && !repoIds.has(r.id) && !promotedOldIds.has(r.id));
    // Repo rules (with latest improved text, preserving user's active on/off toggle if set)
    const mergedRepo = repoList.map(r => {
      const loc = localById.get(r.id);
      const isUserCreatedId = /^rule-\d+$/.test(r.id || "");
      return {
        ...r,
        text: (isUserCreatedId && loc?.text) ? loc.text : r.text,
        active: loc !== undefined ? loc.active : r.active
      };
    });
    return [...userOnlyRules, ...mergedRepo];
  }

  function mergeDictSmart(repoDict, localDict) {
    if (!Array.isArray(localDict) || !localDict.length) return JSON.parse(JSON.stringify(repoDict));
    const seen = new Set(localDict.map(d => d.bad));
    const extraFromRepo = repoDict.filter(d => d.bad && !seen.has(d.bad));
    return [...localDict, ...extraFromRepo];
  }

  const localNewsOverride = SafeStorage.get("nr_rules_override_v2", null);
  const localTickerOverride = SafeStorage.get("nr_ticker_rules_override_v2", null);
  const localDictOverride = SafeStorage.get("nr_dict_override_v2", null);

  state.newsRules = mergeRulesSmart(nRules, localNewsOverride);
  state.tickerRules = mergeRulesSmart(tRules, localTickerOverride);
  state.dictionary = mergeDictSmart(dict, localDictOverride);
  state.learnedEdits = { news: [], ticker: [] };
  SafeStorage.remove("nr_learned_edits_v1");
  SafeStorage.set("nr_rules_override_v2", state.newsRules);
  SafeStorage.set("nr_ticker_rules_override_v2", state.tickerRules);
  SafeStorage.set("nr_dict_override_v2", state.dictionary);
  SafeStorage.set("nr_learned_edits_v2", state.learnedEdits);

  renderRules();
  renderExamples();
  renderDictionary();
  runQualityRadar();
  runTickerRadar();
  refreshLiveOpenRouterFreeModels();
}

async function refreshLiveOpenRouterFreeModels() {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models");
    if (!r.ok) return;
    const j = await r.json();
    const skipPattern = /lyria|content-safety|guard|embed|whisper|tts/i;
    const freeModels = (j.data || []).filter(m => {
      const p = m.pricing || {};
      return m.id && String(p.prompt) === "0" && String(p.completion) === "0" && !skipPattern.test(m.id);
    });
    if (freeModels.length < 3) return;

    const routerFirst = [
      { id: "openrouter/free", name: "Free Models Router — الموجّه التلقائي لأفضل نموذج مجاني (:free)" },
      ...freeModels
        .filter(m => m.id !== "openrouter/free")
        .map(m => ({ id: m.id, name: `${m.name || m.id}` }))
    ];
    ENGINES.openrouter.models = routerFirst;

    // Refresh any dropdown currently showing openrouter while preserving saved selection
    ["primary", "secondary", "ticker"].forEach(which => {
      const engEl = document.getElementById(which + "EngineSelect");
      const modEl = document.getElementById(which + "ModelSelect");
      if (engEl && modEl && engEl.value === "openrouter") {
        const prev = state.modelPrefs?.[which + "Model"] || modEl.value;
        updateModelDropdown(which, prev);
      }
    });
    refreshActiveModelBadges();
  } catch (e) {}
}

function refreshActiveModelBadges() {
  const pEng = document.getElementById("primaryEngineSelect")?.value || "";
  const pModSel = document.getElementById("primaryModelSelect");
  const pModLabel = pModSel?.options?.[pModSel.selectedIndex]?.textContent?.split("(")[0]?.trim() || pModSel?.value || "";
  const newsBadge = document.getElementById("activeModelQuickBadge");
  if (newsBadge && pModLabel) newsBadge.textContent = `🤖 النموذج النشط: ${pModLabel}`;

  const tModSel = document.getElementById("tickerModelSelect");
  const tModLabel = tModSel?.options?.[tModSel.selectedIndex]?.textContent?.split("(")[0]?.trim() || tModSel?.value || "";
  const tickerBadge = document.getElementById("activeTickerModelQuickBadge");
  if (tickerBadge && tModLabel) tickerBadge.textContent = `🤖 النموذج النشط: ${tModLabel}`;
}

let modelPrefsSyncTimer = null;
function saveSelectedModelPrefs(syncCloud = true) {
  state.modelPrefs = {
    primaryEngine: document.getElementById("primaryEngineSelect")?.value || state.modelPrefs?.primaryEngine || "",
    primaryModel: document.getElementById("primaryModelSelect")?.value || state.modelPrefs?.primaryModel || "",
    secondaryEngine: document.getElementById("secondaryEngineSelect")?.value || state.modelPrefs?.secondaryEngine || "",
    secondaryModel: document.getElementById("secondaryModelSelect")?.value || state.modelPrefs?.secondaryModel || "",
    tickerEngine: document.getElementById("tickerEngineSelect")?.value || state.modelPrefs?.tickerEngine || "",
    tickerModel: document.getElementById("tickerModelSelect")?.value || state.modelPrefs?.tickerModel || "",
    updatedAt: Date.now()
  };
  SafeStorage.set("nr_model_prefs_v1", state.modelPrefs);
  refreshActiveModelBadges();

  if (syncCloud && state.keys.github) {
    if (modelPrefsSyncTimer) clearTimeout(modelPrefsSyncTimer);
    modelPrefsSyncTimer = setTimeout(() => {
      githubPutFile(state.keys.github, "data/shared-keys.json", buildEncodedVaultObject(state.keys), "حفظ آخر نموذج مختار").catch(() => {});
    }, 2000);
  }
}

function onUserChangeEngine(which) {
  updateModelDropdown(which, "");
  saveSelectedModelPrefs(true);
}

function onUserChangeModel() {
  saveSelectedModelPrefs(true);
}

function adoptReplacementModel(slot, newEngine, newModel) {
  if (!slot || !newEngine || !newModel || !ENGINES[newEngine]) return;
  const engEl = document.getElementById(slot + "EngineSelect");
  const modEl = document.getElementById(slot + "ModelSelect");
  if (!engEl || !modEl) return;
  engEl.value = newEngine;
  updateModelDropdown(slot, newModel);
  saveSelectedModelPrefs(true);
  showToast(`⚡ انتهت حصة النموذج السابق فتم الانتقال تلقائياً إلى (${newModel}) واعتماده`);
}

function populateEngineSelectors() {
  const slots = ["primary", "secondary", "ticker"];
  const defEngine = state.keys.groq ? "groq" : "instant_free";

  slots.forEach(which => {
    const sel = document.getElementById(which + "EngineSelect");
    if (!sel) return;
    const savedEng = state.modelPrefs?.[which + "Engine"];
    const savedMod = state.modelPrefs?.[which + "Model"];

    sel.innerHTML = "";
    for (const [k, v] of Object.entries(ENGINES)) {
      sel.innerHTML += `<option value="${k}">${v.label}</option>`;
    }

    const chosenEng = (savedEng && ENGINES[savedEng]) ? savedEng : (which === "secondary" ? "instant_free" : defEngine);
    sel.value = chosenEng;
    updateModelDropdown(which, savedMod || "");

    if (!savedMod && which === "secondary") {
      const sMod = document.getElementById("secondaryModelSelect");
      if (sMod && sMod.options.length > 1) sMod.selectedIndex = 1;
    }
  });

  // Persist initial defaults if this was the very first visit
  if (!state.modelPrefs?.primaryModel) {
    saveSelectedModelPrefs(false);
  } else {
    refreshActiveModelBadges();
  }

  const banner = document.getElementById("missingKeyBanner");
  if (banner) banner.style.display = "none";
}

function saveQuickGeminiKey() {
  const val = (document.getElementById("quickGeminiKeyInput")?.value || "").trim();
  if (!val) { showToast("⚠️ الصق المفتاح أولاً"); return; }
  if (val.startsWith("gsk_")) document.getElementById("groqKeyInput").value = val;
  else if (val.startsWith("sk-or-")) document.getElementById("openrouterKeyInput").value = val;
  else document.getElementById("geminiKeyInput").value = val;
  saveApiKeys();
  showToast("✅ تم حفظ المفتاح بنجاح!");
}

async function pasteAndAuditOutput(targetId) {
  try {
    const t = await navigator.clipboard.readText();
    if (!t || !t.trim()) { showToast("⚠️ الحافظة فارغة"); return; }
    // Guard against accidentally pasting the copied prompt/rules back into the output box!
    if (/أنت (رئيس ديسك تحرير|محرر شريط إخباري)|<قواعد_التحرير_الإلزامية>|<قواعد_تحويل_النشرات/.test(t)) {
      showToast("⚠️ الحافظة تحتوي على «أمر التحرير المنسوخ» وليس النتيجة! الصقه في الموقع الخارجي أولاً ثم انسخ رده");
      return;
    }
    document.getElementById(targetId).value = t.trim();
    autoFixArabicErrors(targetId);
    if (targetId === "tickerOutput") state.lastAiTickerDraft = document.getElementById(targetId).value;
    if (targetId === "editedNewsOutput") state.lastAiNewsDraft = document.getElementById(targetId).value;
    showToast("✅ تم لصق النتيجة وتصحيح المصطلحات وفحصها بالرادار فوراً!");
  } catch (e) {
    showToast("اضغط داخل مربع المخرجات واستخدم Ctrl+V للصق ثم اضغط «✨ تصحيح»");
  }
}

function updateModelDropdown(which, preferredModelId = "") {
  const engEl = document.getElementById(which + "EngineSelect");
  const mSel = document.getElementById(which + "ModelSelect");
  if (!engEl || !mSel) return;
  const eng = engEl.value;
  const targetModel = preferredModelId || state.modelPrefs?.[which + "Model"] || "";

  mSel.innerHTML = "";
  (ENGINES[eng]?.models || []).forEach(m => {
    mSel.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });

  if (targetModel) {
    const exists = [...mSel.options].some(o => o.value === targetModel);
    if (exists) {
      mSel.value = targetModel;
    } else if (eng === "openrouter" && targetModel.includes("/")) {
      // Preserve dynamically fetched OpenRouter model even before live catalog fetch completes
      mSel.innerHTML = `<option value="${targetModel}">${targetModel}</option>` + mSel.innerHTML;
      mSel.value = targetModel;
    }
  }
  refreshActiveModelBadges();
}

function toggleCompareUI() {
  const on = document.getElementById("compareModeToggle").checked;
  document.getElementById("secondaryEngineRow").style.display = on ? "grid" : "none";
  document.getElementById("compareContainer").style.display = on ? "block" : "none";
}

// =========================================================================
// Prompt Compilers
// =========================================================================
async function getRelevantNewsExamples(cat, limit = 3) {
  const combinedMeta = [...state.localNewsExamples, ...repoDefaults.newsIndex];
  let filtered = combinedMeta;
  if (cat !== "all") {
    const m = combinedMeta.filter(ex => ex.category === cat || ex.category === "عام" || ex.category === "ميداني");
    if (m.length > 0) filtered = m;
  }
  const loaded = await Promise.all(filtered.slice(0, limit).map(loadExampleDetail));
  return loaded.filter(Boolean);
}

async function getRelevantTickerExamples(limit = 3) {
  const combinedMeta = [...state.localTickerExamples, ...repoDefaults.tickerIndex].slice(0, limit);
  const loaded = await Promise.all(combinedMeta.map(loadExampleDetail));
  return loaded.filter(Boolean);
}

async function buildEditorialPrompt(rawText) {
  const activeRules = state.newsRules.filter(r => r.active);
  const cat = /غزة|رفح|خان يونس|جباليا|النصيرات|الشجاعية|دير البلح/.test(rawText)
    ? "غزة"
    : (/الضفة|جنين|نابلس|طولكرم|الخليل|رام الله|قلقيلية|بيت لحم/.test(rawText)
      ? "الضفة"
      : (/لبنان|بيروت|البقاع|النبطية|صور|بنت جبيل/.test(rawText) ? "لبنان" : "all"));
  const extraNote = (document.getElementById("extraNote")?.value || "").trim();

  const rulesBlock = activeRules.map((r, i) => `${i + 1}. ${r.text}`).join("\n");
  const dictBlock = state.dictionary.slice(0, 35).map(d => `«${d.bad}» ⬅ «${d.good}»`).join(" | ");

  let frontHint = "";
  if (cat === "غزة") frontHint = "- تنبيه جبهة غزة: التزم تسمية «قوات العدو الصهيوني»، و«استشهاد» بدل «مقتل»، ووصف العدوان بـ «حرب الإبادة الصهيونية»، ووقف إطلاق النار بـ «هدنة هشة»، و«فلسطيني» بدل «مواطن».";
  if (cat === "الضفة") frontHint = "- تنبيه جبهة الضفة الغربية: التزم تسمية «قوات الاحتلال الصهيوني»، و«استشهاد» بدل «مقتل»، ويُمنع ذكر أسماء المعتقلين نهائياً، واستخدم «فلسطيني» بدل «مواطن»، و«مداهمة» بدل «دهم».";

  return `أنت رئيس ديسك تحرير إخباري ومدقق لغوي عربي محترف وصارم جداً.
أعد صياغة <الخبر_الخام_الجديد> صحفياً (لا تنقله حرفياً) وفق <قواعد_التحرير_الإلزامية> و<قالب_المخرج_المطلوب> بدقة كاملة دون شرح أو ملاحظات أو عناوين إضافية، ودون إضافة أي معلومات غير موجودة في النص الأصلي.

<قواعد_التحرير_الإلزامية>
${rulesBlock}
</قواعد_التحرير_الإلزامية>

<المصطلحات_الثابتة_والاختصار>
- البدائل المعتمدة: ${dictBlock}
${frontHint}
- الأرقام بالحروف داخل الخبر دائماً، وكتابة (مائة، ثلاثمائة... تسعمائة) بالألف دائماً.
- احذف التواريخ والأيام والساعات والروابط وأسماء الوكالات والمراسلين واسم المصدر الأصلي، ويُمنع استخدام (اليوم، أمس، الليلة الماضية، الأسبوع الماضي) والأشهر السريانية والاتجاهات المركبة والخلفيات الطويلة والتكرار.
</المصطلحات_الثابتة_والاختصار>

<قالب_المخرج_المطلوب>
${FORMAT_INSTRUCTIONS[state.selectedFormat]}
${extraNote ? `توجيه خاص إضافي: ${extraNote}` : ""}
</قالب_المخرج_المطلوب>

<الخبر_الخام_الجديد>
${rawText}
</الخبر_الخام_الجديد>

أخرج الآن النص النهائي المحرر الجاهز للنشر مباشرة دون أي مقدمات أو شروحات أو اعتذارات.`;
}

async function buildTickerPrompt(rawBulletin) {
  const activeRules = state.tickerRules.filter(r => r.active);
  const maxWords = parseInt(document.getElementById("tickerMaxWords").value, 10) || 25;
  const sepMode = document.getElementById("tickerSeparator").value;
  const extraNote = document.getElementById("tickerExtraNote").value.trim();

  const inputWords = rawBulletin.trim() ? rawBulletin.trim().split(/\s+/).length : 0;
  const volumeHint = inputWords >= 450
    ? "هذه نشرة كاملة: فكّك جميع أخبارها بالكامل بحيث يتراوح إجمالي الشريط بين 800 و 1000 كلمة تقريباً في رد واحد مكتمل."
    : `هذا نص قصير (${inputWords} كلمة فقط): فكّك الوقائع الموجودة فيه فقط إلى فقرات شريط واضحة (من 10 إلى ${maxWords} كلمة للفقرة) دون حشو ودون إضافة معلومات من خارجه.`;

  const rulesBlock = activeRules.map(r => `- ${r.text}`).join("\n");
  const dictBlock = state.dictionary
    .filter(d => !/مئة/.test(d.bad))
    .slice(0, 28)
    .map(d => `«${d.bad}» ⬅ «${d.good}»`)
    .join(" | ");

  const separatorInstruction = sepMode === "bitmap"
    ? `ضع بعد كل فقرة في السطر التالي مباشرة (دون أي سطر فارغ بينهما) الفاصل الحرفي: <BITMAP>E:\\NEWS\\Logo.png</BITMAP> ثم ابدأ الفقرة التالية في السطر الذي يليه مباشرة.`
    : `ضع كل فقرة في سطر مستقل وحدها دون ترقيم ودون نقطة في نهايتها.`;

  return `أنت محرر شريط إخباري تلفزيوني محترف. مهمتك الوحيدة: تحويل النص الإخباري الموجود في نهاية هذه الرسالة إلى فقرات شريط إخباري جاهزة للبث التلفزيوني.

التعليمات الإلزامية للتنفيذ (طبّقها عملياً وإياك أن تعيد كتابتها في ردك):
${rulesBlock}
- ${volumeHint}
- الطول المثالي لكل فقرة: من 10 إلى ${maxWords} كلمة تحمل معنى تاماً، وتبدأ بالفاعل متبوعاً بالفعل المضارع (مثال: وزارة الصحة تعلن... / مستوطنون يهاجمون... / قوات الاحتلال الصهيوني تعتقل 20 فلسطينياً)، وصيغ الضحايا (استشهاد رجلين / استشهاد 3 أطفال / إصابة 4 مدنيين).
- الأرقام في الشريط بالرموز دائماً (3، 15، 124) مع مسافة قبل الرقم وبعده.
- احذف رموز الإخراج (lvo، Ss، Vt، Clip، Vb، مشاهد) والنقطة في نهاية السطر، والتزم بالمصطلحات المعتمدة: (${dictBlock}).
- ${separatorInstruction}
${extraNote ? `- توجيه إضافي: ${extraNote}` : ""}

النص الإخباري المطلوب تفكيكه وتحويله إلى شريط إخباري الآن:
"""
${rawBulletin}
"""

تحذير حاسم: لا تكتب أي قاعدة أو عنوان أو مقدمة أو شرح؛ ابدأ السطر الأول فوراً بأول فقرة خبرية مستخرجة من النص أعلاه فقط:`;
}

function buildProofreaderPrompt(rawText, draftText, mode) {
  const rules = (mode === "ticker" ? state.tickerRules : state.newsRules)
    .filter(r => r.active)
    .map((r, i) => `${i + 1}. ${r.text}`)
    .join("\n");

  const modeChecks = mode === "news"
    ? `- تحقق بصرامة: هل جميع الأرقام حُوّلت إلى حروف عربية؟ هل كُتبت «مائة» ومشتقاتها بالألف؟ هل حُذفت التواريخ والأيام والساعات والروابط واسم المصدر الأصلي وعبارات (اليوم، أمس، الليلة الماضية، الأسبوع الماضي) والأشهر السريانية والاتجاهات المركبة وأسماء الوكالات والمراسلين وأسماء معتقلي الضفة؟ هل وُضع الفاصل lvo في سطره المستقل (إن كان القالب القياسي)؟ هل استُخدم «صهيوني» بدل «إسرائيلي»، و«استشهاد» بدل «مقتل»، و«فلسطيني» بدل «مواطن»، وحُذف أي تكرار أو خلفية طويلة؟`
    : `- تحقق بصرامة من قواعد الشريط: هل تبدأ كل فقرة بالفاعل أولاً متبوعاً بالفعل المضارع (وليس الماضي أو بضمير عائم مثل وأضاف/وأشار)؟ هل صيغ الضحايا بصيغة «استشهاد 3 أطفال / إصابة امرأتين»؟ هل كُتبت جميع الأرقام بالرموز الرقمية (3، 15، 124) مع مسافة قبل الرقم وبعده؟ هل حُذفت رموز الإخراج (lvo، Ss، Vt، Clip، Vb، مشاهد) والنقطة من نهاية الفقرات وعبارتا «خبر عاجل / متابعة»؟ هل وُضع الفاصل <BITMAP>E:\\NEWS\\Logo.png</BITMAP> في السطر التالي مباشرة دون أسطر فارغة؟`;

  return `أنت المدقق اللغوي والمراجع النهائي الصارم في غرفة الأخبار.
راجع <المسودة> مقارنةً بـ <النص_الخام_الأصلي> ونفّذ بدقة تامة:
1. تصحيح أي خطأ إملائي أو مطبعي أو تكرار حروف أو خطأ نحوي في التثنية والجمع والهمزات.
2. التحقق الحرفي من جميع القواعد التالية وتصويب أي سهو عنها فوراً:
${rules}
${modeChecks}
3. أخرج النسخة النهائية المصححة الجاهزة للنشر فقط دون أي شرح أو اعتذار أو مقدمات.

<النص_الخام_الأصلي>
${rawText}
</النص_الخام_الأصلي>

<المسودة>
${draftText}
</المسودة>`;
}

// =========================================================================
// Unified Model Caller (Vercel Bridge + Direct Fallback)
// =========================================================================
function extractPuterText(res) {
  if (!res) return "";
  if (typeof res === "string") return res;
  if (typeof res?.text === "string") return res.text;
  if (typeof res?.message?.content === "string") return res.message.content;
  if (Array.isArray(res?.message?.content)) return res.message.content.map(c => c?.text || "").join("");
  return String(res);
}

function stripThinkTagsClient(s) {
  return String(s || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function callDirectOvhKeylessPool(preferredRoute, promptText) {
  const allRoutes = ["qwen-397b", "gpt-oss-120b", "qwen-3.8-27b", "llama-3.3-70b"];
  const mapped = (!preferredRoute || preferredRoute === "nemotron-550b" || String(preferredRoute).includes("nvidia"))
    ? "qwen-397b"
    : (preferredRoute === "ovh-meta-llama-3.3-70b" ? "llama-3.3-70b" : preferredRoute);
  const start = allRoutes.includes(mapped) ? mapped : "qwen-397b";
  const ordered = [start, ...allRoutes.filter(x => x !== start)];

  let lastErr = null;
  for (const route of ordered) {
    try {
      const payload = {
        messages: [{ role: "user", content: promptText }],
        temperature: 0.1,
        max_tokens: 8192
      };
      if (route === "qwen-397b") { payload.model = "Qwen3.5-397B-A17B"; payload.reasoning_effort = "none"; }
      else if (route === "gpt-oss-120b") { payload.model = "gpt-oss-120b"; payload.reasoning_effort = "low"; }
      else if (route === "qwen-3.8-27b") { payload.model = "Qwen3.8-27B"; payload.reasoning_effort = "none"; }
      else { payload.model = "Meta-Llama-3_3-70B-Instruct"; }

      const r = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error?.message || d?.message || `OVH HTTP ${r.status}`);
      const txt = stripThinkTagsClient(d?.choices?.[0]?.message?.content);
      if (txt) return { text: txt, usedEngine: "instant_free", usedModel: route };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("تعذر الاتصال بالمحرك الفوري");
}

async function callDirectGroqPool(preferredModel, groqKey, promptText) {
  const retiredMap = {
    "meta-llama/llama-4-scout-17b-16e-instruct": "openai/gpt-oss-120b",
    "meta-llama/llama-4-maverick-17b-128e-instruct": "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
    "llama-3.1-8b-instant": "openai/gpt-oss-20b",
    "qwen/qwen3-32b": "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b": "qwen/qwen3.8-27b"
  };
  const pool = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
  const primary = retiredMap[preferredModel] || (preferredModel && !preferredModel.includes("llama") ? preferredModel : "openai/gpt-oss-120b");
  const candidates = [primary, ...pool.filter(m => m !== primary)];

  let lastErr = null;
  for (const targetModel of candidates) {
    const tryOnce = async (minimal) => {
      const payload = {
        model: targetModel,
        messages: [{ role: "user", content: promptText }],
        temperature: 0.1
      };
      if (!minimal) {
        payload.max_tokens = 8192;
        if (targetModel.startsWith("openai/gpt-oss-")) {
          payload.reasoning_effort = "low";
          payload.include_reasoning = false;
        } else if (targetModel.startsWith("qwen/qwen3.8")) {
          payload.reasoning_effort = "none";
        }
      }
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      return { ok: r.ok, status: r.status, d };
    };

    let res = await tryOnce(false);
    if (!res.ok && res.status === 400) res = await tryOnce(true);
    if (res.ok) {
      const txt = stripThinkTagsClient(res.d?.choices?.[0]?.message?.content);
      if (txt) return { text: txt, usedEngine: "groq", usedModel: targetModel };
    }
    if (res.status === 401) {
      throw new Error("مفتاح Groq غير صالح. اختر المحرك الأول «🟢 مجاني فوري 100%» أو تحقق من المفتاح.");
    }
    lastErr = new Error(res.d?.error?.message || `Groq HTTP ${res.status}`);
  }
  throw lastErr || new Error("تعذر الاتصال بـ Groq");
}

async function callModel(engine, model, promptText, slotName = "") {
  const apiKey = (state.keys[engine] || "").trim();
  const isStaticHost = typeof location !== "undefined" && (location.hostname.endsWith("github.io") || location.protocol === "file:");

  const finalize = (resultObj) => {
    const uEng = resultObj.usedEngine || engine;
    const uMod = resultObj.usedModel || model;
    if (slotName && (uEng !== engine || uMod !== model)) {
      adoptReplacementModel(slotName, uEng, uMod);
    }
    return stripThinkTagsClient(resultObj.text);
  };

  // 1. Try Vercel Serverless Bridge (/api/ai) when hosted on Vercel
  if (!isStaticHost) {
    try {
      const bridgeRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine, model, prompt: promptText, apiKey })
      });
      const ct = bridgeRes.headers.get("content-type") || "";
      if (bridgeRes.status !== 404 && bridgeRes.status !== 405 && bridgeRes.status !== 501 && ct.includes("application/json")) {
        const bridgeData = await bridgeRes.json();
        if (!bridgeRes.ok) throw new Error(bridgeData?.error || "خطأ من الخادم الوسيط");
        return finalize({
          text: bridgeData.text,
          usedEngine: bridgeData.usedEngine || engine,
          usedModel: bridgeData.usedModel || model
        });
      }
    } catch (bridgeErr) {
      if (bridgeErr.message && !bridgeErr.message.includes("Failed to fetch") && !bridgeErr.message.includes("Load failed") && !bridgeErr.message.includes("NetworkError")) {
        throw bridgeErr;
      }
    }
  }

  // 2. Direct Browser Execution (works on GitHub Pages & static hosts with full failover!)
  if (engine === "instant_free" || model === "ovh-meta-llama-3.3-70b" || model === "nemotron-550b") {
    try {
      const rOvh = await callDirectOvhKeylessPool(model, promptText);
      const keepGroqLlama = engine === "groq" && model === "ovh-meta-llama-3.3-70b" && rOvh.usedModel === "llama-3.3-70b";
      return finalize({
        text: rOvh.text,
        usedEngine: keepGroqLlama ? "groq" : "instant_free",
        usedModel: keepGroqLlama ? "ovh-meta-llama-3.3-70b" : rOvh.usedModel
      });
    } catch (ovhErr) {
      if (state.keys.groq) {
        return finalize(await callDirectGroqPool("openai/gpt-oss-120b", state.keys.groq, promptText));
      }
      throw ovhErr;
    }
  }

  if (!apiKey) {
    throw new Error(`يرجى اختيار المحرك الأول «🟢 مجاني فوري 100% بدون مفتاح»، أو التأكد من حفظ مفتاح ${engine.toUpperCase()} في الإعدادات.`);
  }

  if (engine === "groq") {
    try {
      return finalize(await callDirectGroqPool(model, apiKey, promptText));
    } catch (groqErr) {
      if (!String(groqErr.message || "").includes("غير صالح")) {
        return finalize(await callDirectOvhKeylessPool("qwen-397b", promptText));
      }
      throw groqErr;
    }
  }

  if (engine === "gemini") {
    async function directGemini(targetModel, useLowThinking) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const genConfig = { temperature: 0.1 };
      if (useLowThinking && targetModel.includes("3.8")) {
        genConfig.thinkingConfig = { thinkingLevel: "low" };
      }
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: genConfig })
      });
      const d = await r.json();
      return { ok: r.ok, d };
    }
    let usedGem = model;
    let res = await directGemini(model, true);
    if (!res.ok && (res.d?.error?.message || "").toLowerCase().includes("thinking")) {
      res = await directGemini(model, false);
    }
    if (!res.ok) {
      const msg = res.d?.error?.message || "";
      const m = msg.match(/models\/(gemini-[a-zA-Z0-9.-]+)/);
      if (m && m[1] && m[1] !== model) {
        res = await directGemini(m[1], true);
        if (res.ok) usedGem = m[1];
      }
    }
    if (!res.ok) throw new Error(res.d?.error?.message || "تعذر الاتصال بـ Gemini API");
    const parts = res.d?.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
    return finalize({ text, usedEngine: "gemini", usedModel: usedGem });
  }

  // OpenRouter with fallback to openrouter/free then keyless
  const orModels = [model, "openrouter/free"].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const orMod of orModels) {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: orMod, messages: [{ role: "user", content: promptText }], temperature: 0.1 })
    });
    const d = await r.json();
    if (r.ok) {
      const txt = stripThinkTagsClient(d?.choices?.[0]?.message?.content);
      if (txt) return finalize({ text: txt, usedEngine: "openrouter", usedModel: orMod });
    }
  }
  return finalize(await callDirectOvhKeylessPool("qwen-397b", promptText));
}

function cleanAiMetaText(txt) {
  return (txt || "")
    .replace(/^```[\w]*\n?/gm, "")
    .replace(/```$/gm, "")
    .replace(/\*\*/g, "")
    .trim();
}

// =========================================================================
// Workflows
// =========================================================================
async function runEditorialWorkflow() {
  const raw = document.getElementById("rawNewsInput").value.trim();
  if (!raw) { showToast("⚠️ الصق الخبر الخام أولاً"); return; }

  const btn = document.getElementById("runAiBtn");
  const compareOn = document.getElementById("compareModeToggle").checked;
  const twoStageOn = document.getElementById("twoStageToggle").checked;
  const pEng = document.getElementById("primaryEngineSelect").value;
  const pMod = document.getElementById("primaryModelSelect").value;
  const sEng = document.getElementById("secondaryEngineSelect").value;
  const sMod = document.getElementById("secondaryModelSelect").value;

  btn.disabled = true;
  document.getElementById("editedNewsOutput").value = "";
  state.lastAiNewsDraft = "";
  hideDiffBox("news");
  runQualityRadar();
  try {
    const prompt = await buildEditorialPrompt(raw);
    if (compareOn) {
      setStatus("statusBar", "statusText", "info", "⏳ جاري تحرير الخبر عبر نموذجين للمقارنة...");
      const [resA, resB] = await Promise.allSettled([callModel(pEng, pMod, prompt, "primary"), callModel(sEng, sMod, prompt, "secondary")]);
      const textA = resA.status === "fulfilled" ? cleanAiMetaText(resA.value) : `⚠️ ${resA.reason?.message}`;
      const textB = resB.status === "fulfilled" ? cleanAiMetaText(resB.value) : `⚠️ ${resB.reason?.message}`;
      document.getElementById("compOutputA").value = textA;
      document.getElementById("compOutputB").value = textB;
      if (resA.status === "fulfilled") document.getElementById("editedNewsOutput").value = textA;
      else if (resB.status === "fulfilled") document.getElementById("editedNewsOutput").value = textB;
      autoFixArabicErrors("editedNewsOutput", true);
      state.lastAiNewsDraft = document.getElementById("editedNewsOutput").value;
      runQualityRadar();
      setStatus("statusBar", "statusText", "ok", "✅ اكتملت المقارنة!");
    } else {
      setStatus("statusBar", "statusText", "info", "⏳ المرحلة 1: جاري صياغة الخبر بالقالب المعتمد...");
      let draft = cleanAiMetaText(await callModel(pEng, pMod, prompt, "primary"));
      document.getElementById("editedNewsOutput").value = draft;
      runQualityRadar();

      if (twoStageOn && state.selectedFormat !== "proofread") {
        setStatus("statusBar", "statusText", "info", "🩺 المرحلة 2: المراجعة المزدوجة...");
        const curEng = document.getElementById("primaryEngineSelect").value;
        const curMod = document.getElementById("primaryModelSelect").value;
        draft = cleanAiMetaText(await callModel(curEng, curMod, buildProofreaderPrompt(raw, draft, "news"), "primary"));
        document.getElementById("editedNewsOutput").value = draft;
      }
      autoFixArabicErrors("editedNewsOutput", true);
      state.lastAiNewsDraft = document.getElementById("editedNewsOutput").value;
      setStatus("statusBar", "statusText", "ok", "✅ تم التحرير والتدقيق وفق السياسة التحريرية بنجاح!");
    }
  } catch (err) {
    setStatus("statusBar", "statusText", "err", `⚠️ ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

async function runTickerWorkflow() {
  const raw = document.getElementById("rawBulletinInput").value.trim();
  if (!raw) { showToast("⚠️ الصق النشرة الخام أولاً"); return; }

  const btn = document.getElementById("runTickerBtn");
  const twoStage = document.getElementById("tickerTwoStage").checked;
  const pEng = (document.getElementById("tickerEngineSelect") || document.getElementById("primaryEngineSelect")).value;
  const pMod = (document.getElementById("tickerModelSelect") || document.getElementById("primaryModelSelect")).value;

  btn.disabled = true;
  // Clear previous ticker immediately when starting a new one!
  document.getElementById("tickerOutput").value = "";
  state.lastAiTickerDraft = "";
  hideDiffBox("ticker");
  runTickerRadar();
  try {
    setStatus("tickerStatusBar", "tickerStatusText", "info", "⏳ جاري تفكيك النشرة إلى نص شريط إخباري جاهز للنسخ...");
    const prompt = await buildTickerPrompt(raw);
    let tickerDraft = normalizeTickerLines(cleanAiMetaText(await callModel(pEng, pMod, prompt, "ticker")));
    document.getElementById("tickerOutput").value = tickerDraft;
    runTickerRadar();

    if (twoStage) {
      setStatus("tickerStatusBar", "tickerStatusText", "info", "🩺 المرحلة 2: المراجعة المزدوجة للشريط...");
      const curTEng = (document.getElementById("tickerEngineSelect") || document.getElementById("primaryEngineSelect")).value;
      const curTMod = (document.getElementById("tickerModelSelect") || document.getElementById("primaryModelSelect")).value;
      tickerDraft = normalizeTickerLines(cleanAiMetaText(await callModel(curTEng, curTMod, buildProofreaderPrompt(raw, tickerDraft, "ticker"), "ticker")));
      document.getElementById("tickerOutput").value = tickerDraft;
    }
    autoFixArabicErrors("tickerOutput", true);
    state.lastAiTickerDraft = document.getElementById("tickerOutput").value;
    setStatus("tickerStatusBar", "tickerStatusText", "ok", "✅ تم استخراج الشريط النصي! يمكنك نسخه مباشرة أو تعديله وحفظ التعديلات ليتعلم منها النموذج.");
  } catch (err) {
    setStatus("tickerStatusBar", "tickerStatusText", "err", `⚠️ ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

const TICKER_BITMAP_TAG = "<BITMAP>E:\\NEWS\\Logo.png</BITMAP>";

function toWesternDigitsAndSpaced(line) {
  const arNums = "٠١٢٣٤٥٦٧٨٩";
  let s = line.replace(/[٠-٩]/g, d => String(arNums.indexOf(d)));

  // Convert standalone written cardinal numbers to digits for Ticker Rule 8 (preserving words like "واحدة" or "عشرات")
  const wordToNum = [
    ["أحد عشر", "11"], ["احد عشر", "11"], ["إحدى عشرة", "11"],
    ["اثنا عشر", "12"], ["اثني عشر", "12"], ["اثنتا عشرة", "12"], ["اثنتي عشرة", "12"],
    ["ثلاثة عشر", "13"], ["ثلاث عشرة", "13"], ["أربعة عشر", "14"], ["أربع عشرة", "14"],
    ["خمسة عشر", "15"], ["خمس عشرة", "15"], ["ستة عشر", "16"], ["ست عشرة", "16"],
    ["سبعة عشر", "17"], ["سبع عشرة", "17"], ["ثمانية عشر", "18"], ["ثماني عشرة", "18"],
    ["تسعة عشر", "19"], ["تسع عشرة", "19"],
    ["عشرون", "20"], ["عشرين", "20"], ["ثلاثون", "30"], ["ثلاثين", "30"],
    ["أربعون", "40"], ["أربعين", "40"], ["خمسون", "50"], ["خمسين", "50"],
    ["ستون", "60"], ["ستين", "60"], ["سبعون", "70"], ["سبعين", "70"],
    ["ثمانون", "80"], ["ثمانين", "80"], ["تسعون", "90"], ["تسعين", "90"],
    ["ثلاثة", "3"], ["ثلاث", "3"], ["أربعة", "4"], ["أربع", "4"],
    ["خمسة", "5"], ["خمس", "5"], ["ستة", "6"], ["سبعة", "7"], ["سبع", "7"],
    ["ثمانية", "8"], ["ثماني", "8"], ["تسعة", "9"], ["تسع", "9"], ["عشرة", "10"]
  ];
  wordToNum.forEach(([w, num]) => {
    const re = new RegExp(`(^|\\s)${w}(?=\\s+[أ-ي])`, "g");
    s = s.replace(re, `$1${num}`);
  });

  // Ensure space before and after numbers inside sentence ("استشهاد 5 مدنيين")
  s = s.replace(/([^\s\d("«\-])(\d+)/g, "$1 $2");
  s = s.replace(/(\d+)([^\s\d)"».,%:\-])/g, "$1 $2");
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

function extractPureTickerParagraphs(txt) {
  const tvCueExact = /^(lvo|ss|ss\s*-\s*lvo|vt|clip|vb|مشاهد|\[مشاهد\]|\(مشاهد\))$/i;
  const leakedRuleLine = /^(<\/?قواعد|<\/?ضوابط|<\/?تنسيق|<\/?النشرة|<\/?أمثلة|الهدف العام\s*:|حجم الشريط\s*:|طريقة التفكيك|طول الفقرة|الفاعل أولاً\s*:|تفكيك التصريحات\s*:|قاعدة المتحدث العسكري|الأرقام بالرموز دائماً|صيغ الشهداء والجرحى\s*:|المصطلحات الثابتة المعتمدة|ضوابط الترقيم والشكل|تجاهل وحذف عناصر الإخراج|الفاصل الإجباري للبث|الأسلوب الخبري الصرف|التعليمات الإلزامية للتنفيذ|تحذير حاسم\s*:|أنت محرر شريط إخباري)/i;
  return String(txt || "")
    .replace(/&lt;BITMAP&gt;.*?&lt;\/BITMAP&gt;/gi, "")
    .replace(/<BITMAP>.*?<\/BITMAP>/gi, "")
    .split(/\n+/)
    .map(rawLine => {
      let l = rawLine
        .replace(/^[\s\-*•]+/, "")
        .replace(/^\d+\s*[\-.)]+\s*/, "")
        .replace(/^(خبر عاجل|عاجل|متابعة)\s*[:\-–—]?\s*/i, "")
        .replace(/\b(Ss\s*-\s*lvo|lvo|Vt|Clip|Vb)\b/gi, "")
        .replace(/\.+\s*$/, "")
        .trim();
      if (!l || tvCueExact.test(l) || leakedRuleLine.test(l)) return "";
      return toWesternDigitsAndSpaced(l);
    })
    .filter(Boolean);
}

function formatPureTickerItems(items, sepOverride) {
  if (!items.length) return "";
  const mode = sepOverride || document.getElementById("tickerSeparator")?.value || "bitmap";
  if (mode === "bitmap") {
    return items.map(p => `${p}\n${TICKER_BITMAP_TAG}`).join("\n");
  }
  if (mode === "bullet") return items.map(l => `• ${l}`).join("\n");
  if (mode === "dash") return items.map(l => `- ${l}`).join("\n");
  if (mode === "inline") return items.join("  •  ");
  return items.join("\n");
}

function normalizeTickerLines(txt) {
  return formatPureTickerItems(extractPureTickerParagraphs(txt));
}

function handleTickerSeparatorChange() {
  const el = document.getElementById("tickerOutput");
  const items = extractPureTickerParagraphs(el.value);
  if (items.length) {
    el.value = formatPureTickerItems(items);
  }
  runTickerRadar();
}

async function runSecondPassProofreadOnly(mode) {
  const isTicker = mode === "ticker";
  const raw = document.getElementById(isTicker ? "rawBulletinInput" : "rawNewsInput").value.trim();
  const outId = isTicker ? "tickerOutput" : "editedNewsOutput";
  const draft = document.getElementById(outId).value.trim();
  if (!draft) { showToast("⚠️ لا يوجد نص لتدقيقه!"); return; }

  const pEng = (isTicker ? document.getElementById("tickerEngineSelect") : document.getElementById("primaryEngineSelect")).value;
  const pMod = (isTicker ? document.getElementById("tickerModelSelect") : document.getElementById("primaryModelSelect")).value;
  const barId = isTicker ? "tickerStatusBar" : "statusBar";
  const txtId = isTicker ? "tickerStatusText" : "statusText";

  try {
    setStatus(barId, txtId, "info", "🩺 جاري التدقيق اللغوي والمصطلحي الصارم...");
    let fixed = cleanAiMetaText(await callModel(pEng, pMod, buildProofreaderPrompt(raw || draft, draft, mode)));
    if (isTicker) fixed = normalizeTickerLines(fixed);
    document.getElementById(outId).value = fixed;
    isTicker ? runTickerRadar() : runQualityRadar();
    setStatus(barId, txtId, "ok", "✅ تمت المراجعة اللغوية والمصطلحية!");
  } catch (err) {
    setStatus(barId, txtId, "err", `⚠️ ${err.message}`);
  }
}

// =========================================================================
// Post-Edit Revision Note + 1-Click Save as Permanent Rule
// =========================================================================
function buildRevisionPrompt(rawText, currentDraft, revisionNote, mode) {
  const isTicker = mode === "ticker";
  const activeRules = (isTicker ? state.tickerRules : state.newsRules)
    .filter(r => r.active)
    .map((r, i) => `${i + 1}. ${r.text}`)
    .join("\n");
  const dictRules = state.dictionary
    .map(d => `- يُمنع «${d.bad}» ⬅ المعتمد «${d.good}»`)
    .join("\n");

  const structureHint = isTicker
    ? "حافظ على صيغة فقرات الشريط الإخباري (كل فقرة مستقلة المعنى في سطر منفصل بدون ترقيم أو نقاط في نهاية السطر)."
    : (FORMAT_INSTRUCTIONS[state.selectedFormat] || FORMAT_INSTRUCTIONS.lvo_standard);

  return `أنت كبير محرري غرفة أخبار تلفزيونية عربية. لديك ${isTicker ? "شريط إخباري محرر" : "خبر محرر"} جاهز، وطلب رئيس التحرير تعديلاً محدداً عليه.

🔴 التعديل المطلوب تنفيذه فوراً وبحرفية تامة:
«${revisionNote}»

ضوابط التنفيذ الإلزامية:
1. نفّذ التعديل المطلوب أعلاه بدقة كاملة على النص المحرر الحالي.
2. حافظ تماماً على الهيكل والقالب المعتمد:
${structureHint}
3. التزم بكتابة جميع الأرقام بالحروف («مائة» ومشتقاتها بالألف دائماً) وبكافة القواعد المعتمدة:
${activeRules}

قاموس المصطلحات الثابتة الإلزامية:
${dictRules}

${rawText ? `النص الخام الأصلي (للرجوع للمعلومات عند الحاجة فقط):\n"""\n${rawText}\n"""\n` : ""}النص المحرر الحالي المطلوب تعديله:
"""
${currentDraft}
"""

أخرج النص النهائي المعدّل فقط جاهزاً للبث المباشر دون أي مقدمات أو شروحات أو علامات اقتباس.`;
}

async function addNoteToRuleStore(noteText, category, mode) {
  const cleanNote = noteText.trim();
  if (!cleanNote) return false;
  const targetList = mode === "ticker" ? state.tickerRules : state.newsRules;
  const alreadyExists = targetList.some(r => (r.text || "").trim() === cleanNote);
  if (!alreadyExists) {
    targetList.unshift({
      id: "rule-" + Date.now(),
      category: category || "مصطلحات وصياغة",
      active: true,
      text: cleanNote
    });
    persistRules();
  }
  const token = (state.keys.github || "").trim();
  if (token) {
    try {
      const filePath = mode === "ticker" ? "data/ticker-rules.json" : "data/news-rules.json";
      await githubPutFile(token, filePath, targetList, `إضافة قاعدة جديدة من نافذة التحرير: ${cleanNote.slice(0, 50)}`);
      return "synced";
    } catch (e) {
      return "local";
    }
  }
  return alreadyExists ? "exists" : "local";
}

async function saveRevisionNoteAsRuleOnly(mode) {
  const isTicker = mode === "ticker";
  const noteInput = document.getElementById(isTicker ? "tickerRevisionNote" : "newsRevisionNote");
  const catInput = document.getElementById(isTicker ? "tickerRevisionCategory" : "newsRevisionCategory");
  const note = (noteInput?.value || "").trim();
  if (!note) {
    showToast("⚠️ اكتب الملاحظة أو القاعدة في الخانة أولاً!");
    return;
  }
  const res = await addNoteToRuleStore(note, catInput?.value || "مصطلحات وصياغة", mode);
  noteInput.value = "";
  if (res === "synced") {
    showToast("✅ أُضيفت القاعدة وحُفظت تلقائياً في مستودع GitHub أيضاً!");
  } else if (res === "exists") {
    showToast("ℹ️ هذه القاعدة موجودة مسبقاً ضمن قواعدك النشطة");
  } else {
    showToast("✅ أُضيفت كقاعدة دائمة! ستُطبّق تلقائياً في كل الأخبار القادمة (اضغط ☁️ لحفظها في GitHub)");
  }
}

async function applyRevisionNote(mode, saveAsRule) {
  const isTicker = mode === "ticker";
  const outId = isTicker ? "tickerOutput" : "editedNewsOutput";
  const rawId = isTicker ? "rawBulletinInput" : "rawNewsInput";
  const noteId = isTicker ? "tickerRevisionNote" : "newsRevisionNote";
  const catId = isTicker ? "tickerRevisionCategory" : "newsRevisionCategory";
  const barId = isTicker ? "tickerStatusBar" : "statusBar";
  const txtId = isTicker ? "tickerStatusText" : "statusText";
  const btnA = document.getElementById(isTicker ? "applyTickerRevAndRuleBtn" : "applyNewsRevAndRuleBtn");
  const btnB = document.getElementById(isTicker ? "applyTickerRevOnlyBtn" : "applyNewsRevOnlyBtn");

  const currentDraft = document.getElementById(outId).value.trim();
  const rawText = document.getElementById(rawId).value.trim();
  const note = (document.getElementById(noteId)?.value || "").trim();
  const category = document.getElementById(catId)?.value || "مصطلحات وصياغة";

  if (!currentDraft) {
    showToast(isTicker ? "⚠️ لا يوجد شريط محرر لتعديله بعد!" : "⚠️ حرّر الخبر أولاً أو الصقه في مربع الخبر المحرر لتعديله!");
    return;
  }
  if (!note) {
    showToast("⚠️ اكتب ملاحظة التعديل المطلوب أولاً!");
    return;
  }

  const pEng = (isTicker ? document.getElementById("tickerEngineSelect") : document.getElementById("primaryEngineSelect")).value;
  const pMod = (isTicker ? document.getElementById("tickerModelSelect") : document.getElementById("primaryModelSelect")).value;

  if (btnA) btnA.disabled = true;
  if (btnB) btnB.disabled = true;

  try {
    let ruleStatus = null;
    if (saveAsRule) {
      ruleStatus = await addNoteToRuleStore(note, category, mode);
    }

    setStatus(barId, txtId, "info", "✏️ جاري تعديل النص وفق ملاحظتك بدقة مع الحفاظ على القالب والمصطلحات...");
    const prompt = buildRevisionPrompt(rawText, currentDraft, note, mode);
    let updated = cleanAiMetaText(await callModel(pEng, pMod, prompt));
    if (isTicker) updated = normalizeTickerLines(updated);

    document.getElementById(outId).value = updated;
    autoFixArabicErrors(outId, true);
    document.getElementById(noteId).value = "";

    if (saveAsRule) {
      const syncMsg = ruleStatus === "synced"
        ? "✅ تم تعديل النص بنجاح + اعتماد الملاحظة كقاعدة دائمة وحفظها في GitHub!"
        : "✅ تم تعديل النص بنجاح + اعتماد الملاحظة كقاعدة دائمة لكل الأخبار القادمة!";
      setStatus(barId, txtId, "ok", syncMsg);
      showToast(syncMsg);
    } else {
      setStatus(barId, txtId, "ok", "✅ تم تطبيق ملاحظة التعديل على النص بنجاح!");
      showToast("✅ تم تعديل النص وفق ملاحظتك!");
    }
  } catch (err) {
    setStatus(barId, txtId, "err", `⚠️ ${err.message}`);
  } finally {
    if (btnA) btnA.disabled = false;
    if (btnB) btnB.disabled = false;
  }
}

function hideDiffBox(mode) {
  const el = document.getElementById(mode === "ticker" ? "tickerDiffLearnBox" : "newsDiffLearnBox");
  if (el) { el.style.display = "none"; el.innerHTML = ""; }
}

function captureInitialPasteDraft(mode) {
  const isTicker = mode === "ticker";
  const outEl = document.getElementById(isTicker ? "tickerOutput" : "editedNewsOutput");
  if (!outEl) return;
  const wasEmpty = !outEl.value.trim();
  const hadBaseline = isTicker ? !!state.lastAiTickerDraft : !!state.lastAiNewsDraft;
  if (wasEmpty || !hadBaseline) {
    setTimeout(() => {
      const val = outEl.value.trim();
      if (!val) return;
      if (isTicker && !state.lastAiTickerDraft) state.lastAiTickerDraft = val;
      if (!isTicker && !state.lastAiNewsDraft) state.lastAiNewsDraft = val;
    }, 60);
  }
}

function computeWordDiffHtml(beforeStr, afterStr) {
  const a = String(beforeStr || "").trim().split(/\s+/).filter(Boolean);
  const b = String(afterStr || "").trim().split(/\s+/).filter(Boolean);
  if (!a.length) {
    return { beforeHtml: `<span class="muted-note">(فقرة مضافة من المحرر)</span>`, afterHtml: `<span class="diff-add">${escapeHtml(afterStr)}</span>` };
  }
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const beforeParts = [];
  const afterParts = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      beforeParts.push(escapeHtml(a[i]));
      afterParts.push(escapeHtml(b[j]));
      i++; j++;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      afterParts.push(`<span class="diff-add">${escapeHtml(b[j])}</span>`);
      j++;
    } else {
      beforeParts.push(`<span class="diff-del">${escapeHtml(a[i])}</span>`);
      i++;
    }
  }
  return { beforeHtml: beforeParts.join(" "), afterHtml: afterParts.join(" ") };
}

async function distillAbstractRulesWithAI(mode, comparisonMaterial) {
  const isTicker = mode === "ticker";
  const targetList = isTicker ? state.tickerRules : state.newsRules;
  const existingSummary = targetList.filter(r => r.active).slice(0, 20).map(r => `- ${r.text}`).join("\n");
  const eng = (isTicker ? document.getElementById("tickerEngineSelect")?.value : document.getElementById("primaryEngineSelect")?.value) || "instant_free";
  const mod = (isTicker ? document.getElementById("tickerModelSelect")?.value : document.getElementById("primaryModelSelect")?.value) || "qwen-397b";

  const prompt = `أنت خبير في استخلاص السياسات والأنماط التحريرية لغرف الأخبار.
ادرس المادة التالية المأخوذة من عمل المحرر في قسم (${isTicker ? "الشريط الإخباري" : "تحرير الأخبار"})، واستخلص منها فقط **النمط والأسلوب والقواعد التحريرية العامة** التي اعتمدها المحرر دون حفظ النص حرفياً:

${comparisonMaterial}

<قواعد_موجودة_مسبقاً_تجنب_تكرارها>
${existingSummary}
</قواعد_موجودة_مسبقاً_تجنب_تكرارها>

شروط صارمة جداً للإخراج:
1. استخرج من 1 إلى 3 قواعد أسلوبية/تحريرية جديدة ومختصرة جداً (لا تتجاوز كل قاعدة 20 كلمة).
2. يُمنع منعاً باتاً حفظ النص حرفياً أو ذكر أسماء أشخاص أو مناطق أو أرقام أو وقائع خاصة بالخبر في القاعدة المستخلصة! صغها كقاعدة نمطية عامة ومجردة تصلح لكل الأخبار اللاحقة لتخفيف حجم الأمر على النماذج.
3. إذا كانت جميع الملاحظات مغطاة حرفياً في القواعد الموجودة مسبقاً، أخرج قاعدة واحدة مكثفة تؤكد أدق فرق أسلوبي لاحظته.
4. أخرج القواعد فقط، كل قاعدة في سطر مستقل يبدأ بـ (- ) دون أي عناوين أو مقدمات أو شروحات.`;

  const aiResp = cleanAiMetaText(await callModel(eng, mod, prompt));
  const extracted = aiResp
    .split(/\n+/)
    .map(l => l.replace(/^[\s\-*•\d.)(]+/, "").trim())
    .filter(l => l.length >= 10 && l.length <= 220 && !/^<?قواعد|^شروط|^المادة/i.test(l))
    .slice(0, 3);

  const addedRules = [];
  extracted.forEach((ruleText, idx) => {
    const alreadyExists = targetList.some(r => r.text.trim() === ruleText);
    if (!alreadyExists) {
      const ruleObj = {
        id: "rule-" + (Date.now() + idx),
        category: "نمط مستلهم",
        active: true,
        text: ruleText
      };
      targetList.unshift(ruleObj);
      addedRules.push(ruleText);
    }
  });

  if (addedRules.length > 0) {
    persistRules();
    const token = (state.keys.github || "").trim();
    if (token) {
      const filePath = isTicker ? "data/ticker-rules.json" : "data/news-rules.json";
      try {
        await githubPutFile(token, filePath, targetList, "إضافة قواعد نمط وأسلوب مستلهمة (دون حفظ أمثلة حرفية)");
      } catch (e) {}
    }
  }
  return addedRules;
}

function renderDiffLearnBox(mode, newLessons, distilledRules, noChangeDetected) {
  const isTicker = mode === "ticker";
  const boxId = isTicker ? "tickerDiffLearnBox" : "newsDiffLearnBox";
  const box = document.getElementById(boxId);
  if (!box) return;
  const bucket = isTicker ? "ticker" : "news";

  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
      <strong style="font-size:0.9rem; color:var(--ok);">
        ${noChangeDetected
          ? "ℹ️ لم يُرصد فرق جديد بعد — عدّل داخل النص أعلاه ثم اضغط «مقارنة التعديلات»"
          : `✅ تمت مقارنة تعديلاتك واستلهام النمط التحريري منها دون حفظ النص حرفياً!`}
      </strong>
      <button class="btn btn-outline btn-sm" style="padding:3px 9px; font-size:0.76rem;" onclick="hideDiffBox('${bucket}')">✖ إخفاء</button>
    </div>
  `;

  if (Array.isArray(distilledRules) && distilledRules.length > 0) {
    html += `
      <div class="diff-card" style="border-color:var(--ok); background:var(--ok-soft);">
        <div style="font-weight:800; color:var(--ok); margin-bottom:4px;">🧠 القواعد والأنماط الأسلوبية المستلهمة المضافة تلقائياً للسياسة التحريرية:</div>
        ${distilledRules.map(r => `<div style="margin-top:3px;">• ${escapeHtml(r)}</div>`).join("")}
      </div>
    `;
  }

  if (newLessons.length > 0) {
    html += `<div class="muted-note" style="margin-top:8px;">🔎 <strong>معاينة الفروق التي استُلهم منها النمط (تُعرض للمعاينة فقط ولا تُحفظ حرفياً):</strong></div>`;
    html += newLessons.slice(0, 6).map(item => {
      const diff = computeWordDiffHtml(item.before, item.after);
      return `
        <div class="diff-card">
          ${item.before ? `<div class="diff-row-before">🔴 <strong>قبل التعديل:</strong> ${diff.beforeHtml}</div>` : ""}
          <div class="diff-row-after">🟢 <strong>بعد تعديلك:</strong> ${diff.afterHtml}</div>
        </div>
      `;
    }).join("");
  }

  box.innerHTML = html;
  box.style.display = "block";
}

async function saveManualEditsForLearning(mode) {
  const isTicker = mode === "ticker";
  const outId = isTicker ? "tickerOutput" : "editedNewsOutput";
  const currentVal = document.getElementById(outId).value.trim();
  if (!currentVal) {
    showToast(isTicker ? "⚠️ خانة الشريط المخرج فارغة!" : "⚠️ خانة الخبر المحرر فارغة!");
    return;
  }

  const prevVal = isTicker ? (state.lastAiTickerDraft || "") : (state.lastAiNewsDraft || "");
  const extractLines = (txt) => isTicker
    ? extractPureTickerParagraphs(txt)
    : txt.split(/\n+/).map(l => l.trim()).filter(l => l && !/^lvo$/i.test(l));

  const oldLines = extractLines(prevVal);
  const newLines = extractLines(currentVal);

  const newLessons = [];
  if (oldLines.length > 0) {
    const oldExactSet = new Set(oldLines);
    const candidateOld = oldLines.filter(l => !newLines.includes(l));
    const usedOldIdx = new Set();
    const tokenize = (s) => s.split(/\s+/).filter(w => w.length > 1);

    for (const afterLine of newLines) {
      if (oldExactSet.has(afterLine)) continue;
      const afterTokens = new Set(tokenize(afterLine));
      let bestIdx = -1;
      let bestScore = 0;
      candidateOld.forEach((beforeLine, idx) => {
        if (usedOldIdx.has(idx)) return;
        const bTokens = tokenize(beforeLine);
        if (!bTokens.length || !afterTokens.size) return;
        const shared = bTokens.filter(t => afterTokens.has(t)).length;
        const score = shared / Math.min(bTokens.length, afterTokens.size);
        if (score > bestScore) { bestScore = score; bestIdx = idx; }
      });
      if (bestIdx !== -1 && bestScore >= 0.3) {
        usedOldIdx.add(bestIdx);
        newLessons.push({ before: candidateOld[bestIdx], after: afterLine });
      } else if (afterLine.split(/\s+/).length >= 5) {
        newLessons.push({ before: "", after: afterLine });
      }
    }

    if (newLessons.length === 0 && currentVal === prevVal.trim()) {
      renderDiffLearnBox(mode, [], [], true);
      showToast("ℹ️ عدّل النص أولاً داخل الخانة ثم اضغط «مقارنة التعديلات» لاستلهام النمط من تعديلك");
      return;
    }
  }

  if (newLessons.length === 0) {
    newLines.slice(0, 4).forEach(line => {
      if (line.split(/\s+/).length >= 5) newLessons.push({ before: "", after: line });
    });
  }

  // Show immediate diff preview while AI distills abstract rules (without saving verbatim text!)
  renderDiffLearnBox(mode, newLessons, ["⏳ جاري استلهام القاعدة والأسلوب التحريري العام من تعديلاتك دون حفظ النص حرفياً..."], false);

  try {
    const pairsText = newLessons.slice(0, 8).map((p, i) =>
      p.before ? `${i + 1}) قبل التعديل: «${p.before}» ⬅ بعد تعديل المحرر: «${p.after}»` : `${i + 1}) صياغة المحرر المعتمدة: «${p.after}»`
    ).join("\n");
    const addedRules = await distillAbstractRulesWithAI(mode, pairsText);
    if (isTicker) state.lastAiTickerDraft = currentVal;
    else state.lastAiNewsDraft = currentVal;
    renderDiffLearnBox(mode, newLessons, addedRules.length ? addedRules : ["تم تأكيد توافق النمط مع القواعد المفعّلة لديك دون الحاجة لإضافة نص مكرر"], false);
    showToast(`🧠 تم استلهام (${addedRules.length || 1}) قاعدة أسلوبية خفيفة من تعديلاتك دون حفظ النص حرفياً!`);
  } catch (err) {
    renderDiffLearnBox(mode, newLessons, [], false);
    showToast(`⚠️ تعذر استلهام النمط تلقائياً: ${err.message}`);
  }
}

// =========================================================================
// Strict Policy Radar (Tailored 100% to User's Editorial Rules!)
// =========================================================================
function scanPolicyViolations(text) {
  const issues = [];

  // 1. Dictionary & Fixed Terms check
  state.dictionary.forEach(item => {
    if (item.bad && text.includes(item.bad)) {
      issues.push({ type: "err", msg: `ممنوع «${item.bad}» ⬅ المعتمد: «${item.good}»` });
    }
  });

  // 2. Forbidden Temporal Words (اليوم، أمس، الليلة الماضية، الأسبوع الماضي)
  const forbiddenTimes = ["اليوم", "أمس", "امس", "الليلة الماضية", "الأسبوع الماضي", "الاسبوع الماضي"];
  forbiddenTimes.forEach(w => {
    const re = new RegExp(`(^|[\\s،.:؛«"(])${w}(?=[\\s،.:؛»")!]|$)`, "g");
    if (re.test(text)) {
      issues.push({ type: "err", msg: `ظرف زمني ممنوع: «${w}» (استخدم: في وقت سابق / خلال الساعات الماضية)` });
    }
  });

  // 3. Forbidden Compound Directions (شمال شرق / جنوب غرب...)
  const compDirs = ["شمال شرق", "شمال غرب", "جنوب شرق", "جنوب غرب", "شمالي شرق", "شمالي غرب", "جنوبي شرق", "جنوبي غرب"];
  compDirs.forEach(d => {
    if (text.includes(d)) issues.push({ type: "err", msg: `اتجاه جغرافي مركب ممنوع: «${d}»` });
  });

  // 4. Palestinian context check: forbid "مواطن / مواطنين", enforce "استشهاد" instead of "مقتل", & Gaza/WestBank force naming
  const isPal = /(غزة|الضفة|القدس|فلسطين|جنين|نابلس|طولكرم|الخليل|رام الله|رفح|خان يونس|جباليا|النصيرات)/.test(text);
  if (isPal && /(^|\s)(مواطن|مواطنان|مواطنين|مواطنون|المواطنين)(?=[\s،.:؛]|$)/.test(text)) {
    issues.push({ type: "err", msg: `في الأخبار الفلسطينية نكتب «فلسطيني/فلسطينيين» وليس «مواطن»!` });
  }
  if (isPal && /(^|\s)(مقتل|قُتل|قتلوا|قتلى)(?=[\s،.:؛]|$)/.test(text)) {
    issues.push({ type: "err", msg: `استخدم «استشهاد / استشهد / شهداء» بدلاً من «مقتل / قُتل / قتلى»!` });
  }
  if (text.includes("غزة") && text.includes("قوات الاحتلال")) {
    issues.push({ type: "warn", msg: `تنبيه مصطلح غزة: المعتمد في أخبار غزة «قوات العدو الصهيوني»` });
  }
  if (text.includes("الضفة") && text.includes("قوات العدو")) {
    issues.push({ type: "warn", msg: `تنبيه مصطلح الضفة: المعتمد في أخبار الضفة «قوات الاحتلال الصهيوني»` });
  }

  // 4b. Standalone word "دهم" -> "مداهمة" (safe word boundary so "عددهم" is untouched!)
  if (/(^|[\s«"(])دهم(?=[\s،.:؛»")!]|$)/m.test(text)) {
    issues.push({ type: "err", msg: `ممنوع «دهم» ⬅ المعتمد: «مداهمة»` });
  }

  // 4c. Forbidden URLs / Links & Clock Hours ("احذف جميع التواريخ والأيام والساعات والروابط")
  if (/(https?:\/\/\S+|www\.\S+|t\.me\/\S+)/i.test(text)) {
    issues.push({ type: "err", msg: `يُمنع وجود روابط إلكترونية في الخبر (اضغط «✨ تصحيح» لحذفها)` });
  }
  if (/(^|\s)الساعة\s+\S+/.test(text) || /بتوقيت\s+(القدس|مكة|غرينتش|القاهرة|غزة)/.test(text)) {
    issues.push({ type: "warn", msg: `يُمنع ذكر الساعات والتوقيت الزمني داخل الخبر` });
  }

  // 5. News Agencies / Correspondents forbidden
  const agencies = ["رويترز", "فرانس برس", "الأناضول", "أسوشيتد برس", "وكالة وفا", "مراسلنا", "أفاد مراسل"];
  agencies.forEach(ag => {
    if (text.includes(ag)) issues.push({ type: "err", msg: `ممنوع ذكر الوكالات أو المراسلين: «${ag}»` });
  });

  // 6. Missing Hamza on reporting verbs
  const bareVerbs = [
    ["اعلن", "أعلن"], ["اعلنت", "أعلنت"], ["اكد", "أكد"], ["اكدت", "أكدت"],
    ["اشار", "أشار"], ["اشارت", "أشارت"], ["اوضح", "أوضح"], ["اوضحت", "أوضحت"],
    ["افاد", "أفاد"], ["افادت", "أفادت"], ["اضاف", "أضاف"], ["اضافت", "أضافت"]
  ];
  bareVerbs.forEach(([bad, good]) => {
    const re = new RegExp(`(^|\\s)${bad}(?=\\s|$)`, "g");
    if (re.test(text)) issues.push({ type: "err", msg: `همزة ساقطة: «${bad}» ⬅ «${good}»` });
  });

  // 7. Passive / weak verb check
  if (/(^|\n)\s*تم\s+/.test(text)) {
    issues.push({ type: "warn", msg: `الفعل مبني للمعلوم دائماً (تجنب البدء بـ «تمّ»)` });
  }

  return issues;
}

function runQualityRadar() {
  const edited = document.getElementById("editedNewsOutput").value;
  const words = edited.trim() ? edited.trim().split(/\s+/).length : 0;
  document.getElementById("editedStats").textContent = `${words} كلمة | ${edited.length} حرف`;

  const structBox = document.getElementById("structureGuardChips");
  const orthBox = document.getElementById("orthographyChips");
  const badge = document.getElementById("radarSummaryBadge");

  if (!edited.trim()) {
    badge.className = "chip chip-ok"; badge.textContent = "جاهز";
    structBox.innerHTML = `<span class="muted-note">يفحص فاصل (lvo)، وكتابة الأرقام بالحروف، وقاعدة «مائة»، وطول الكبشن فور ظهور الخبر.</span>`;
    orthBox.innerHTML = `<span class="muted-note">لا توجد ملاحظات.</span>`;
    return;
  }

  let structChips = [];
  let warnings = 0;

  // Check 1: Digits forbidden ("الأرقام تُكتب بالحروف دائماً")
  const foundDigits = edited.match(/[0-9٠-٩]+/g);
  if (foundDigits) {
    warnings += foundDigits.length;
    structChips.push(`<span class="chip chip-err">❗ وُجدت أرقام بالرموز (${foundDigits.slice(0,4).join("، ")}) — القاعدة: الأرقام تُكتب بالحروف دائماً!</span>`);
  } else {
    structChips.push(`<span class="chip chip-ok">✔ لا توجد أرقام رقمية (ملتزم بالحروف)</span>`);
  }

  // Check 2: lvo standalone separator when in lvo_standard mode
  if (state.selectedFormat === "lvo_standard") {
    const hasStandaloneLvo = /(^|\n)\s*lvo\s*(\n|$)/i.test(edited);
    if (hasStandaloneLvo) {
      structChips.push(`<span class="chip chip-ok">✔ الفاصل (lvo) موجود على سطر مستقل</span>`);
    } else {
      warnings++;
      structChips.push(`<span class="chip chip-err">❗ الفاصل (lvo) غير موجود على سطر منفصل بعد المقدمة!</span>`);
    }

    // Check paragraph starters after lvo
    if (edited.includes("وأفادت مصادر إعلامية") || edited.includes("وأفادت مصادر طبية")) {
      structChips.push(`<span class="chip chip-ok">✔ استهلال «وأفادت مصادر...» متحقق</span>`);
    } else {
      warnings++;
      structChips.push(`<span class="chip chip-warn">⚠️ يُستحسن بدء الفقرة الثانية بـ «وأفادت مصادر إعلامية/طبية»</span>`);
    }
  }

  // Check 3: "مائة" rule
  if (/(مئة|ثلاثمئة|أربعمئة|خمسمئة|ستمئة|سبعمئة|ثمانمئة|تسعمئة)/.test(edited)) {
    warnings++;
    structChips.push(`<span class="chip chip-err">❗ كُتبت «مئة» بدون ألف! القاعدة الصارمة: مائة، خمسمائة، سبعمائة</span>`);
  }

  structBox.innerHTML = structChips.join("");

  const issues = scanPolicyViolations(edited);
  warnings += issues.length;

  orthBox.innerHTML = issues.length
    ? issues.map(it => `<span class="chip ${it.type === 'err' ? 'chip-err' : 'chip-warn'}">${it.msg}</span>`).join("")
    : `<span class="chip chip-ok">✔ ملتزم بجميع المصطلحات الثابتة والضوابط اللغوية والزمنية</span>`;

  badge.className = warnings === 0 ? "chip chip-ok" : "chip chip-warn";
  badge.textContent = warnings === 0 ? "✅ مطابق 100% للقواعد" : `🔎 ${warnings} تنبيه تحريري`;
}

function getCleanTickerItems() {
  return extractPureTickerParagraphs(document.getElementById("tickerOutput").value);
}

function runTickerRadar() {
  const rawBoxText = document.getElementById("tickerOutput").value;
  const items = getCleanTickerItems();
  const maxWords = parseInt(document.getElementById("tickerMaxWords").value, 10) || 25;
  const sepMode = document.getElementById("tickerSeparator")?.value || "bitmap";

  const pureJoined = items.join("\n");
  const totalWords = items.reduce((sum, line) => sum + line.split(/\s+/).filter(Boolean).length, 0);
  document.getElementById("tickerStats").textContent =
    `${items.length} فقرة شريط | ${totalWords} كلمة صافية`;

  const alertsBox = document.getElementById("tickerAlertsChips");
  const badge = document.getElementById("tickerRadarBadge");
  if (!alertsBox || !badge) return;

  if (!items.length) {
    badge.className = "chip chip-ok"; badge.textContent = "بانتظار الشريط";
    alertsBox.innerHTML = `<span class="muted-note">يفحص الطول (10–25 كلمة)، الفاعل أولاً، الأرقام بالرموز، الفاصل &lt;BITMAP&gt;، والمصطلحات.</span>`;
    return;
  }

  let issues = [];
  // 1. Dictionary & fixed political/orthographic checks on pure items (excluding News-only temporal prohibitions)
  state.dictionary.forEach(item => {
    if (item.bad && !/مئة/.test(item.bad) && pureJoined.includes(item.bad)) {
      issues.push({ type: "err", msg: `ممنوع «${item.bad}» ⬅ المعتمد: «${item.good}»` });
    }
  });
  const isPal = /(غزة|الضفة|القدس|فلسطين|جنين|نابلس|طولكرم|الخليل|رام الله|رفح|خان يونس|جباليا|النصيرات)/.test(pureJoined);
  if (isPal && /(^|\s)(مقتل|قُتل|قتلوا|قتلى)(?=[\s،.:؛]|$)/.test(pureJoined)) {
    issues.push({ type: "err", msg: `استخدم «استشهاد / ارتقاء / شهداء» بدلاً من «مقتل / قتلى»!` });
  }

  // 2. Check written number words in Ticker (Rule 8: numbers must be digits in Ticker!)
  const writtenNums = pureJoined.match(/(^|\s)(ثلاثة|أربعة|خمسة|ستة|سبعة|ثمانية|تسعة|عشرة|أحد عشر|اثنا عشر|اثني عشر|عشرون|عشرين|ثلاثون|ثلاثين|أربعون|أربعين|خمسون|خمسين)(?=[\s،]|$)/g);
  if (writtenNums) {
    issues.push({ type: "warn", msg: `🔢 في الشريط تُكتب الأرقام بالرموز دائماً (${writtenNums.slice(0, 3).map(s => s.trim()).join("، ")} ⬅ 3، 5، 20)` });
  }

  // 3. Check inverted casualty phrasing (Rule 9: رجلان استشهدا -> استشهاد رجلين)
  if (/(رجلان|طفلان|امرأتان|مدنيان|فلسطينيان|شابان)\s+(استشهدا|أصيبا|ارتقيا)/.test(pureJoined)) {
    issues.push({ type: "err", msg: `صيغة الحصيلة بالشريط: اكتب «استشهاد رجلين / إصابة امرأتين» وليس «رجلان استشهدا»` });
  }

  // 4. Check BITMAP separator presence when in bitmap mode (Rule 13)
  if (sepMode === "bitmap" && !rawBoxText.includes(TICKER_BITMAP_TAG)) {
    issues.push({ type: "warn", msg: `الفاصل الإجباري <BITMAP> غير مضاف بعد — اضغط «✨ تصحيح المصطلحات» لإضافته تلقائياً` });
  }

  // 5. Per-line checks: Dangling pronouns, Past-verb start ("الفاعل أولاً" Rule 5), too short (<7) or over maxWords
  const danglingRegex = /^(وأضاف|واضاف|وأضافت|وأشار|واشار|وأشارت|وأكد|واكد|وأكدت|وأوضح|واوضح|وأفاد|وافاد|وتابع|كما أكد|كما أشار)\b/;
  const verbFirstRegex = /^(أعلن|أعلنت|اعتقل|اعتقلت|استهدف|استهدفت|شن|شنت|قصف|قصفت|دان|أدانت|أكد|أكدت|أفاد|أفادت|ارتفع|ارتفعت|سقط|أصيب|استشهد)\b/;
  let overLimitCount = 0;
  let tooShortCount = 0;
  let verbFirstCount = 0;

  items.forEach((line, i) => {
    const wc = line.split(/\s+/).length;
    if (wc > maxWords) overLimitCount++;
    if (wc < 7) tooShortCount++;
    if (verbFirstRegex.test(line)) verbFirstCount++;
    if (danglingRegex.test(line)) issues.push({ type: "err", msg: `فقرة #${i + 1} تبدأ بضمير عائم (${line.split(" ")[0]}...) بلا ذكر المصدر!` });
  });

  if (verbFirstCount > 0) issues.unshift({ type: "warn", msg: `👤 (${verbFirstCount}) فقرة بدأت بالفعل بدل الفاعل — القاعدة 5: الفاعل أولاً (وزارة الصحة تعلن... / استشهاد 3...)` });
  if (overLimitCount > 0) issues.unshift({ type: "warn", msg: `📏 (${overLimitCount}) فقرة تتجاوز ${maxWords} كلمة` });
  if (tooShortCount > 0) issues.unshift({ type: "warn", msg: `✂️ (${tooShortCount}) فقرة قصيرة ومبتورة (أقل من 7 كلمات — المثالي 10 إلى 25 كلمة)` });

  if (!issues.length) {
    alertsBox.innerHTML = `<span class="chip chip-ok">✔ جميع الفقرات (${items.length}) سليمة، تبدأ بالفاعل، مرقمة بالرموز، ومفصولة بـ BITMAP!</span>`;
    badge.className = "chip chip-ok"; badge.textContent = "✅ جاهز للبث";
  } else {
    alertsBox.innerHTML = issues.map(it => `<span class="chip ${it.type === 'err' ? 'chip-err' : 'chip-warn'}">${it.msg}</span>`).join("");
    badge.className = "chip chip-warn"; badge.textContent = `🔎 ${issues.length} تنبيه`;
  }
}

function fixSingleArabicSegment(seg, isTicker = false) {
  let txt = seg;
  const sortedDict = [...state.dictionary].sort((a, b) => (b.bad || "").length - (a.bad || "").length);
  sortedDict.forEach(({ bad, good }) => {
    if (!bad) return;
    if (isTicker && /مئة/.test(bad) && !txt.includes(bad)) return;
    txt = txt.split(bad).join(good);
  });

  txt = txt.replace(/https?:\/\/\S+|www\.\S+|t\.me\/\S+/gi, "");
  txt = txt.replace(/(^|[\s«"(])دهم(?=[\s،.:؛»")!]|$)/gm, "$1مداهمة");

  const bareVerbs = [
    ["اعلن", "أعلن"], ["اعلنت", "أعلنت"], ["اكد", "أكد"], ["اكدت", "أكدت"],
    ["اشار", "أشار"], ["اشارت", "أشارت"], ["اوضح", "أوضح"], ["اوضحت", "أوضحت"],
    ["افاد", "أفاد"], ["افادت", "أفادت"], ["اضاف", "أضاف"], ["اضافت", "أضافت"]
  ];
  bareVerbs.forEach(([bad, good]) => {
    const re = new RegExp(`(^|[\\s«"(])${bad}(?=[\\s،.:؛»")!]|$)`, "gm");
    txt = txt.replace(re, `$1${good}`);
  });
  txt = txt.replace(/اءاً/g, "اءً");
  txt = txt.replace(/(^|\s)الغير\s+(?!ال)([^\s،.؛:]+)/g, "$1غير ال$2");
  txt = txt.replace(/[ \t]+([،.؛:!؟])/g, "$1");
  txt = txt.replace(/([،؛:])([^\s\n\d»"])/g, "$1 $2");
  txt = txt.replace(/[ \t]{2,}/g, " ");
  return txt;
}

function autoFixArabicErrors(targetId, silent = false) {
  const el = document.getElementById(targetId);
  let txt = el.value;
  if (!txt.trim()) { if (!silent) showToast("⚠️ المربع فارغ!"); return; }

  if (targetId === "tickerOutput") {
    // Fix each pure paragraph safely WITHOUT corrupting E:\NEWS\Logo.png, then re-add BITMAP tags!
    const pureItems = extractPureTickerParagraphs(txt)
      .map(item => toWesternDigitsAndSpaced(fixSingleArabicSegment(item, true).replace(/\.+\s*$/, "").trim()))
      .filter(Boolean);
    el.value = formatPureTickerItems(pureItems);
    runTickerRadar();
    if (!silent) showToast("✨ تم ضبط المصطلحات والمسافات حول الأرقام وحذف رموز الإخراج وإدراج فاصل BITMAP!");
    return;
  }

  el.value = fixSingleArabicSegment(txt, false);
  runQualityRadar();
  if (!silent) showToast("✨ تم تصحيح المصطلحات الثابتة والمائة والأشهر والهمزات فوراً!");
}

// =========================================================================
// Rules Management (Supports Adding New Rules Over Time + Editing Inline)
// =========================================================================
function switchRuleSub(sub) {
  state.ruleSubTab = sub;
  document.getElementById("ruleSubNewsBtn").classList.toggle("active", sub === "news");
  document.getElementById("ruleSubTickerBtn").classList.toggle("active", sub === "ticker");
  document.getElementById("ruleFormTitle").textContent = sub === "news"
    ? "➕ إضافة قواعد جديدة لتحرير الأخبار تباعاً"
    : "➕ إضافة قواعد جديدة لتفكيك النشرة والشريط الإخباري";
  renderRules();
}

function renderRules() {
  const list = state.ruleSubTab === "news" ? state.newsRules : state.tickerRules;
  document.getElementById("rulesCountBadge").textContent = state.newsRules.filter(r => r.active).length + state.tickerRules.filter(r => r.active).length;
  document.getElementById("rulesListContainer").innerHTML = list.length ? list.map((r, idx) => `
    <div class="item-row" style="opacity:${r.active ? 1 : 0.55}">
      <label style="display:flex; align-items:flex-start; gap:8px; margin:0; color:var(--text); font-weight:600; cursor:pointer; flex:1;">
        <input type="checkbox" ${r.active ? "checked" : ""} onchange="toggleRule(${idx})" style="width:16px; height:16px; margin-top:4px;" />
        <div>
          ${r.category ? `<span class="chip chip-ok" style="font-size:0.7rem; margin-left:6px;">${escapeHtml(r.category)}</span>` : ""}
          <span>${escapeHtml(r.text)}</span>
        </div>
      </label>
      <div style="display:flex; gap:4px;">
        <button class="btn btn-outline btn-sm" onclick="editRulePrompt(${idx})" title="تعديل نص القاعدة">✏️</button>
        <button class="btn btn-outline btn-sm" onclick="deleteRule(${idx})" title="حذف">🗑️</button>
      </div>
    </div>`).join("") : `<p class="muted-note">لا توجد قواعد مضافة.</p>`;
}

function persistRules() {
  SafeStorage.set("nr_rules_override_v2", state.newsRules);
  SafeStorage.set("nr_ticker_rules_override_v2", state.tickerRules);
  renderRules();
}

function addSingleRule() {
  const inp = document.getElementById("singleRuleInput");
  const cat = document.getElementById("ruleCategoryInput").value;
  if (!inp.value.trim()) return;
  (state.ruleSubTab === "news" ? state.newsRules : state.tickerRules).unshift({
    id: "rule-" + Date.now(),
    category: cat,
    active: true,
    text: inp.value.trim()
  });
  inp.value = "";
  persistRules();
  showToast("✅ أُضيفت القاعدة الجديدة! (اضغط «☁️ حفظ في GitHub» متى أردت تثبيتها في المستودع)");
}

function editRulePrompt(idx) {
  const list = state.ruleSubTab === "news" ? state.newsRules : state.tickerRules;
  const updated = window.prompt("تعديل القاعدة التحريرية:", list[idx].text);
  if (updated !== null && updated.trim()) {
    list[idx].text = updated.trim();
    persistRules();
    showToast("✏️ تم تحديث القاعدة");
  }
}

function addBulkRules(replaceExisting) {
  const raw = document.getElementById("bulkRulesInput").value.trim();
  const cat = document.getElementById("ruleCategoryInput").value;
  if (!raw) return;
  const lines = raw.split(/\n+/).map(l => l.replace(/^[\s\-*•\d.)(]+/, "").trim()).filter(Boolean);
  const target = state.ruleSubTab === "news" ? state.newsRules : state.tickerRules;
  if (replaceExisting) target.length = 0;
  lines.forEach((line, i) => target.push({ id: "rule-" + (Date.now() + i), category: cat, active: true, text: line }));
  document.getElementById("bulkRulesInput").value = "";
  persistRules();
  showToast(`✅ أُضيفت ${lines.length} قاعدة بنجاح!`);
}

function toggleRule(idx) {
  const t = state.ruleSubTab === "news" ? state.newsRules : state.tickerRules;
  t[idx].active = !t[idx].active; persistRules();
}
function deleteRule(idx) {
  (state.ruleSubTab === "news" ? state.newsRules : state.tickerRules).splice(idx, 1); persistRules();
}
function resetCurrentRules() {
  if (state.ruleSubTab === "news") { SafeStorage.remove("nr_rules_override_v2"); state.newsRules = JSON.parse(JSON.stringify(repoDefaults.newsRules)); }
  else { SafeStorage.remove("nr_ticker_rules_override_v2"); state.tickerRules = JSON.parse(JSON.stringify(repoDefaults.tickerRules)); }
  renderRules(); showToast("🔄 استُعيدت قواعد ملفات المستودع");
}

// =========================================================================
// Direct One-Click Cloud Sync to GitHub Repo (Separate Files!)
// =========================================================================
async function githubPutFile(token, filePath, jsonObj, message) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
  let sha = undefined;
  const getRes = await fetch(apiUrl, { headers: { "Authorization": `Bearer ${token}`, "Accept": "application/vnd.github+json" } });
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }
  const contentStr = JSON.stringify(jsonObj, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(contentStr)));
  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, content: base64Content, ...(sha ? { sha } : {}) })
  });
  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(err.message || `فشل رفع ${filePath}`);
  }
}

async function syncToGitHubRepo() {
  const token = (state.keys.github || "").trim();
  if (!token) {
    switchTab("engines", document.querySelectorAll(".tab-btn")[5]);
    showToast("🔑 ضع توكن GitHub في الخانة رقم 4 مرة واحدة ليحفظ القواعد والأمثلة في مستودعك مباشرة!");
    return;
  }
  try {
    showToast("☁️ جاري حفظ القواعد والأمثلة المنفصلة في مستودع GitHub...");
    await githubPutFile(token, "data/news-rules.json", state.newsRules, "تحديث قواعد تحرير الأخبار");
    await githubPutFile(token, "data/ticker-rules.json", state.tickerRules, "تحديث قواعد الشريط الإخباري");
    await githubPutFile(token, "data/dictionary.json", state.dictionary, "تحديث قاموس المصطلحات الثابتة");
    await githubPutFile(token, "data/shared-keys.json", buildEncodedVaultObject(state.keys), "مزامنة مفاتيح الصفحة المشفرة لكل الأجهزة");

    renderExamples();
    showToast("✅ تم حفظ كافة القواعد والأنماط المستلهمة والقاموس في GitHub بنجاح!");
  } catch (err) {
    showToast(`⚠️ خطأ مزامنة GitHub: ${err.message}`);
  }
}

// =========================================================================
// Style Distillation & Dictionary UI
// =========================================================================
function switchExSub(sub) {
  state.exSubTab = sub;
  document.getElementById("exSubNewsBtn").classList.toggle("active", sub === "news");
  document.getElementById("exSubTickerBtn").classList.toggle("active", sub === "ticker");
  renderExamples();
}

function renderExamples() {
  const distilledNews = state.newsRules.filter(r => r.category === "نمط مستلهم");
  const distilledTicker = state.tickerRules.filter(r => r.category === "نمط مستلهم");
  const badge = document.getElementById("examplesCountBadge");
  if (badge) badge.textContent = distilledNews.length + distilledTicker.length;

  const list = state.exSubTab === "news" ? distilledNews : distilledTicker;
  const box = document.getElementById("examplesListContainer");
  if (!box) return;
  if (!list.length) {
    box.innerHTML = `<p class="muted-note">لا توجد أنماط إضافية مستلهمة بعد — الصق أي (خبر خام + خبر محرر) أو (نشرة + شريط) ليستخلص التطبيق منها النمط والأسلوب التحريري فقط في قواعد خفيفة دون حفظ الأمثلة حرفياً.</p>`;
    return;
  }

  box.innerHTML = list.map((r) => `
    <div class="example-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div style="flex:1;">
          <span class="chip chip-ok" style="margin-left:6px;">🧠 نمط مستلهم</span>
          <span style="font-size:0.88rem; line-height:1.6;">${escapeHtml(r.text)}</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="deleteDistilledRule('${r.id}')" title="حذف هذه القاعدة المستلهمة">🗑️</button>
      </div>
    </div>`).join("");
}

function deleteDistilledRule(ruleId) {
  if (state.exSubTab === "news") {
    state.newsRules = state.newsRules.filter(r => r.id !== ruleId);
  } else {
    state.tickerRules = state.tickerRules.filter(r => r.id !== ruleId);
  }
  persistRules();
  renderExamples();
  showToast("🗑️ حُذفت القاعدة المستلهمة");
}

async function addExamplePair() {
  const raw = document.getElementById("exRawInput").value.trim();
  const edited = document.getElementById("exEditedInput").value.trim();
  if (!raw || !edited) { showToast("⚠️ الصق النص الخام والصياغة المعتمدة معاً لاستلهام النمط منهما"); return; }

  const mode = state.exSubTab === "news" ? "news" : "ticker";
  const btn = document.getElementById("distillExampleBtn");
  if (btn) btn.disabled = true;
  showToast("⏳ جاري استلهام النمط والقواعد والأسلوب التحريري فقط دون حفظ المثال حرفياً...");

  try {
    const material = `[النص الخام قبل التحرير]:\n${raw.slice(0, 3500)}\n\n[الصياغة المعتمدة بعد التحرير]:\n${edited.slice(0, 3500)}`;
    const added = await distillAbstractRulesWithAI(mode, material);
    if (document.getElementById("exTitleInput")) document.getElementById("exTitleInput").value = "";
    document.getElementById("exRawInput").value = "";
    document.getElementById("exEditedInput").value = "";
    renderExamples();
    showToast(`🧠 تم استلهام (${added.length || 1}) قاعدة أسلوبية خفيفة وإضافتها للسياسة التحريرية دون حفظ النص حرفياً!`);
  } catch (err) {
    showToast(`⚠️ تعذر استلهام النمط: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function saveCurrentNewsAsExample() {
  const raw = document.getElementById("rawNewsInput").value.trim();
  const edited = document.getElementById("editedNewsOutput").value.trim();
  if (!raw || !edited) { showToast("⚠️ يلزم الخبر الخام والمحرر معاً لاستلهام النمط"); return; }
  showToast("⏳ جاري استلهام النمط والأسلوب التحريري من هذا الخبر دون حفظه حرفياً...");
  try {
    const material = `[الخبر الخام]:\n${raw.slice(0, 3000)}\n\n[الخبر المحرر المعتمد]:\n${edited.slice(0, 3000)}`;
    const added = await distillAbstractRulesWithAI("news", material);
    renderExamples();
    showToast(`🧠 تم استلهام (${added.length || 1}) قاعدة أسلوبية خفيفة وإضافتها للقواعد دون حفظ الخبر حرفياً!`);
  } catch (err) {
    showToast(`⚠️ تعذر استلهام النمط: ${err.message}`);
  }
}

async function saveCurrentTickerAsExample() {
  const raw = document.getElementById("rawBulletinInput").value.trim();
  const edited = document.getElementById("tickerOutput").value.trim();
  if (!raw || !edited) { showToast("⚠️ يلزم النشرة الخام والشريط معاً"); return; }
  showToast("⏳ جاري استلهام النمط من الشريط دون حفظه حرفياً...");
  try {
    const material = `[النشرة الخام]:\n${raw.slice(0, 3000)}\n\n[الشريط المعتمد]:\n${edited.slice(0, 3000)}`;
    const added = await distillAbstractRulesWithAI("ticker", material);
    renderExamples();
    showToast(`🧠 تم استلهام (${added.length || 1}) قاعدة شريط خفيفة دون حفظ النص حرفياً!`);
  } catch (err) {
    showToast(`⚠️ ${err.message}`);
  }
}

function renderDictionary() {
  document.getElementById("dictListContainer").innerHTML = state.dictionary.map((d, idx) => `
    <div class="item-row" style="padding:7px 11px;">
      <span>❌ <strong>${escapeHtml(d.bad)}</strong> ⬅ ✅ <strong style="color:var(--ok)">${escapeHtml(d.good)}</strong></span>
      <button class="btn btn-outline btn-sm" onclick="deleteDictItem(${idx})">✖</button>
    </div>`).join("");
}
function addDictItem() {
  const bad = document.getElementById("dictBadInput").value.trim();
  const good = document.getElementById("dictGoodInput").value.trim();
  if (!bad || !good) return;
  state.dictionary.unshift({ bad, good });
  SafeStorage.set("nr_dict_override_v2", state.dictionary);
  document.getElementById("dictBadInput").value = ""; document.getElementById("dictGoodInput").value = "";
  renderDictionary(); showToast("✅ أُضيف للقاموس");
}
function deleteDictItem(idx) {
  state.dictionary.splice(idx, 1); SafeStorage.set("nr_dict_override_v2", state.dictionary); renderDictionary();
}

// =========================================================================
// Helpers
// =========================================================================
async function copyTextSafe(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    return true;
  }
}

async function getCompiledByMode(mode) {
  if (mode === "ticker") return await buildTickerPrompt(document.getElementById("rawBulletinInput").value.trim() || "[الصق النشرة الخام هنا]");
  return await buildEditorialPrompt(document.getElementById("rawNewsInput").value.trim() || "[الصق الخبر الخام هنا]");
}

function clearPreviousTickerIfAny() {
  const out = document.getElementById("tickerOutput");
  if (out && out.value) {
    out.value = "";
    state.lastAiTickerDraft = "";
    const bar = document.getElementById("tickerStatusBar");
    if (bar) bar.className = "status-bar";
    runTickerRadar();
  }
}

async function copyCompiledPrompt(mode) {
  if (mode === "ticker") clearPreviousTickerIfAny();
  await copyTextSafe(await getCompiledByMode(mode));
  showToast("📋 تم نسخ الأمر الشامل مع القواعد والمصطلحات الثابتة!");
}

async function copyAndOpenWeb(mode, url, siteName) {
  const inputId = mode === "ticker" ? "rawBulletinInput" : "rawNewsInput";
  if (!document.getElementById(inputId).value.trim()) { showToast("⚠️ الصق النص الخام أولاً!"); return; }
  if (mode === "ticker") clearPreviousTickerIfAny();
  await copyTextSafe(await getCompiledByMode(mode));
  showToast(`✅ نُسخ الأمر الكامل! الصقه (Ctrl+V) داخل ${siteName}`);
  window.open(url, "_blank", "noopener");
}

async function previewPromptModal(mode) {
  document.getElementById("promptPreviewBox").value = await getCompiledByMode(mode);
  document.getElementById("promptModal").style.display = "block";
}

function formatTickerForExport() {
  const items = getCleanTickerItems();
  return formatPureTickerItems(items);
}
async function copyFormattedTicker() {
  const out = formatTickerForExport();
  if (!out) { showToast("⚠️ الشريط فارغ"); return; }
  await copyTextSafe(out); showToast("✅ تم نسخ نص الشريط بالكامل!");
}
function downloadTickerTxt() {
  const out = formatTickerForExport();
  if (!out) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([out], { type: "text/plain;charset=utf-8" }));
  a.download = `ticker-${new Date().toISOString().slice(0,10)}.txt`; a.click();
}
function sendEditedNewsToTicker() {
  const source = document.getElementById("editedNewsOutput").value.trim() || document.getElementById("rawNewsInput").value.trim();
  if (!source) return;
  // Replace previous bulletin & clear previous ticker output cleanly!
  document.getElementById("rawBulletinInput").value = source;
  document.getElementById("tickerOutput").value = "";
  state.lastAiTickerDraft = "";
  document.getElementById("tickerStatusBar").className = "status-bar";
  updateBulletinStats(); runTickerRadar();
  switchTab("ticker", document.querySelectorAll(".tab-btn")[1]);
}
function loadSampleRawNews() {
  document.getElementById("rawNewsInput").value = `مراسل وكالة رويترز: اليوم الأربعاء الموافق 29 تشرين الأول استشهد 7 مواطنين وأصيب 15 آخرين جراء قصف طائرات الجيش الإسرائيلي لخيام النازحين في شمال شرق مدينة رفح جنوب قطاع غزة، إلى جانب تدمير 3 منازل مجاورة، وقالت مصادر طبية أمس إن أكثر من 500 جريح بحاجة لتدخل جراحي عاجل في ظل استمرار خرق وقف إطلاق النار.`;
  document.getElementById("editedNewsOutput").value = "";
  state.lastAiNewsDraft = "";
  updateRawStats(); runQualityRadar();
  showToast("🧪 أُدرج خبر خام تجريبي!");
}
function loadSampleBulletin() {
  document.getElementById("rawBulletinInput").value = `قطاع غزة\nشهداء وجرحى بغارات للعدو الصهيوني على النصيرات\nاستشهد أربعة فلسطينيين وأصيب اثنا عشر آخرون نتيجة قصف طائرات العدو الصهيوني منزلاً في مخيم النصيرات وسط قطاع غزة.\nlvo\nوأفادت مصادر طبية أن من بين الشهداء طفلين وامرأتين.\n\nبيان القوات المسلحة اليمنية\nأكد المتحدث باسم القوات المسلحة العميد يحيى سريع تنفيذ عملية عسكرية استهدفت هدفاً حيوياً للعدو الصهيوني في يافا المحتلة.\nSs\nوأوضح العميد يحيى سريع أن العملية نُفذت بصاروخ باليستي فرط صوتي وحققت هدفها بنجاح.\n\nالضفة الغربية\nاعتقالات في الخليل\nاعتقلت قوات الاحتلال الصهيوني عشرين فلسطينياً خلال حملة مداهمة في محافظة الخليل.\nVt`;
  document.getElementById("tickerOutput").value = "";
  state.lastAiTickerDraft = "";
  document.getElementById("tickerStatusBar").className = "status-bar";
  updateBulletinStats(); runTickerRadar();
}
function updateRawStats() {
  const t = document.getElementById("rawNewsInput").value;
  document.getElementById("rawStats").textContent = `${t.trim() ? t.trim().split(/\s+/).length : 0} كلمة | ${t.length} حرف`;
}
function updateBulletinStats() {
  const t = document.getElementById("rawBulletinInput").value;
  document.getElementById("bulletinStats").textContent = `${t.trim() ? t.trim().split(/\s+/).length : 0} كلمة | ${t.length} حرف`;
}
async function pasteTo(id) {
  try {
    const t = await navigator.clipboard.readText();
    if (t) {
      document.getElementById(id).value = t;
      if (id === "rawBulletinInput") {
        document.getElementById("tickerOutput").value = "";
        state.lastAiTickerDraft = "";
        document.getElementById("tickerStatusBar").className = "status-bar";
        runTickerRadar();
      }
      if (id === "rawNewsInput") {
        document.getElementById("editedNewsOutput").value = "";
        state.lastAiNewsDraft = "";
        runQualityRadar();
      }
      updateRawStats(); updateBulletinStats();
    }
  }
  catch (e) { showToast("اضغط داخل المربع واستخدم Ctrl+V"); }
}
function clearNewsDesk() {
  document.getElementById("rawNewsInput").value = ""; document.getElementById("editedNewsOutput").value = "";
  state.lastAiNewsDraft = ""; hideDiffBox("news");
  document.getElementById("statusBar").className = "status-bar"; updateRawStats(); runQualityRadar();
}
function clearTickerDesk() {
  document.getElementById("rawBulletinInput").value = ""; document.getElementById("tickerOutput").value = "";
  state.lastAiTickerDraft = ""; hideDiffBox("ticker");
  document.getElementById("tickerStatusBar").className = "status-bar"; updateBulletinStats(); runTickerRadar();
}
async function copyOutput(id) {
  const t = document.getElementById(id).value.trim();
  if (!t) { showToast("⚠️ الخانة فارغة"); return; }
  await copyTextSafe(t); showToast("✅ تم نسخ الخبر المحرر!");
}
function adoptComparison(which) {
  document.getElementById("editedNewsOutput").value = document.getElementById("compOutput" + which).value;
  state.lastAiNewsDraft = document.getElementById("editedNewsOutput").value;
  hideDiffBox("news");
  runQualityRadar();
}
let keysAutoSyncTimer = null;
function saveApiKeys() {
  state.keys = {
    groq: document.getElementById("groqKeyInput").value.trim(),
    openrouter: document.getElementById("openrouterKeyInput").value.trim(),
    gemini: document.getElementById("geminiKeyInput").value.trim(),
    github: document.getElementById("githubTokenInput").value.trim()
  };
  SafeStorage.set("nr_keys_v1", state.keys);
  populateEngineSelectors();
  updateKeysVaultStatusBadge();

  if (keysAutoSyncTimer) clearTimeout(keysAutoSyncTimer);
  if (state.keys.github) {
    keysAutoSyncTimer = setTimeout(() => {
      saveAndSyncKeysEverywhere(true);
    }, 1500);
  }
}

async function saveAndSyncKeysEverywhere(silent = false) {
  state.keys = {
    groq: document.getElementById("groqKeyInput").value.trim(),
    openrouter: document.getElementById("openrouterKeyInput").value.trim(),
    gemini: document.getElementById("geminiKeyInput").value.trim(),
    github: document.getElementById("githubTokenInput").value.trim()
  };
  SafeStorage.set("nr_keys_v1", state.keys);
  populateEngineSelectors();
  updateKeysVaultStatusBadge();

  const token = state.keys.github;
  if (!token) {
    if (!silent) showToast("⚠️ أدخل توكن GitHub في الخانة 4 ليتم حفظ المفاتيح في الصفحة لكل أجهزتك");
    return;
  }
  try {
    await githubPutFile(token, "data/shared-keys.json", buildEncodedVaultObject(state.keys), "حفظ ومزامنة المفاتيح المشفرة لجميع الأجهزة");
    if (!silent) showToast("☁️✅ تم حفظ المفاتيح في الصفحة! ستعمل تلقائياً عند فتحها من أي كمبيوتر أو جوال آخر");
    else showToast("☁️ تمت مزامنة مفاتيحك تلقائياً في الصفحة لتعمل على جميع أجهزتك!");
  } catch (e) {
    if (!silent) showToast(`⚠️ تعذرت مزامنة المفاتيح سحابياً: ${e.message}`);
  }
}

function toggleKeysVisibility() {
  const ids = ["groqKeyInput", "openrouterKeyInput", "geminiKeyInput", "githubTokenInput"];
  const makeText = document.getElementById("groqKeyInput")?.type === "password";
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.type = makeText ? "text" : "password";
  });
}
function switchTab(name, btnEl) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  if (btnEl) btnEl.classList.add("active");
}
function selectFormat(fmt, btnEl) {
  state.selectedFormat = fmt;
  document.querySelectorAll("#formatPills .pill").forEach(p => p.classList.remove("active"));
  btnEl.classList.add("active");
  runQualityRadar();
}
function exportBackup() {
  const payload = { newsRules: state.newsRules, tickerRules: state.tickerRules, localNewsExamples: state.localNewsExamples, localTickerExamples: state.localTickerExamples, dictionary: state.dictionary };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "text/plain;charset=utf-8" }));
  a.download = "newsroom-backup.json"; a.click();
}
function importBackup(ev) {
  const f = ev.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (d.newsRules) { state.newsRules = d.newsRules; SafeStorage.set("nr_rules_override_v2", d.newsRules); }
      if (d.tickerRules) { state.tickerRules = d.tickerRules; SafeStorage.set("nr_ticker_rules_override_v2", d.tickerRules); }
      if (d.dictionary) { state.dictionary = d.dictionary; SafeStorage.set("nr_dict_override_v2", d.dictionary); }
      renderRules(); renderDictionary(); showToast("✅ تم الاستيراد!");
    } catch (e) { showToast("⚠️ ملف غير صالح"); }
  };
  r.readAsText(f);
}
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  SafeStorage.set("nr_theme_v1", state.theme);
  if (state.theme === "dark") { document.documentElement.setAttribute("data-theme", "dark"); document.getElementById("themeBtn").textContent = "☀️ نهاري"; }
  else { document.documentElement.removeAttribute("data-theme"); document.getElementById("themeBtn").textContent = "🌙 ليلي"; }
}
function setStatus(barId, txtId, kind, msg) {
  document.getElementById(barId).className = `status-bar show status-${kind}`;
  document.getElementById(txtId).textContent = msg;
}
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3800);
}
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// =========================================================================
// PWA Service Worker, Install Prompt, Shortcuts & Network Status
// =========================================================================
let deferredPwaPrompt = null;

function setupPwaFeatures() {
  // Purge any old v1-v4 PWA caches automatically so updates apply immediately!
  if ("caches" in window) {
    caches.keys().then(keys => {
      keys.filter(k => k !== "mihbarah-pwa-v28").forEach(k => caches.delete(k));
    }).catch(() => {});
  }

  // 1. Register Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js?v=28").then(reg => {
        reg.update().catch(() => {});
      }).catch(() => {});
    });
  }

  // 2. Hide install button if already installed as standalone PWA
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const installBtn = document.getElementById("installPwaBtn");
  if (isStandalone && installBtn) {
    installBtn.style.display = "none";
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (installBtn) installBtn.style.display = "inline-flex";
  });

  window.addEventListener("appinstalled", () => {
    deferredPwaPrompt = null;
    if (installBtn) installBtn.style.display = "none";
    showToast("🎉 تم تثبيت «محبرة الأخبار» كتطبيق مستقل على جهازك!");
  });

  // 3. Live Online / Offline Indicator
  const updateNetStatus = () => {
    const badge = document.getElementById("netStatusBadge");
    if (!badge) return;
    if (navigator.onLine) {
      badge.className = "chip chip-ok";
      badge.textContent = "🟢 متصل";
    } else {
      badge.className = "chip chip-warn";
      badge.textContent = "⚡ أوفلاين (يعمل محلياً)";
    }
  };
  window.addEventListener("online", updateNetStatus);
  window.addEventListener("offline", updateNetStatus);
  updateNetStatus();

  // 4. Handle PWA Shortcuts (?tab=ticker or ?tab=editor)
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "ticker") {
      switchTab("ticker", document.querySelectorAll(".tab-btn")[1]);
    } else if (tabParam === "editor") {
      switchTab("editor", document.querySelectorAll(".tab-btn")[0]);
    }
  } catch (e) {}
}

async function installPwaApp() {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    await deferredPwaPrompt.userChoice;
    deferredPwaPrompt = null;
    return;
  }
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) {
    showToast("📲 لتثبيته على آيفون: اضغط زر المشاركة (Share) بالمتصفح ثم «إضافة إلى الشاشة الرئيسية»");
  } else {
    showToast("📲 افتح رابط موقعك على Vercel واضغط أيقونة التثبيت بشريط عنوان المتصفح أو قائمة الخيارات ⬅ تثبيت التطبيق");
  }
}

setupPwaFeatures();
init();
