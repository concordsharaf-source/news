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
  gemini: {
    label: "🟣 Google Gemini المجاني (يعمل باليمن بدون VPN ✅)",
    models: [
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (الأحدث والأدق للتحرير - مجاني)" },
      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite (سريع جداً وحصة مجانية كبيرة)" },
      { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash (مجاني)" },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (للتحليل والنشرات الضخمة)" }
    ]
  },
  groq: {
    label: "⚡ Groq السريع المجاني (عبر جسر Vercel لليمن ✅)",
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
  }
};

const FORMAT_INSTRUCTIONS = {
  lvo_standard: `التزم حرفياً بالهيكل والقالب الفني المعتمد التالي سطراً بسطر:
- السطر الأول: اسم المنطقة أو الجبهة فقط (مثل: قطاع غزة / الضفة الغربية / جنوب لبنان).
- السطر الثاني: كبشن تحريري رئيسي مباشر ومكثف (نحو عشر كلمات) يعبر عن جوهر الحدث بدون نقطة في نهايته.
- المقدمة (الفقرة الأولى): فقرة قصيرة ومباشرة تبدأ بالفعل الحدثي المبني للمعلوم (أفادت، أعلن، استشهد، استهدف، قتل...) وتلخص الحدث الأساسي فوراً.
- الفاصل: ضع الرمز lvo وحده على سطر منفصل مستقل تماماً بين المقدمة وبقية التفاصيل.
- الفقرة الثانية (بعد lvo): تبدأ بصيغة موحدة: «وأفادت مصادر إعلامية أن...» أو «وأفادت مصادر طبية أن...» (عند وجود شهداء وجرحى) لتفصيل الحدث الأبرز والحصيلة بالأرقام المكتوبة بالحروف.
- الفقرة الثالثة: تبدأ بصيغة: «وأضافت المصادر...» لتفصيل التطورات الميدانية ومواقع الاستهداف والإصابات والأضرار بدقة نحوية.
- الفقرة الختامية: فقرة قصيرة تضع السياق العام للحدث (استمرار الخروقات للهدنة الهشة، أو تصعيد الاعتداءات، أو تداعيات حرب الإبادة الصهيونية والحصار).`,

  short_news: `حرر الخبر بإيجاز شديد دون فاصل lvo: السطر الأول المنطقة، السطر الثاني كبشن تحريري من عشر كلمات، يليه فقرتان قصيرتان تبدأ الأولى بالفعل الحدثي المبني للمعلوم والثانية بـ «وأفادت مصادر...» مع الالتزام الكامل بكتابة الأرقام بالحروف وكافة المصطلحات الثابتة.`,

  breaking: `صغ كبشن تحريري عاجل ومباشر مكوّن من عشر كلمات تقريباً يعبر عن جوهر الحدث بأقصر وأدق العبارات مع الالتزام التام بالمصطلحات الثابتة وكتابة الأرقام بالحروف.`,

  proofread: `حافظ على النص وهيكله كما هو، ونفّذ تدقيقاً لغوياً وإملائياً ومصطلحياً صارماً فقط: حوّل أي رقم إلى حروف، واكتب «مائة» ومشتقاتها بالألف الفارقة، واستبدل أي مصطلح مخالف بالمصطلح المعتمد، واحذف الظروف الزمنية الممنوعة والاتجاهات الفرعية وأسماء الوكالات.`
};

const exampleFileCache = {};
let repoDefaults = { newsRules: [], tickerRules: [], dictionary: [], newsIndex: [], tickerIndex: [] };

let state = {
  newsRules: [],
  tickerRules: [],
  dictionary: [],
  localNewsExamples: SafeStorage.get("nr_local_news_ex", []),
  localTickerExamples: SafeStorage.get("nr_local_ticker_ex", []),
  keys: SafeStorage.get("nr_keys_v1", { gemini: "", groq: "", openrouter: "", github: "" }),
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
  document.getElementById("githubTokenInput").value = state.keys.github || "";

  populateEngineSelectors();

  const [nRules, tRules, dict, nIdx, tIdx] = await Promise.all([
    fetchJsonSafe("data/news-rules.json", []),
    fetchJsonSafe("data/ticker-rules.json", []),
    fetchJsonSafe("data/dictionary.json", []),
    fetchJsonSafe("data/news-examples/index.json", []),
    fetchJsonSafe("data/ticker-examples/index.json", [])
  ]);

  repoDefaults = { newsRules: nRules, tickerRules: tRules, dictionary: dict, newsIndex: nIdx, tickerIndex: tIdx };

  // Merge repo rules with any newly added local rules that aren't in repo yet
  const localNewsOverride = SafeStorage.get("nr_rules_override_v2", null);
  const localTickerOverride = SafeStorage.get("nr_ticker_rules_override_v2", null);
  const localDictOverride = SafeStorage.get("nr_dict_override_v2", null);

  state.newsRules = localNewsOverride || JSON.parse(JSON.stringify(nRules));
  state.tickerRules = localTickerOverride || JSON.parse(JSON.stringify(tRules));
  state.dictionary = localDictOverride || JSON.parse(JSON.stringify(dict));

  renderRules();
  renderExamples();
  renderDictionary();
  runQualityRadar();
  runTickerRadar();
}

function populateEngineSelectors() {
  const pSel = document.getElementById("primaryEngineSelect");
  const sSel = document.getElementById("secondaryEngineSelect");
  pSel.innerHTML = ""; sSel.innerHTML = "";
  for (const [k, v] of Object.entries(ENGINES)) {
    pSel.innerHTML += `<option value="${k}">${v.label}</option>`;
    sSel.innerHTML += `<option value="${k}">${v.label}</option>`;
  }
  if (state.keys.gemini) pSel.value = "gemini";
  else if (state.keys.groq) pSel.value = "groq";
  else if (state.keys.openrouter) pSel.value = "openrouter";
  else pSel.value = "gemini"; // Always default to free Google Gemini, never Puter!

  sSel.value = state.keys.groq ? "groq" : "gemini";
  updateModelDropdown("primary");
  updateModelDropdown("secondary");

  const banner = document.getElementById("missingKeyBanner");
  if (banner) {
    const hasAnyKey = !!(state.keys.gemini || state.keys.groq || state.keys.openrouter);
    banner.style.display = hasAnyKey ? "none" : "block";
  }
}

function saveQuickGeminiKey() {
  const val = (document.getElementById("quickGeminiKeyInput")?.value || "").trim();
  if (!val) { showToast("⚠️ الصق المفتاح أولاً"); return; }
  document.getElementById("geminiKeyInput").value = val;
  saveApiKeys();
  showToast("✅ تم حفظ مفتاح Gemini بنجاح! يمكنك التحرير الآن فوراً");
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
  const cat = document.getElementById("newsCategory").value;
  const extraNote = document.getElementById("extraNote").value.trim();
  const chosenExamples = await getRelevantNewsExamples(cat, 3);

  const rulesBlock = activeRules.map((r, i) => `${i + 1}. ${r.text}`).join("\n");
  const dictBlock = state.dictionary.slice(0, 35).map(d => `- يُمنع «${d.bad}» والصواب المعتمد «${d.good}»`).join("\n");
  const examplesBlock = chosenExamples.map((ex, idx) =>
    `<مثال_${idx + 1}>\n[الخبر الخام]:\n${ex.raw}\n\n[الصياغة المحررة المعتمدة لدينا]:\n${ex.edited}\n</مثال_${idx + 1}>`
  ).join("\n\n");

  let frontHint = "";
  if (cat === "غزة") frontHint = "تنبيه جبهة غزة: التزم تسمية «قوات العدو الصهيوني»، ووصف العدوان بـ «حرب إبادة صهيونية»، ووقف إطلاق النار بـ «هدنة هشة»، و«فلسطيني» بدل «مواطن».";
  if (cat === "الضفة") frontHint = "تنبيه جبهة الضفة الغربية: التزم تسمية «قوات الاحتلال الصهيوني»، ويُمنع ذكر أسماء المعتقلين نهائياً، واستخدم «فلسطيني» بدل «مواطن»، و«مداهمة» بدل «دهم».";

  return `أنت رئيس ديسك تحرير إخباري ومدقق لغوي عربي محترف وصارم جداً.
مهمتك: تحرير <الخبر_الخام_الجديد> مع الالتزام الحرفي المطلق بـ <قواعد_التحرير_الإلزامية> و<قالب_المخرج_المطلوب> ومحاكاة أسلوب <الأمثلة_المرجعية> دون اختلاق أي معلومة أو تعليق ذاتي.

<قواعد_التحرير_الإلزامية>
${rulesBlock}
</قواعد_التحرير_الإلزامية>

<قائمة_المصطلحات_الثابتة_والممنوعات>
${dictBlock}
${frontHint}
- تذكير حاسم جداً: الأرقام تُكتب بالحروف العربية دائماً (يُمنع وجود أي رقم مثل 5 أو 12 أو 2026)، و«مائة» ومشتقاتها تُكتب بالألف الفارقة دائماً (مائة، أربعمائة، خمسمائة، سبعمائة).
- تذكير حاسم جداً: يُمنع ذكر اليوم أو التاريخ أو عبارات (اليوم، أمس، الليلة الماضية، الأسبوع الماضي) أو الأشهر السريانية أو الاتجاهات الفرعية (شمال شرق، جنوب غرب) أو أسماء الوكالات والمراسلين أو أسماء معتقلي الضفة.
</قائمة_المصطلحات_الثابتة_والممنوعات>

${examplesBlock ? `<الأمثلة_المرجعية_لتعلّم_الأسلوب_والقالب_فقط>
تنبيه حاسم: هذه الأمثلة لتعلّم القالب والأسلوب فقط؛ إياك أن تنقل منها أي واقعة أو حصيلة إلى خبر اليوم!
${examplesBlock}
</الأمثلة_المرجعية_لتعلّم_الأسلوب_والقالب_فقط>` : ""}

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
    ? "عند تفكيك تصريح لمصدر أو مسؤول إلى عدة فقرات، كرّر اسم المصدر باختصار في مطلع كل فقرة متفرعة حتى تكون كل فقرة مفهومة ومستقلة تماماً على الشاشة."
    : "اذكر المصدر بوضوح وصُغ كل فقرة كجملة خبرية تامة مستقلة بذاتها دون ضمائر عائدة مجهولة.";

  return `أنت محرر شريط إخباري تلفزيوني محترف ومدقق لغوي صارم.
مهمتك: تحويل وتفكيك <النشرة_الإخبارية_الخام> بالكامل إلى فقرات شريط إخباري متتالية وفق <قواعد_الشريط_الإخباري> والمصطلحات الثابتة وأسلوب <أمثلة_النشرات_السابقة>.

<قواعد_الشريط_الإخباري>
${rulesBlock}
- الحد الأقصى لطول كل فقرة: ${maxWords} كلمة.
- ${attrInstruction}
</قواعد_الشريط_الإخباري>

<المصطلحات_الثابتة_والضبط_اللغوي>
${dictBlock}
- التزم تسمية «قوات العدو الصهيوني» في غزة و«قوات الاحتلال الصهيوني» في الضفة، وكتابة «مائة» بالألف الفارقة دائماً، وسلامة الهمزات والإملاء.
</المصطلحات_الثابتة_والضبط_اللغوي>

${examplesBlock ? `<أمثلة_النشرات_السابقة>
تنبيه: هذه الأمثلة لتعلّم طريقة التفكيك والصياغة فقط؛ لا تنقل منها أي خبر إلى نشرة اليوم!
${examplesBlock}
</أمثلة_النشرات_السابقة>` : ""}

${extraNote ? `<توجيه_إضافي>\n${extraNote}\n</توجيه_إضافي>` : ""}

<النشرة_الإخبارية_الخام>
${rawBulletin}
</النشرة_الإخبارية_الخام>

أخرج كل فقرة من فقرات الشريط في سطر مستقل وحدها دون ترقيم ودون مقدمات.`;
}

function buildProofreaderPrompt(rawText, draftText, mode) {
  const rules = (mode === "ticker" ? state.tickerRules : state.newsRules)
    .filter(r => r.active)
    .map((r, i) => `${i + 1}. ${r.text}`)
    .join("\n");

  const modeChecks = mode === "news"
    ? `- تحقق بصرامة: هل جميع الأرقام حُوّلت إلى حروف عربية؟ هل كُتبت «مائة» ومشتقاتها بالألف الفارقة؟ هل حُذفت كلمات (اليوم، أمس، الليلة الماضية، الأسبوع الماضي) والأشهر السريانية والاتجاهات الفرعية وأسماء الوكالات والمراسلين وأسماء معتقلي الضفة؟ هل وُضع الفاصل lvo في سطره المستقل (إن كان القالب القياسي)؟ هل استُخدم «صهيوني» بدل «إسرائيلي» و«فلسطيني» بدل «مواطن»؟`
    : `- تحقق أن كل سطر يمثل فقرة شريط مستقلة المعنى لا تبدأ بضمير عائم مجهول (وأضاف أن / وأشار إلى)، ملتزماً بالمصطلحات المعتمدة وسلامة الإملاء والهمزات.`;

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

async function callModel(engine, model, promptText) {
  const apiKey = (state.keys[engine] || "").trim();

  // Try Vercel Serverless Bridge (/api/ai) first — also supports GEMINI_API_KEY / GROQ_API_KEY stored in Vercel Environment Variables!
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
      return (bridgeData.text || "").trim();
    }
  } catch (bridgeErr) {
    if (bridgeErr.message && !bridgeErr.message.includes("Failed to fetch") && !bridgeErr.message.includes("Load failed") && !bridgeErr.message.includes("NetworkError")) {
      throw bridgeErr;
    }
  }

  if (!apiKey) {
    throw new Error(`يرجى لصق مفتاح ${engine.toUpperCase()} المجاني أولاً في تبويب «⚡ الربط والمزامنة» (أو في المربع الأصفر أعلاه).`);
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
    let res = await directGemini(model, true);
    if (!res.ok && (res.d?.error?.message || "").toLowerCase().includes("thinking")) {
      res = await directGemini(model, false);
    }
    if (!res.ok) {
      const msg = res.d?.error?.message || "";
      const m = msg.match(/models\/(gemini-[a-zA-Z0-9.-]+)/);
      if (m && m[1] && m[1] !== model) res = await directGemini(m[1], true);
    }
    if (!res.ok) throw new Error(res.d?.error?.message || "تعذر الاتصال بـ Gemini API");
    const parts = res.d?.candidates?.[0]?.content?.parts || [];
    return parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
  }

  const endpoint = engine === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: promptText }], temperature: 0.1 })
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
      setStatus("statusBar", "statusText", "info", "⏳ المرحلة 1: جاري صياغة الخبر وفق القالب المعتمد (lvo)...");
      let draft = cleanAiMetaText(await callModel(pEng, pMod, prompt));
      document.getElementById("editedNewsOutput").value = draft;
      runQualityRadar();

      if (twoStageOn && state.selectedFormat !== "proofread") {
        setStatus("statusBar", "statusText", "info", "🩺 المرحلة 2: المدقق اللغوي يراجع الأرقام بالحروف والمصطلحات والإملاء...");
        draft = cleanAiMetaText(await callModel(pEng, pMod, buildProofreaderPrompt(raw, draft, "news")));
        document.getElementById("editedNewsOutput").value = draft;
        runQualityRadar();
      }
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
      setStatus("tickerStatusBar", "tickerStatusText", "info", "🩺 المرحلة 2: التدقيق اللغوي وفحص استقلالية الفقرات والمصطلحات...");
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

  // 4. Palestinian context check: forbid "مواطن / مواطنين" & enforce Gaza/WestBank force naming
  const isPal = /(غزة|الضفة|القدس|فلسطين|جنين|نابلس|طولكرم|الخليل|رام الله|رفح|خان يونس|جباليا|النصيرات)/.test(text);
  if (isPal && /(^|\s)(مواطن|مواطنان|مواطنين|مواطنون|المواطنين)(?=[\s،.:؛]|$)/.test(text)) {
    issues.push({ type: "err", msg: `في الأخبار الفلسطينية نكتب «فلسطيني/فلسطينيين» وليس «مواطن»!` });
  }
  if (text.includes("غزة") && text.includes("قوات الاحتلال")) {
    issues.push({ type: "warn", msg: `تنبيه مصطلح غزة: المعتمد في أخبار غزة «قوات العدو الصهيوني»` });
  }
  if (text.includes("الضفة") && text.includes("قوات العدو")) {
    issues.push({ type: "warn", msg: `تنبيه مصطلح الضفة: المعتمد في أخبار الضفة «قوات الاحتلال الصهيوني»` });
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
  return document.getElementById("tickerOutput").value.split(/\n+/).map(l => l.replace(/^[\s\-*•]+/, "").trim()).filter(Boolean);
}

function runTickerRadar() {
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
    alertsBox.innerHTML = `<span class="muted-note">يفحص الطول والضمائر المبتورة والمصطلحات الثابتة والإملاء تلقائياً.</span>`;
    linesBox.innerHTML = "";
    return;
  }

  let issues = scanPolicyViolations(editedAll);
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
    alertsBox.innerHTML = `<span class="chip chip-ok">✔ جميع الفقرات (${items.length}) سليمة ومستقلة المعنى ومطابقة للمصطلحات!</span>`;
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

  // Apply all dictionary & fixed-term replacements (longer phrases first!)
  const sortedDict = [...state.dictionary].sort((a, b) => (b.bad || "").length - (a.bad || "").length);
  sortedDict.forEach(({ bad, good }) => {
    if (bad) txt = txt.split(bad).join(good);
  });

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
  showToast("✨ تم تصحيح المصطلحات الثابتة والمائة والأشهر والهمزات فوراً!");
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

    // Promote any local examples into their own separate JSON files in GitHub!
    if (state.localNewsExamples.length > 0) {
      const newIndex = [...repoDefaults.newsIndex];
      for (const ex of state.localNewsExamples) {
        const slug = `news-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        const path = `data/news-examples/${slug}.json`;
        await githubPutFile(token, path, { id: slug, title: ex.title, category: ex.category, raw: ex.raw, edited: ex.edited }, `إضافة مثال خبر منفصل: ${ex.title}`);
        newIndex.unshift({ id: slug, title: ex.title, category: ex.category, file: path });
      }
      await githubPutFile(token, "data/news-examples/index.json", newIndex, "تحديث فهرس أمثلة الأخبار");
      repoDefaults.newsIndex = newIndex;
      state.localNewsExamples = [];
      SafeStorage.set("nr_local_news_ex", []);
    }

    if (state.localTickerExamples.length > 0) {
      const newTIndex = [...repoDefaults.tickerIndex];
      for (const ex of state.localTickerExamples) {
        const slug = `bulletin-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        const path = `data/ticker-examples/${slug}.json`;
        await githubPutFile(token, path, { id: slug, title: ex.title, category: "شريط", raw: ex.raw, edited: ex.edited }, `إضافة مثال نشرة منفصل: ${ex.title}`);
        newTIndex.unshift({ id: slug, title: ex.title, category: "شريط", file: path });
      }
      await githubPutFile(token, "data/ticker-examples/index.json", newTIndex, "تحديث فهرس أمثلة النشرات");
      repoDefaults.tickerIndex = newTIndex;
      state.localTickerExamples = [];
      SafeStorage.set("nr_local_ticker_ex", []);
    }

    renderExamples();
    showToast("✅ تم حفظ كافة القواعد والأمثلة في ملفاتها المنفصلة على GitHub! سيتحدث Vercel تلقائياً.");
  } catch (err) {
    showToast(`⚠️ خطأ مزامنة GitHub: ${err.message}`);
  }
}

// =========================================================================
// Examples & Dictionary UI
// =========================================================================
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
  document.getElementById("examplesCountBadge").textContent = repoDefaults.newsIndex.length + repoDefaults.tickerIndex.length + state.localNewsExamples.length + state.localTickerExamples.length;

  const combined = [
    ...localList.map((x, idx) => ({ ...x, _source: "local", _idx: idx })),
    ...repoList.map(x => ({ ...x, _source: "repo" }))
  ];

  const box = document.getElementById("examplesListContainer");
  if (!combined.length) { box.innerHTML = `<p class="muted-note">لا توجد أمثلة بعد.</p>`; return; }

  box.innerHTML = combined.map((ex, i) => `
    <div class="example-card">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
        <div>
          <strong>${escapeHtml(ex.title || ex.id)}</strong>
          <span class="chip ${ex._source === 'repo' ? 'chip-ok' : 'chip-warn'}" style="margin-right:6px;">
            ${ex._source === 'repo' ? `ملف منفصل (${escapeHtml(ex.file)})` : 'جديد بالمتصفح (جاهز للرفع لـ GitHub)'}
          </span>
        </div>
        <div style="display:flex; gap:5px;">
          <button class="btn btn-outline btn-sm" onclick="inspectExample(${i})">👁️ عرض</button>
          ${ex._source === 'local' ? `<button class="btn btn-outline btn-sm" onclick="deleteLocalExample(${ex._idx})">🗑️</button>` : ""}
        </div>
      </div>
      <div id="exDetailBox-${i}" style="display:none; margin-top:8px;"></div>
    </div>`).join("");
}

async function inspectExample(combinedIdx) {
  const repoList = state.exSubTab === "news" ? repoDefaults.newsIndex : repoDefaults.tickerIndex;
  const localList = state.exSubTab === "news" ? state.localNewsExamples : state.localTickerExamples;
  const item = [...localList, ...repoList][combinedIdx];
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
  showToast("✅ حُفظ المثال! (اضغط «☁️ حفظ في GitHub» متى أردت تحويله لملف منفصل دائم)");
}

function deleteLocalExample(idx) {
  if (state.exSubTab === "news") { state.localNewsExamples.splice(idx, 1); SafeStorage.set("nr_local_news_ex", state.localNewsExamples); }
  else { state.localTickerExamples.splice(idx, 1); SafeStorage.set("nr_local_ticker_ex", state.localTickerExamples); }
  renderExamples();
}

function saveCurrentNewsAsExample() {
  const raw = document.getElementById("rawNewsInput").value.trim();
  const edited = document.getElementById("editedNewsOutput").value.trim();
  if (!raw || !edited) { showToast("⚠️ يلزم الخبر الخام والمحرر معاً"); return; }
  state.localNewsExamples.unshift({ id: "loc-" + Date.now(), title: edited.split("\n").slice(0,2).join(" - ").slice(0, 50), category: "عام", raw, edited });
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

async function copyCompiledPrompt(mode) {
  await copyTextSafe(await getCompiledByMode(mode));
  showToast("📋 تم نسخ الأمر الشامل مع القواعد الـ 23 والمصطلحات الثابتة!");
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
  document.getElementById("rawNewsInput").value = `مراسل وكالة رويترز: اليوم الأربعاء الموافق 29 تشرين الأول استشهد 7 مواطنين وأصيب 15 آخرين جراء قصف طائرات الجيش الإسرائيلي لخيام النازحين في شمال شرق مدينة رفح جنوب قطاع غزة، إلى جانب تدمير 3 منازل مجاورة، وقالت مصادر طبية أمس إن أكثر من 500 جريح بحاجة لتدخل جراحي عاجل في ظل استمرار خرق وقف إطلاق النار.`;
  updateRawStats(); runQualityRadar();
  showToast("🧪 أُدرج خبر خام تجريبي لاختبار تحويل الأرقام للحروف وفاصل lvo والمصطلحات الثابتة!");
}
function loadSampleBulletin() {
  document.getElementById("rawBulletinInput").value = `الخبر الأول: استشهد أربعة فلسطينيين وأصيب آخرون نتيجة قصف طائرات العدو الصهيوني منزلاً في مخيم النصيرات وسط قطاع غزة خلال الساعات الماضية، وأفادت مصادر طبية أن من بين الشهداء طفلين وامرأة.\n\nالخبر الثاني: شنت قوات الاحتلال الصهيوني حملة مداهمات واسعة في مدينة الخليل بالضفة الغربية أسفرت عن اعتقال اثني عشر فلسطينياً واقتحام عدد من المنازل.`;
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
    openrouter: document.getElementById("openrouterKeyInput").value.trim(),
    github: document.getElementById("githubTokenInput").value.trim()
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
      keys.filter(k => k !== "mihbarah-pwa-v6").forEach(k => caches.delete(k));
    }).catch(() => {});
  }

  // 1. Register Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js?v=6").then(reg => {
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
