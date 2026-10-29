// =========================================================================
// Modular Newsroom App Engine (Lazy-loads separate JSON files + Vercel Bridge)
// =========================================================================
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
  gemini: {
    label: "🟣 Google Gemini المجاني (1500 طلب/يوم ✅)",
    models: [
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (سريع ودقيق)" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (الأقوى للنحو وتفكيك النشرات)" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite (لحظي)" }
    ]
  },
  groq: {
    label: "⚡ Groq السريع المجاني (يمر عبر جسر Vercel لليمن ✅)",
    models: [
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" }
    ]
  },
  openrouter: {
    label: "🔀 OpenRouter المجاني (عبر جسر Vercel ✅)",
    models: [
      { id: "openrouter/free", name: "الموجّه التلقائي لأفضل نموذج مجاني متاح" },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (مجاني)" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (مجاني)" }
    ]
  },
  puter: {
    label: "☁️ وسيط Puter السحابي (لتشغيل Claude بدون مفتاح)",
    models: [
      { id: "anthropic/claude-sonnet-5-5", name: "Claude Sonnet 5.5" },
      { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro" },
      { id: "openai/gpt-5.4-nano", name: "GPT-5.4 Nano" }
    ]
  }
};

const FORMAT_INSTRUCTIONS = {
  standard: "حرر النص في صورة (خبر صحفي قياسي للنشر): عنوان رئيسي قوي في السطر الأول، يليه فقرة استهلالية فعلية مركزة، ثم فقرات تفصيلية وفق الهرم المقلوب.",
  breaking: "حرر النص في صورة (خبر عاجل مقتضب): عنوان يبدأ بـ «عاجل | » يليه فقرة واحدة مكثفة لا تتجاوز 45 كلمة.",
  report: "حرر النص في صورة (تقرير إخباري موسّع): عنوان رئيسي، مقدمة قوية، ثم تفاصيل مقسمة بعناوين فرعية قصيرة.",
  social: "حرر النص للنشر في (تيليجرام ومنصات التواصل): عنوان جاذب رصين، يليه ملخص في نقاط قصيرة واضحة.",
  headlines: "اقترح 5 عناوين صحفية احترافية متنوعة لنفس الخبر.",
  proofread: "لا تغيّر بنية الخبر، بل قم بـ (تدقيق لغوي وإملائي وأسلوبي صارم فقط)."
};

// Cache for lazy-loaded example files so each separate JSON file is fetched at most once when needed!
const exampleFileCache = {};

let repoDefaults = {
  newsRules: [],
  tickerRules: [],
  dictionary: [],
  newsIndex: [],
  tickerIndex: []
};

let state = {
  newsRules: [],
  tickerRules: [],
  dictionary: [],
  localNewsExamples: SafeStorage.get("nr_local_news_ex", []),
  localTickerExamples: SafeStorage.get("nr_local_ticker_ex", []),
  keys: SafeStorage.get("nr_keys_v1", { gemini: "", groq: "", openrouter: "" }),
  selectedFormat: "standard",
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
  document.getElementById("geminiKeyInput").value = state.keys.gemini || "";
  document.getElementById("groqKeyInput").value = state.keys.groq || "";
  document.getElementById("openrouterKeyInput").value = state.keys.openrouter || "";

  populateEngineSelectors();

  // Load lightweight indexes & rule JSON files in parallel
  const [nRules, tRules, dict, nIdx, tIdx] = await Promise.all([
    fetchJsonSafe("data/news-rules.json", []),
    fetchJsonSafe("data/ticker-rules.json", []),
    fetchJsonSafe("data/dictionary.json", []),
    fetchJsonSafe("data/news-examples/index.json", []),
    fetchJsonSafe("data/ticker-examples/index.json", [])
  ]);

  repoDefaults = { newsRules: nRules, tickerRules: tRules, dictionary: dict, newsIndex: nIdx, tickerIndex: tIdx };

  state.newsRules = SafeStorage.get("nr_rules_override", null) || JSON.parse(JSON.stringify(nRules));
  state.tickerRules = SafeStorage.get("nr_ticker_rules_override", null) || JSON.parse(JSON.stringify(tRules));
  state.dictionary = SafeStorage.get("nr_dict_override", null) || JSON.parse(JSON.stringify(dict));

  renderRules();
  renderExamples();
  renderDictionary();
  runQualityRadar();
  runTickerRadar();
}

function populateEngineSelectors() {
  const pSel = document.getElementById("primaryEngineSelect");
  const sSel = document.getElementById("secondaryEngineSelect");
  pSel.innerHTML = "";
  sSel.innerHTML = "";
  for (const [k, v] of Object.entries(ENGINES)) {
    pSel.innerHTML += `<option value="${k}">${v.label}</option>`;
    sSel.innerHTML += `<option value="${k}">${v.label}</option>`;
  }
  if (state.keys.gemini) pSel.value = "gemini";
  else if (state.keys.groq) pSel.value = "groq";
  else if (state.keys.openrouter) pSel.value = "openrouter";
  else pSel.value = "puter";

  sSel.value = state.keys.groq ? "groq" : "openrouter";
  updateModelDropdown("primary");
  updateModelDropdown("secondary");
}

function updateModelDropdown(which) {
  const eng = document.getElementById(which + "EngineSelect").value;
  const mSel = document.getElementById(which + "ModelSelect");
  mSel.innerHTML = "";
  ENGINES[eng].models.forEach(m => {
    mSel.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

function toggleCompareUI() {
  const on = document.getElementById("compareModeToggle").checked;
  document.getElementById("secondaryEngineRow").style.display = on ? "grid" : "none";
  document.getElementById("compareContainer").style.display = on ? "block" : "none";
}

// =========================================================================
// Async Lazy Prompt Builders (Only loads the 2-3 needed JSON files!)
// =========================================================================
async function getRelevantNewsExamples(cat, limit = 3) {
  const combinedMeta = [...state.localNewsExamples, ...repoDefaults.newsIndex];
  let filtered = combinedMeta;
  if (cat !== "all") {
    const m = combinedMeta.filter(ex => ex.category === cat || ex.category === "عام");
    if (m.length > 0) filtered = m;
  }
  const topMeta = filtered.slice(0, limit);
  const loaded = await Promise.all(topMeta.map(loadExampleDetail));
  return loaded.filter(Boolean);
}

async function getRelevantTickerExamples(limit = 3) {
  const combinedMeta = [...state.localTickerExamples, ...repoDefaults.tickerIndex].slice(0, limit);
  const loaded = await Promise.all(combinedMeta.map(loadExampleDetail));
  return loaded.filter(Boolean);
}

async function buildEditorialPrompt(rawText) {
  const activeRules = state.newsRules.filter(r => r.active);
  const cat = document.getElementById("newsCategory").value;
  const extraNote = document.getElementById("extraNote").value.trim();
  const chosenExamples = await getRelevantNewsExamples(cat, 3);

  const rulesBlock = activeRules.map((r, i) => `${i + 1}. ${r.text}`).join("\n");
  const dictBlock = state.dictionary.slice(0, 30).map(d => `- يُمنع «${d.bad}» والصواب «${d.good}»`).join("\n");
  const examplesBlock = chosenExamples.map((ex, idx) =>
    `<مثال_${idx + 1}>\n[الخبر الخام]:\n${ex.raw}\n\n[الصياغة المحررة المعتمدة]:\n${ex.edited}\n</مثال_${idx + 1}>`
  ).join("\n\n");

  return `أنت رئيس ديسك تحرير إخباري ومدقق لغوي عربي محترف وصارم جداً.
مهمتك: تحرير <الخبر_الخام_الجديد> مع الالتزام الحرفي بـ <قواعد_التحرير_الإلزامية> ومحاكاة أسلوب <الأمثلة_المرجعية> دون اختلاق أي معلومة.

<قواعد_التحرير_الإلزامية>
${rulesBlock}
</قواعد_التحرير_الإلزامية>

<قائمة_التصويبات_اللغوية_والممنوعات>
${dictBlock}
- التزم الضبط الدقيق لهمزتي الوصل والقطع والتاء المربوطة والهاء وعلامات الترقيم.
</قائمة_التصويبات_اللغوية_والممنوعات>

${examplesBlock ? `<الأمثلة_المرجعية_لتعلّم_الأسلوب_فقط>
تنبيه حاسم: هذه الأمثلة لتعلّم الأسلوب فقط؛ إياك أن تنقل منها أي رقم أو اسم أو واقعة إلى خبر اليوم!
${examplesBlock}
</الأمثلة_المرجعية_لتعلّم_الأسلوب_فقط>` : ""}

<قالب_المخرج_المطلوب>
${FORMAT_INSTRUCTIONS[state.selectedFormat]}
${extraNote ? `توجيه خاص: ${extraNote}` : ""}
</قالب_المخرج_المطلوب>

<الخبر_الخام_الجديد>
${rawText}
</الخبر_الخام_الجديد>

أخرج نص الخبر المحرر النهائي فقط جاهزاً للنشر دون أي مقدمات أو تعليقات.`;
}

async function buildTickerPrompt(rawBulletin) {
  const activeRules = state.tickerRules.filter(r => r.active);
  const maxWords = parseInt(document.getElementById("tickerMaxWords").value, 10) || 16;
  const attrMode = document.getElementById("tickerAttributionMode").value;
  const extraNote = document.getElementById("tickerExtraNote").value.trim();
  const chosenExamples = await getRelevantTickerExamples(3);

  const rulesBlock = activeRules.map((r, i) => `${i + 1}. ${r.text}`).join("\n");
  const dictBlock = state.dictionary.slice(0, 30).map(d => `- يُمنع «${d.bad}» والصواب «${d.good}»`).join("\n");
  const examplesBlock = chosenExamples.map((ex, idx) =>
    `<مثال_نشرة_${idx + 1}>\n[النشرة الخام قبل التفكيك]:\n${ex.raw}\n\n[الشريط الإخباري المعتمد المستخرج منها]:\n${ex.edited}\n</مثال_نشرة_${idx + 1}>`
  ).join("\n\n");

  const attrInstruction = attrMode === "repeat"
    ? "عند تفكيك تصريح لمصدر أو مسؤول إلى عدة فقرات، كرّر اسم المصدر باختصار في مطلع كل فقرة متفرعة (مثل: وزير النقل: ... ) حتى تكون كل فقرة مفهومة ومستقلة تماماً على الشاشة."
    : "اذكر المصدر بوضوح وصُغ كل فقرة كجملة خبرية تامة مستقلة بذاتها دون ضمائر عائدة مجهولة.";

  return `أنت محرر شريط إخباري تلفزيوني وإذاعي محترف ومدقق لغوي عربي صارم.
مهمتك: تحويل وتفكيك <النشرة_الإخبارية_الخام> بالكامل إلى فقرات شريط إخباري متتالية، بحيث يُفكَّك كل خبر إلى فقرة أو عدة فقرات قصيرة، مستقلة المعنى، ومطابقة حرفياً لـ <قواعد_الشريط_الإخباري> وأسلوب <أمثلة_النشرات_السابقة>.

<قواعد_الشريط_الإخباري_الإلزامية>
${rulesBlock}
- الحد الأقصى لطول كل فقرة في الشريط: لا تتجاوز ${maxWords} كلمة للفقرة الواحدة.
- ${attrInstruction}
</قواعد_الشريط_الإخباري_الإلزامية>

<الضبط_اللغوي_والممنوعات>
${dictBlock}
- انتبه بدقة تامة لهمزات الوصل والقطع والتاء المربوطة والهاء، وطابق جميع الأرقام والتواريخ والأسماء مع النشرة الأصلية.
</الضبط_اللغوي_والممنوعات>

${examplesBlock ? `<أمثلة_النشرات_السابقة_لتعلّم_طريقة_التفكيك_والصياغة>
تنبيه حاسم: هذه الأمثلة لتعلّم طريقة التفكيك والصياغة فقط؛ لا تنقل منها أي خبر أو رقم إلى نشرة اليوم!
${examplesBlock}
</أمثلة_النشرات_السابقة_لتعلّم_طريقة_التفكيك_والصياغة>` : ""}

${extraNote ? `<توجيه_إضافي_لهذه_النشرة>\n${extraNote}\n</توجيه_إضافي_لهذه_النشرة>` : ""}

<النشرة_الإخبارية_الخام>
${rawBulletin}
</النشرة_الإخبارية_الخام>

<تنسيق_الإخراج_الإلزامي>
- اكتب كل فقرة من فقرات الشريط في سطر مستقل وحدها (بدون ترقيم وبدون عناوين جانبية وبدون مقدمات).
- راجع كل سطر: هل هو مستقل المعنى ولا يبدأ بـ (وأضاف / وأشار / كما أكد) المجهولة؟ وهل خلا من الأخطاء الإملائية؟
</تنسيق_الإخراج_الإلزامي>`;
}

function buildProofreaderPrompt(rawText, draftText, mode) {
  const maxWords = parseInt(document.getElementById("tickerMaxWords").value, 10) || 16;
  const rules = (mode === "ticker" ? state.tickerRules : state.newsRules)
    .filter(r => r.active)
    .map((r, i) => `${i + 1}. ${r.text}`)
    .join("\n");

  const tickerExtra = mode === "ticker"
    ? `- تأكد أن كل سطر يمثل فقرة شريط مستقلة المعنى لا تبدأ بضمير عائم مجهول (مثل: وأضاف أن / وأشار إلى)، وألا يتجاوز السطر الواحد ${maxWords} كلمة قدر الإمكان، وأبقِ كل فقرة في سطر مستقل دون ترقيم.`
    : "";

  return `أنت المدقق اللغوي النهائي ومراقب الجودة في غرفة أخبار عربية.
راجع <المسودة> مقارنةً بـ <النص_الخام_الأصلي> ونفّذ بدقة:
1. تصحيح أي خطأ إملائي أو نحوي أو همزة وصل/قطع أو تاء مربوطة/هاء أو علامة ترقيم.
2. التحقق من الالتزام التام بالقواعد التالية:
${rules}
${tickerExtra}
3. مطابقة جميع الأرقام والتواريخ والأسماء مع <النص_الخام_الأصلي>.
4. أخرج النسخة النهائية المصححة الجاهزة للبث/النشر فقط دون أي تعليقات أو مقدمات.

<النص_الخام_الأصلي>
${rawText}
</النص_الخام_الأصلي>

<المسودة>
${draftText}
</المسودة>`;
}

// =========================================================================
// Unified Model Caller (Uses Vercel /api/ai Bridge first -> Fallback Direct)
// =========================================================================
function extractPuterText(res) {
  if (!res) return "";
  if (typeof res === "string") return res;
  if (typeof res?.text === "string") return res.text;
  if (typeof res?.message?.content === "string") return res.message.content;
  if (Array.isArray(res?.message?.content)) return res.message.content.map(c => c?.text || "").join("");
  return String(res);
}

async function callModel(engine, model, promptText) {
  if (engine === "puter") {
    if (typeof window.puter === "undefined" || !window.puter.ai) {
      throw new Error("خدمة Puter غير متاحة في هذه النافذة حالياً؛ استخدم مفتاح Gemini أو Groq عبر جسر Vercel.");
    }
    const res = await window.puter.ai.chat(promptText, { model });
    return extractPuterText(res).trim();
  }

  const apiKey = (state.keys[engine] || "").trim();
  if (!apiKey) {
    throw new Error(`يرجى وضع مفتاح ${engine.toUpperCase()} المجاني أولاً في تبويب «⚡ الربط المجاني».`);
  }

  // 1. Try Vercel Serverless Bridge (/api/ai) first so Yemeni IP restrictions are bypassed automatically!
  try {
    const bridgeRes = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engine, model, prompt: promptText, apiKey })
    });
    if (bridgeRes.status !== 404 && bridgeRes.status !== 405 && bridgeRes.status !== 501) {
      const bridgeData = await bridgeRes.json();
      if (!bridgeRes.ok) throw new Error(bridgeData?.error || "خطأ من الخادم الوسيط");
      return (bridgeData.text || "").trim();
    }
  } catch (bridgeErr) {
    // Only fall back to direct browser fetch if /api/ai doesn't exist locally (e.g., python http.server)
    if (bridgeErr.message && !bridgeErr.message.includes("Unexpected token") && !bridgeErr.message.includes("Failed to fetch")) {
      throw bridgeErr;
    }
  }

  // 2. Fallback direct browser fetch (for local static testing)
  if (engine === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }], generationConfig: { temperature: 0.15 } })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || "تعذر الاتصال بـ Gemini API");
    return (d?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "").trim();
  }

  const endpoint = engine === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: promptText }], temperature: 0.15 })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "تعذر الاتصال بالمحرك");
  return (d?.choices?.[0]?.message?.content || "").trim();
}

function cleanAiMetaText(txt) {
  return (txt || "").replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();
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
  try {
    const prompt = await buildEditorialPrompt(raw);
    if (compareOn) {
      setStatus("statusBar", "statusText", "info", "⏳ جاري تحرير الخبر عبر نموذجين للمقارنة...");
      const [resA, resB] = await Promise.allSettled([callModel(pEng, pMod, prompt), callModel(sEng, sMod, prompt)]);
      const textA = resA.status === "fulfilled" ? cleanAiMetaText(resA.value) : `⚠️ ${resA.reason?.message}`;
      const textB = resB.status === "fulfilled" ? cleanAiMetaText(resB.value) : `⚠️ ${resB.reason?.message}`;
      document.getElementById("compOutputA").value = textA;
      document.getElementById("compOutputB").value = textB;
      if (resA.status === "fulfilled") document.getElementById("editedNewsOutput").value = textA;
      else if (resB.status === "fulfilled") document.getElementById("editedNewsOutput").value = textB;
      runQualityRadar();
      setStatus("statusBar", "statusText", "ok", "✅ اكتملت المقارنة!");
    } else {
      setStatus("statusBar", "statusText", "info", "⏳ المرحلة 1: جاري صياغة الخبر وفق قواعدك وأمثلتك...");
      let draft = cleanAiMetaText(await callModel(pEng, pMod, prompt));
      document.getElementById("editedNewsOutput").value = draft;
      runQualityRadar();

      if (twoStageOn && state.selectedFormat !== "proofread") {
        setStatus("statusBar", "statusText", "info", "🩺 المرحلة 2: المدقق اللغوي يراجع الهمزات والأرقام والقواعد...");
        draft = cleanAiMetaText(await callModel(pEng, pMod, buildProofreaderPrompt(raw, draft, "news")));
        document.getElementById("editedNewsOutput").value = draft;
        runQualityRadar();
      }
      setStatus("statusBar", "statusText", "ok", "✅ تم تحرير الخبر وتدقيقه بنجاح!");
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
  const pEng = document.getElementById("primaryEngineSelect").value;
  const pMod = document.getElementById("primaryModelSelect").value;

  btn.disabled = true;
  try {
    setStatus("tickerStatusBar", "tickerStatusText", "info", "⏳ المرحلة 1: جاري تفكيك النشرة إلى فقرات شريط إخباري...");
    const prompt = await buildTickerPrompt(raw);
    let tickerDraft = normalizeTickerLines(cleanAiMetaText(await callModel(pEng, pMod, prompt)));
    document.getElementById("tickerOutput").value = tickerDraft;
    runTickerRadar();

    if (twoStage) {
      setStatus("tickerStatusBar", "tickerStatusText", "info", "🩺 المرحلة 2: التدقيق اللغوي وفحص استقلالية الفقرات ومطابقة الأرقام...");
      tickerDraft = normalizeTickerLines(cleanAiMetaText(await callModel(pEng, pMod, buildProofreaderPrompt(raw, tickerDraft, "ticker"))));
      document.getElementById("tickerOutput").value = tickerDraft;
      runTickerRadar();
    }
    setStatus("tickerStatusBar", "tickerStatusText", "ok", "✅ تم تفكيك النشرة وتدقيق الشريط بنجاح!");
  } catch (err) {
    setStatus("tickerStatusBar", "tickerStatusText", "err", `⚠️ ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

function normalizeTickerLines(txt) {
  return txt.split(/\n+/).map(l => l.replace(/^[\s\-*•\d.)(]+/, "").replace(/\.+\s*$/, "").trim()).filter(Boolean).join("\n");
}

async function runSecondPassProofreadOnly(mode) {
  const isTicker = mode === "ticker";
  const raw = document.getElementById(isTicker ? "rawBulletinInput" : "rawNewsInput").value.trim();
  const outId = isTicker ? "tickerOutput" : "editedNewsOutput";
  const draft = document.getElementById(outId).value.trim();
  if (!draft) { showToast("⚠️ لا يوجد نص لتدقيقه!"); return; }

  const pEng = document.getElementById("primaryEngineSelect").value;
  const pMod = document.getElementById("primaryModelSelect").value;
  const barId = isTicker ? "tickerStatusBar" : "statusBar";
  const txtId = isTicker ? "tickerStatusText" : "statusText";

  try {
    setStatus(barId, txtId, "info", "🩺 جاري التدقيق اللغوي الصارم...");
    let fixed = cleanAiMetaText(await callModel(pEng, pMod, buildProofreaderPrompt(raw || draft, draft, mode)));
    if (isTicker) fixed = normalizeTickerLines(fixed);
    document.getElementById(outId).value = fixed;
    isTicker ? runTickerRadar() : runQualityRadar();
    setStatus(barId, txtId, "ok", "✅ تمت المراجعة اللغوية!");
  } catch (err) {
    setStatus(barId, txtId, "err", `⚠️ ${err.message}`);
  }
}

// =========================================================================
// Radars & Linters
// =========================================================================
function extractNumbers(text) {
  if (!text) return [];
  const norm = text.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  return [...new Set(norm.match(/\d+(?:[.,]\d+)?/g) || [])];
}

function scanOrthographyIssues(text) {
  const issues = [];
  state.dictionary.forEach(item => {
    if (item.bad && text.includes(item.bad)) issues.push({ type: "err", msg: `«${item.bad}» ⬅ «${item.good}»` });
  });
  const bareVerbs = [
    ["اعلن", "أعلن"], ["اعلنت", "أعلنت"], ["اكد", "أكد"], ["اكدت", "أكدت"],
    ["اشار", "أشار"], ["اشارت", "أشارت"], ["اوضح", "أوضح"], ["اوضحت", "أوضحت"],
    ["افاد", "أفاد"], ["افادت", "أفادت"], ["اضاف", "أضاف"], ["اضافت", "أضافت"]
  ];
  bareVerbs.forEach(([bad, good]) => {
    const re = new RegExp(`(^|\\s)${bad}(?=\\s|$)`, "g");
    if (re.test(text)) issues.push({ type: "err", msg: `همزة قطع ساقطة: «${bad}» ⬅ «${good}»` });
  });
  if (/(^|\s)الغير\s+/.test(text)) issues.push({ type: "warn", msg: "تنبيه نحوي: «الغير ...» ⬅ «غير الـ...»" });
  return issues;
}

function runQualityRadar() {
  const raw = document.getElementById("rawNewsInput").value;
  const edited = document.getElementById("editedNewsOutput").value;
  const words = edited.trim() ? edited.trim().split(/\s+/).length : 0;
  document.getElementById("editedStats").textContent = `${words} كلمة | ${edited.length} حرف`;

  const numBox = document.getElementById("numberGuardChips");
  const orthBox = document.getElementById("orthographyChips");
  const badge = document.getElementById("radarSummaryBadge");

  if (!edited.trim()) {
    badge.className = "chip chip-ok"; badge.textContent = "جاهز";
    numBox.innerHTML = `<span class="muted-note">يطابق الأرقام والتواريخ تلقائياً فور ظهور الخبر.</span>`;
    orthBox.innerHTML = `<span class="muted-note">لا توجد ملاحظات.</span>`;
    return;
  }

  let warnings = 0;
  const rawNums = extractNumbers(raw);
  const edNums = extractNumbers(edited);
  let numHtml = "";
  if (!rawNums.length && !edNums.length) numHtml = `<span class="chip chip-ok">✔ لا توجد أرقام</span>`;
  else {
    rawNums.forEach(n => {
      if (edNums.includes(n)) numHtml += `<span class="chip chip-ok">✔ ${n} مطابق</span>`;
      else { warnings++; numHtml += `<span class="chip chip-warn">⚠️ (${n}) لم يظهر في المحرر</span>`; }
    });
    edNums.forEach(n => {
      if (raw.trim() && !rawNums.includes(n)) { warnings++; numHtml += `<span class="chip chip-err">❗ (${n}) غير موجود في الخام!</span>`; }
    });
  }
  numBox.innerHTML = numHtml;

  const issues = scanOrthographyIssues(edited);
  if (/(^|\n)\s*تم\s+/.test(edited)) issues.push({ type: "warn", msg: "بُدئت فقرة بـ «تمّ + مصدر»" });
  warnings += issues.length;

  orthBox.innerHTML = issues.length
    ? issues.map(it => `<span class="chip ${it.type === 'err' ? 'chip-err' : 'chip-warn'}">${it.msg}</span>`).join("")
    : `<span class="chip chip-ok">✔ سليم من الأخطاء الشائعة والممنوعات</span>`;

  badge.className = warnings === 0 ? "chip chip-ok" : "chip chip-warn";
  badge.textContent = warnings === 0 ? "✅ سليم ومطابق" : `🔎 ${warnings} ملاحظة`;
}

function getCleanTickerItems() {
  return document.getElementById("tickerOutput").value.split(/\n+/).map(l => l.replace(/^[\s\-*•]+/, "").trim()).filter(Boolean);
}

function runTickerRadar() {
  const rawBulletin = document.getElementById("rawBulletinInput").value;
  const editedAll = document.getElementById("tickerOutput").value;
  const items = getCleanTickerItems();
  const maxWords = parseInt(document.getElementById("tickerMaxWords").value, 10) || 16;

  const totalWords = editedAll.trim() ? editedAll.trim().split(/\s+/).length : 0;
  document.getElementById("tickerStats").textContent = `${items.length} فقرة شريط | ${totalWords} كلمة إجمالاً`;
  refreshTickerPreviewBar();

  const alertsBox = document.getElementById("tickerAlertsChips");
  const linesBox = document.getElementById("tickerLinesInspector");
  const badge = document.getElementById("tickerRadarBadge");

  if (!items.length) {
    badge.className = "chip chip-ok"; badge.textContent = "بانتظار الشريط";
    alertsBox.innerHTML = `<span class="muted-note">يفحص الطول والضمائر المبتورة والأرقام والإملاء تلقائياً.</span>`;
    linesBox.innerHTML = "";
    return;
  }

  let issues = [];
  const rawNums = extractNumbers(rawBulletin);
  const edNums = extractNumbers(editedAll);
  rawNums.forEach(n => { if (!edNums.includes(n)) issues.push({ type: "warn", msg: `⚠️ الرقم (${n}) في النشرة لم يظهر في الشريط` }); });
  edNums.forEach(n => { if (rawBulletin.trim() && !rawNums.includes(n)) issues.push({ type: "err", msg: `❗ الرقم (${n}) في الشريط غير موجود في النشرة!` }); });
  issues = issues.concat(scanOrthographyIssues(editedAll));

  const danglingRegex = /^(وأضاف|واضاف|وأضافت|وأشار|واشار|وأشارت|وأكد|واكد|وأكدت|وأوضح|واوضح|وأفاد|وافاد|وتابع|كما أكد|كما أشار)\b/;
  let overLimitCount = 0;

  linesBox.innerHTML = items.map((line, i) => {
    const wc = line.split(/\s+/).length;
    const isOver = wc > maxWords;
    const hasDangling = danglingRegex.test(line);
    if (isOver) overLimitCount++;
    if (hasDangling) issues.push({ type: "err", msg: `فقرة #${i + 1} تبدأ بضمير عائم (${line.split(" ")[0]}...) بلا ذكر المصدر!` });
    return `
      <div class="ticker-line-card ${isOver || hasDangling ? 'overlimit' : ''}">
        <span style="flex:1;"><strong>#${i + 1}:</strong> ${escapeHtml(line)}</span>
        <span class="chip ${isOver ? 'chip-err' : 'chip-ok'}">${wc} / ${maxWords} كلمة</span>
      </div>`;
  }).join("");

  if (overLimitCount > 0) issues.unshift({ type: "warn", msg: `📏 (${overLimitCount}) فقرة تتجاوز ${maxWords} كلمة` });

  if (!issues.length) {
    alertsBox.innerHTML = `<span class="chip chip-ok">✔ جميع الفقرات (${items.length}) سليمة ومستقلة المعنى!</span>`;
    badge.className = "chip chip-ok"; badge.textContent = "✅ جاهز للبث";
  } else {
    alertsBox.innerHTML = issues.map(it => `<span class="chip ${it.type === 'err' ? 'chip-err' : 'chip-warn'}">${it.msg}</span>`).join("");
    badge.className = "chip chip-warn"; badge.textContent = `🔎 ${issues.length} تنبيه`;
  }
}

function autoFixArabicErrors(targetId) {
  const el = document.getElementById(targetId);
  let txt = el.value;
  if (!txt.trim()) { showToast("⚠️ المربع فارغ!"); return; }

  state.dictionary.forEach(({ bad, good }) => { if (bad) txt = txt.split(bad).join(good); });
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

  if (targetId === "tickerOutput") txt = normalizeTickerLines(txt);
  el.value = txt;
  targetId === "tickerOutput" ? runTickerRadar() : runQualityRadar();
  showToast("✨ تم تصحيح الهمزات والممنوعات وعلامات الترقيم!");
}

// =========================================================================
// Rules, Lazy Examples Inspector & Dictionary UI
// =========================================================================
function switchRuleSub(sub) {
  state.ruleSubTab = sub;
  document.getElementById("ruleSubNewsBtn").classList.toggle("active", sub === "news");
  document.getElementById("ruleSubTickerBtn").classList.toggle("active", sub === "ticker");
  document.getElementById("ruleFormTitle").textContent = sub === "news" ? "➕ إضافة قواعد تحرير الأخبار" : "➕ إضافة قواعد الشريط الإخباري";
  renderRules();
}

function renderRules() {
  const list = state.ruleSubTab === "news" ? state.newsRules : state.tickerRules;
  document.getElementById("rulesCountBadge").textContent = state.newsRules.filter(r => r.active).length + state.tickerRules.filter(r => r.active).length;
  document.getElementById("rulesListContainer").innerHTML = list.length ? list.map((r, idx) => `
    <div class="item-row" style="opacity:${r.active ? 1 : 0.55}">
      <label style="display:flex; align-items:flex-start; gap:8px; margin:0; color:var(--text); font-weight:600; cursor:pointer; flex:1;">
        <input type="checkbox" ${r.active ? "checked" : ""} onchange="toggleRule(${idx})" style="width:16px; height:16px; margin-top:4px;" />
        <span>${escapeHtml(r.text)}</span>
      </label>
      <button class="btn btn-outline btn-sm" onclick="deleteRule(${idx})">🗑️</button>
    </div>`).join("") : `<p class="muted-note">لا توجد قواعد مضافة.</p>`;
}

function persistRules() {
  SafeStorage.set("nr_rules_override", state.newsRules);
  SafeStorage.set("nr_ticker_rules_override", state.tickerRules);
  renderRules();
}

function addSingleRule() {
  const inp = document.getElementById("singleRuleInput");
  if (!inp.value.trim()) return;
  (state.ruleSubTab === "news" ? state.newsRules : state.tickerRules).push({ id: Date.now(), active: true, text: inp.value.trim() });
  inp.value = ""; persistRules(); showToast("✅ أُضيفت القاعدة");
}

function addBulkRules(replaceExisting) {
  const raw = document.getElementById("bulkRulesInput").value.trim();
  if (!raw) return;
  const lines = raw.split(/\n+/).map(l => l.replace(/^[\s\-*•\d.)(]+/, "").trim()).filter(Boolean);
  const target = state.ruleSubTab === "news" ? state.newsRules : state.tickerRules;
  if (replaceExisting) target.length = 0;
  lines.forEach((line, i) => target.push({ id: Date.now() + i, active: true, text: line }));
  document.getElementById("bulkRulesInput").value = ""; persistRules(); showToast(`✅ حُفظت ${lines.length} قاعدة`);
}

function toggleRule(idx) {
  const t = state.ruleSubTab === "news" ? state.newsRules : state.tickerRules;
  t[idx].active = !t[idx].active; persistRules();
}
function deleteRule(idx) {
  (state.ruleSubTab === "news" ? state.newsRules : state.tickerRules).splice(idx, 1); persistRules();
}
function resetCurrentRules() {
  if (state.ruleSubTab === "news") { SafeStorage.remove("nr_rules_override"); state.newsRules = JSON.parse(JSON.stringify(repoDefaults.newsRules)); }
  else { SafeStorage.remove("nr_ticker_rules_override"); state.tickerRules = JSON.parse(JSON.stringify(repoDefaults.tickerRules)); }
  renderRules(); showToast("🔄 استُعيدت قواعد ملفات المستودع");
}

function switchExSub(sub) {
  state.exSubTab = sub;
  document.getElementById("exSubNewsBtn").classList.toggle("active", sub === "news");
  document.getElementById("exSubTickerBtn").classList.toggle("active", sub === "ticker");
  document.getElementById("exCatWrapper").style.display = sub === "news" ? "block" : "none";
  renderExamples();
}

function renderExamples() {
  const repoList = state.exSubTab === "news" ? repoDefaults.newsIndex : repoDefaults.tickerIndex;
  const localList = state.exSubTab === "news" ? state.localNewsExamples : state.localTickerExamples;
  const totalCount = repoDefaults.newsIndex.length + repoDefaults.tickerIndex.length + state.localNewsExamples.length + state.localTickerExamples.length;
  document.getElementById("examplesCountBadge").textContent = totalCount;

  const combined = [
    ...localList.map((x, idx) => ({ ...x, _source: "local", _idx: idx })),
    ...repoList.map(x => ({ ...x, _source: "repo" }))
  ];

  const box = document.getElementById("examplesListContainer");
  if (!combined.length) {
    box.innerHTML = `<p class="muted-note">لا توجد أمثلة بعد.</p>`;
    return;
  }

  box.innerHTML = combined.map((ex, i) => `
    <div class="example-card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div>
          <strong>${escapeHtml(ex.title || ex.id)}</strong>
          <span class="chip ${ex._source === 'repo' ? 'chip-ok' : 'chip-warn'}" style="margin-right:6px;">
            ${ex._source === 'repo' ? `ملف منفصل (${escapeHtml(ex.file)})` : 'محفوظ بالمتصفح'}
          </span>
        </div>
        <div style="display:flex; gap:5px;">
          <button class="btn btn-outline btn-sm" onclick="inspectExample(${i})">👁️ عرض النص</button>
          ${ex._source === 'local' ? `<button class="btn btn-outline btn-sm" onclick="deleteLocalExample(${ex._idx})">🗑️</button>` : ""}
        </div>
      </div>
      <div id="exDetailBox-${i}" style="display:none; margin-top:8px;"></div>
    </div>
  `).join("");
}

async function inspectExample(combinedIdx) {
  const repoList = state.exSubTab === "news" ? repoDefaults.newsIndex : repoDefaults.tickerIndex;
  const localList = state.exSubTab === "news" ? state.localNewsExamples : state.localTickerExamples;
  const combined = [...localList, ...repoList];
  const item = combined[combinedIdx];
  const box = document.getElementById(`exDetailBox-${combinedIdx}`);
  if (box.style.display === "block") { box.style.display = "none"; return; }

  box.style.display = "block";
  box.innerHTML = `<span class="muted-note">⏳ جاري قراءة الملف المنفصل...</span>`;
  const detail = await loadExampleDetail(item);
  if (!detail) { box.innerHTML = `<span class="muted-note">تعذر قراءة الملف</span>`; return; }
  box.innerHTML = `
    <div class="example-cols">
      <div><small class="muted-note">الخام:</small><div class="mini-box">${escapeHtml(detail.raw)}</div></div>
      <div><small class="muted-note">المعتمد:</small><div class="mini-box">${escapeHtml(detail.edited)}</div></div>
    </div>`;
}

function addExamplePair() {
  const title = document.getElementById("exTitleInput").value.trim() || "مثال معتمد";
  const category = document.getElementById("exCategoryInput").value;
  const raw = document.getElementById("exRawInput").value.trim();
  const edited = document.getElementById("exEditedInput").value.trim();
  if (!raw || !edited) { showToast("⚠️ املأ الخانتين معاً"); return; }

  if (state.exSubTab === "news") {
    state.localNewsExamples.unshift({ id: "loc-" + Date.now(), title, category, raw, edited });
    SafeStorage.set("nr_local_news_ex", state.localNewsExamples);
  } else {
    state.localTickerExamples.unshift({ id: "loc-" + Date.now(), title, category: "شريط", raw, edited });
    SafeStorage.set("nr_local_ticker_ex", state.localTickerExamples);
  }
  document.getElementById("exTitleInput").value = "";
  document.getElementById("exRawInput").value = "";
  document.getElementById("exEditedInput").value = "";
  renderExamples();
  showToast("✅ حُفظ المثال!");
}

function deleteLocalExample(idx) {
  if (state.exSubTab === "news") {
    state.localNewsExamples.splice(idx, 1); SafeStorage.set("nr_local_news_ex", state.localNewsExamples);
  } else {
    state.localTickerExamples.splice(idx, 1); SafeStorage.set("nr_local_ticker_ex", state.localTickerExamples);
  }
  renderExamples();
}

function saveCurrentNewsAsExample() {
  const raw = document.getElementById("rawNewsInput").value.trim();
  const edited = document.getElementById("editedNewsOutput").value.trim();
  if (!raw || !edited) { showToast("⚠️ يلزم الخبر الخام والمحرر معاً"); return; }
  state.localNewsExamples.unshift({ id: "loc-" + Date.now(), title: edited.split("\n")[0].slice(0, 45), category: "عام", raw, edited });
  SafeStorage.set("nr_local_news_ex", state.localNewsExamples);
  renderExamples(); showToast("⭐ حُفظ في أمثلتك!");
}

function saveCurrentTickerAsExample() {
  const raw = document.getElementById("rawBulletinInput").value.trim();
  const edited = document.getElementById("tickerOutput").value.trim();
  if (!raw || !edited) { showToast("⚠️ يلزم النشرة الخام والشريط معاً"); return; }
  state.localTickerExamples.unshift({ id: "loc-" + Date.now(), title: `نشرة (${getCleanTickerItems().length} فقرة)`, category: "شريط", raw, edited });
  SafeStorage.set("nr_local_ticker_ex", state.localTickerExamples);
  renderExamples(); showToast("⭐ حُفظت النشرة وشريطها!");
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
  SafeStorage.set("nr_dict_override", state.dictionary);
  document.getElementById("dictBadInput").value = ""; document.getElementById("dictGoodInput").value = "";
  renderDictionary(); showToast("✅ أُضيف للقاموس");
}
function deleteDictItem(idx) {
  state.dictionary.splice(idx, 1); SafeStorage.set("nr_dict_override", state.dictionary); renderDictionary();
}

// =========================================================================
// Helpers & Export
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

async function copyCompiledPrompt(mode) {
  await copyTextSafe(await getCompiledByMode(mode));
  showToast("📋 تم نسخ الأمر الشامل!");
}

async function copyAndOpenWeb(mode, url, siteName) {
  const inputId = mode === "ticker" ? "rawBulletinInput" : "rawNewsInput";
  if (!document.getElementById(inputId).value.trim()) { showToast("⚠️ الصق النص الخام أولاً!"); return; }
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
  const mode = document.getElementById("tickerSeparator").value;
  if (mode === "bullet") return items.map(l => `• ${l}`).join("\n");
  if (mode === "dash") return items.map(l => `- ${l}`).join("\n");
  if (mode === "inline") return items.join("  •  ");
  return items.join("\n");
}
function refreshTickerPreviewBar() {
  const items = getCleanTickerItems();
  document.getElementById("liveTvCrawlPreview").textContent = items.length ? items.join("   🔴   ") : "معاينة فقرات الشريط على الشاشة...";
}
async function copyFormattedTicker() {
  const out = formatTickerForExport();
  if (!out) { showToast("⚠️ الشريط فارغ"); return; }
  await copyTextSafe(out); showToast("✅ تم نسخ الشريط!");
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
  const cur = document.getElementById("rawBulletinInput").value.trim();
  document.getElementById("rawBulletinInput").value = cur ? (cur + "\n\n" + source) : source;
  updateBulletinStats(); switchTab("ticker", document.querySelectorAll(".tab-btn")[1]);
}
function loadSampleRawNews() {
  document.getElementById("rawNewsInput").value = `بيان صحفي صادر عن مؤسسة الكهرباء والطاقة:\nتم مساءاً اليوم الاحد عقد إجتماع طارئ في مقر المؤسسة العام واكد المهندس خالد المنصور مدير عام المؤسسة على ان الفرق الهندسية تواصل العمل منذ 48 ساعة لإصلاح العطل الطارئ في محطة التوليد رقم 3 والذي تسبب في إنقطاع التيار عن 4 مديريات، واوضح في تصريحه ان نسبة الإنجاز وصلت الى 85% وان التيار سيعود تدريجياً بحلول الساعة 10 ليلاً.`;
  updateRawStats(); runQualityRadar();
}
function loadSampleBulletin() {
  document.getElementById("rawBulletinInput").value = `أولاً: عقدت لجنة الطوارئ والمناخ اليوم إجتماعاً موسعاً لمناقشة تداعيات المنخفض الجوي، واكد رئيس اللجنة في تصريح صحفي على رفع الجاهزية في 5 محافظات ساحلية وجبلية، واضاف ان فرق الإنقاذ فتحت 12 طريقاً فرعياً تضررت من السيول، محذراً المواطنين من التواجد في بطون الأودية خلال الـ 24 ساعة القادمة.\n\nثانياً: اعلن البنك المركزي اليوم عن ضخ دفعة جديدة لتغطية إستيراد السلع الأساسية بقيمة 45 مليون دولار، واوضح مصدر مسؤول في البنك ان هذه الإجراءات تهدف الى إستقرار اسعار الصرف وتأمين المخزون الغذائي لشهر نوفمبر.`;
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
  try { const t = await navigator.clipboard.readText(); if (t) { document.getElementById(id).value = t; updateRawStats(); updateBulletinStats(); } }
  catch (e) { showToast("اضغط داخل المربع واستخدم Ctrl+V"); }
}
function clearNewsDesk() {
  document.getElementById("rawNewsInput").value = ""; document.getElementById("editedNewsOutput").value = "";
  document.getElementById("statusBar").className = "status-bar"; updateRawStats(); runQualityRadar();
}
function clearTickerDesk() {
  document.getElementById("rawBulletinInput").value = ""; document.getElementById("tickerOutput").value = "";
  document.getElementById("tickerStatusBar").className = "status-bar"; updateBulletinStats(); runTickerRadar();
}
async function copyOutput(id) {
  const t = document.getElementById(id).value.trim(); if (!t) return;
  await copyTextSafe(t); showToast("✅ تم النسخ!");
}
function adoptComparison(which) {
  document.getElementById("editedNewsOutput").value = document.getElementById("compOutput" + which).value; runQualityRadar();
}
function saveApiKeys() {
  state.keys = {
    gemini: document.getElementById("geminiKeyInput").value.trim(),
    groq: document.getElementById("groqKeyInput").value.trim(),
    openrouter: document.getElementById("openrouterKeyInput").value.trim()
  };
  SafeStorage.set("nr_keys_v1", state.keys); populateEngineSelectors();
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
}
function exportBackup() {
  const payload = { newsRules: state.newsRules, tickerRules: state.tickerRules, localNewsExamples: state.localNewsExamples, localTickerExamples: state.localTickerExamples, dictionary: state.dictionary };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  a.download = "newsroom-backup.json"; a.click();
}
function importBackup(ev) {
  const f = ev.target.files?.[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (d.newsRules) { state.newsRules = d.newsRules; SafeStorage.set("nr_rules_override", d.newsRules); }
      if (d.tickerRules) { state.tickerRules = d.tickerRules; SafeStorage.set("nr_ticker_rules_override", d.tickerRules); }
      if (d.dictionary) { state.dictionary = d.dictionary; SafeStorage.set("nr_dict_override", d.dictionary); }
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
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3600);
}
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

init();
