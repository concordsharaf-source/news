// Vercel Serverless AI Proxy (Runs on US servers — works in Yemen without VPN!)
// Supports:
// 1. instant_free (100% keyless, zero signup, zero credit card — Nemotron 550B + OpenAI GPT-OSS 120B + Meta Llama 3.3 70B with automatic failover!)
// 2. Optional user keys: groq (auto-failover across GPT-OSS 120B, Qwen 3.8 27B, GPT-OSS 20B + retired Llama ID remapping), openrouter, gemini

import fs from "node:fs";

export const config = {
  maxDuration: 60
};

const VAULT_SALT = "MihbarahNewsroomVault2026!#Yemen";
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

function readSharedVaultKeys() {
  try {
    const raw = fs.readFileSync(new URL("../data/shared-keys.json", import.meta.url), "utf8");
    const parsed = JSON.parse(raw);
    return {
      groq: decodeVaultValue(parsed.groq),
      openrouter: decodeVaultValue(parsed.openrouter),
      gemini: decodeVaultValue(parsed.gemini)
    };
  } catch (e) {
    return { groq: "", openrouter: "", gemini: "" };
  }
}

function stripThinkTags(txt) {
  return String(txt || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function callKeylessRoute(route, prompt) {
  if (route === "nemotron-550b") {
    const r = await fetch("https://api.kilo.ai/api/gateway/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer anonymous",
        "Content-Type": "application/json",
        "User-Agent": "MihbarahNewsroom/10.0"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-ultra-550b-a55b:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 8192
      }),
      signal: AbortSignal.timeout(45000)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `Kilo HTTP ${r.status}`);
    const text = stripThinkTags(d?.choices?.[0]?.message?.content);
    if (!text) throw new Error("Empty response from Nemotron-550B");
    return text;
  }

  if (route === "gpt-oss-120b") {
    const r = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MihbarahNewsroom/10.0"
      },
      body: JSON.stringify({
        model: "gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 8192,
        reasoning_effort: "low"
      }),
      signal: AbortSignal.timeout(38000)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `OVH HTTP ${r.status}`);
    const text = stripThinkTags(d?.choices?.[0]?.message?.content);
    if (!text) throw new Error("Empty response from GPT-OSS-120B");
    return text;
  }

  // Meta-Llama-3_3-70B-Instruct on OVHcloud keyless
  const r = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "MihbarahNewsroom/10.0"
    },
    body: JSON.stringify({
      model: "Meta-Llama-3_3-70B-Instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 8192
    }),
    signal: AbortSignal.timeout(32000)
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `OVH Llama HTTP ${r.status}`);
  const text = stripThinkTags(d?.choices?.[0]?.message?.content);
  if (!text) throw new Error("Empty response from Llama-3.3-70B");
  return text;
}

async function tryAllKeylessRoutes(preferred, prompt) {
  const allRoutes = ["nemotron-550b", "gpt-oss-120b", "llama-3.3-70b"];
  const start = allRoutes.includes(preferred) ? preferred : "nemotron-550b";
  const ordered = [start, ...allRoutes.filter(x => x !== start)];
  let lastErr = null;
  for (const route of ordered) {
    try {
      const text = await callKeylessRoute(route, prompt);
      return { ok: true, text, usedRoute: route };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, error: lastErr?.message || "timeout" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { engine, model, prompt, apiKey } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "البرومبت مفقود" });
    }

    // =====================================================================
    // 1. INSTANT FREE (100% Keyless, Zero Account, Zero Credit Card!)
    // =====================================================================
    if (!engine || engine === "instant_free" || model === "ovh-meta-llama-3.3-70b") {
      const targetRoute = model === "ovh-meta-llama-3.3-70b" ? "llama-3.3-70b" : (model || "nemotron-550b");
      const resKeyless = await tryAllKeylessRoutes(targetRoute, prompt);
      if (resKeyless.ok) {
        return res.status(200).json({ text: resKeyless.text, usedRoute: resKeyless.usedRoute });
      }
      if (!engine || engine === "instant_free") {
        return res.status(502).json({
          error: `جميع المحركات الفورية مشغولة حالياً (${resKeyless.error}). أعد المحاولة بعد ثوانٍ أو استخدم زر Arena.ai.`
        });
      }
    }

    const vaultKeys = readSharedVaultKeys();
    const envKeys = {
      gemini: process.env.GEMINI_API_KEY || vaultKeys.gemini || "",
      groq: process.env.GROQ_API_KEY || vaultKeys.groq || "",
      openrouter: process.env.OPENROUTER_API_KEY || vaultKeys.openrouter || ""
    };
    const effectiveKey = (apiKey || envKeys[engine] || "").trim();

    if (!effectiveKey) {
      return res.status(400).json({
        error: `لم يتم إدخال مفتاح ${engine.toUpperCase()} بعد. اختر المحرك الأول «🟢 مجاني فوري بدون مفتاح» للتحرير المباشر بدون أي اشتراك أو مفتاح!`
      });
    }

    // =====================================================================
    // 2. Google Gemini API
    // =====================================================================
    if (engine === "gemini") {
      async function tryGeminiModel(targetModel, useLowThinking) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(effectiveKey)}`;
        const generationConfig = { temperature: 0.1 };
        if (useLowThinking && targetModel.includes("3.8")) {
          generationConfig.thinkingConfig = { thinkingLevel: "low" };
        }
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig
          })
        });
        const d = await r.json();
        return { ok: r.ok, status: r.status, data: d };
      }

      let attempt = await tryGeminiModel(model, true);
      if (!attempt.ok) {
        const errMsg = attempt.data?.error?.message || "";
        if (errMsg.toLowerCase().includes("thinking")) {
          attempt = await tryGeminiModel(model, false);
        }
      }
      if (!attempt.ok) {
        const errMsg = attempt.data?.error?.message || "";
        const match = errMsg.match(/models\/(gemini-[a-zA-Z0-9.-]+)/);
        const suggested = match ? match[1] : (model !== "gemini-3.8-flash" ? "gemini-3.8-flash" : "gemini-3.5-flash-lite");
        if (suggested && suggested !== model) {
          attempt = await tryGeminiModel(suggested, true);
        }
      }
      if (!attempt.ok) {
        return res.status(attempt.status).json({ error: attempt.data?.error?.message || "خطأ من خادم Gemini" });
      }
      const parts = attempt.data?.candidates?.[0]?.content?.parts || [];
      const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
      return res.status(200).json({ text });
    }

    // =====================================================================
    // 3. Groq API (Active Oct 2026 Free Tier + Auto-Remap Retired Llama IDs + Failover!)
    // =====================================================================
    if (engine === "groq") {
      const retiredToActive = {
        "meta-llama/llama-4-scout-17b-16e-instruct": "openai/gpt-oss-120b",
        "meta-llama/llama-4-maverick-17b-128e-instruct": "openai/gpt-oss-120b",
        "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
        "llama-3.1-8b-instant": "openai/gpt-oss-20b",
        "qwen/qwen3-32b": "qwen/qwen3.8-27b",
        "qwen/qwen3.6-27b": "qwen/qwen3.8-27b"
      };
      const activeGroqPool = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
      const primaryGroqModel = retiredToActive[model] || (model && !model.includes("llama") ? model : "openai/gpt-oss-120b");
      const candidates = [primaryGroqModel, ...activeGroqPool.filter(m => m !== primaryGroqModel)];

      async function callSingleGroq(targetModel, minimal = false) {
        const payload = {
          model: targetModel,
          messages: [{ role: "user", content: prompt }],
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
          headers: {
            "Authorization": `Bearer ${effectiveKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(35000)
        });
        const d = await r.json();
        return { ok: r.ok, status: r.status, data: d };
      }

      let lastGroqErr = "";
      for (const candidate of candidates) {
        let resGroq = await callSingleGroq(candidate, false);
        if (!resGroq.ok && resGroq.status === 400) {
          // Retry without optional reasoning params if schema changed
          resGroq = await callSingleGroq(candidate, true);
        }
        if (resGroq.ok) {
          const text = stripThinkTags(resGroq.data?.choices?.[0]?.message?.content);
          if (text) return res.status(200).json({ text, usedModel: candidate });
        }
        if (resGroq.status === 401) {
          return res.status(401).json({
            error: "مفتاح Groq غير صالح. تأكد من نسخه بشكل صحيح أو اختر المحرك الأول «🟢 مجاني فوري 100%» الذي يعمل بدون أي مفتاح."
          });
        }
        lastGroqErr = resGroq.data?.error?.message || `Groq HTTP ${resGroq.status}`;
      }

      // Ultimate safety net: if all Groq models hit temporary 429 TPM rate limits, complete seamlessly via keyless route!
      const backup = await tryAllKeylessRoutes("llama-3.3-70b", prompt);
      if (backup.ok) {
        return res.status(200).json({ text: backup.text, usedRoute: backup.usedRoute });
      }
      return res.status(502).json({ error: lastGroqErr || "خطأ من خادم Groq" });
    }

    // =====================================================================
    // 4. OpenRouter Free API (with automatic fallback to openrouter/free)
    // =====================================================================
    if (engine === "openrouter") {
      const orCandidates = [model, "openrouter/free"].filter((v, i, arr) => v && arr.indexOf(v) === i);
      let lastOrErr = "";
      for (const orModel of orCandidates) {
        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${effectiveKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/concordsharaf-source/news",
            "X-Title": "Arabic Newsroom Editor"
          },
          body: JSON.stringify({
            model: orModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
          }),
          signal: AbortSignal.timeout(42000)
        });
        const d = await r.json();
        if (r.ok) {
          const text = stripThinkTags(d?.choices?.[0]?.message?.content);
          if (text) return res.status(200).json({ text, usedModel: orModel });
        }
        if (r.status === 401) {
          return res.status(401).json({ error: "مفتاح OpenRouter غير صالح." });
        }
        lastOrErr = d?.error?.message || d?.message || `OpenRouter HTTP ${r.status}`;
      }
      return res.status(502).json({ error: lastOrErr || "خطأ من خادم OpenRouter" });
    }

    return res.status(400).json({ error: "محرك غير مدعوم" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "خطأ داخلي في الخادم" });
  }
}
