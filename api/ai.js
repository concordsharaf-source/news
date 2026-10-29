// Vercel Serverless AI Proxy (Runs on US servers — works in Yemen without VPN!)
// Supports:
// 1. instant_free (100% keyless, zero signup, zero credit card — Nemotron 550B + OpenAI GPT-OSS 120B + Llama 3.3 70B with automatic failover!)
// 2. Optional user keys: groq, cohere, openrouter, gemini

export const config = {
  maxDuration: 60
};

async function callKeylessRoute(route, prompt) {
  if (route === "nemotron-550b") {
    const r = await fetch("https://api.kilo.ai/api/gateway/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer anonymous",
        "Content-Type": "application/json",
        "User-Agent": "MihbarahNewsroom/9.0"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-ultra-550b-a55b:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(34000)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `Kilo HTTP ${r.status}`);
    const text = (d?.choices?.[0]?.message?.content || "").trim();
    if (!text) throw new Error("Empty response from Nemotron-550B");
    return text;
  }

  if (route === "gpt-oss-120b") {
    const r = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MihbarahNewsroom/9.0"
      },
      body: JSON.stringify({
        model: "gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        reasoning_effort: "low"
      }),
      signal: AbortSignal.timeout(24000)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d?.error?.message || `OVH HTTP ${r.status}`);
    const text = (d?.choices?.[0]?.message?.content || "").trim();
    if (!text) throw new Error("Empty response from GPT-OSS-120B");
    return text;
  }

  // Fallback 3: Meta-Llama-3_3-70B-Instruct on OVHcloud keyless
  const r = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "MihbarahNewsroom/9.0"
    },
    body: JSON.stringify({
      model: "Meta-Llama-3_3-70B-Instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    }),
    signal: AbortSignal.timeout(22000)
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || `OVH Llama HTTP ${r.status}`);
  const text = (d?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Empty response from Llama-3.3-70B");
  return text;
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
    if (!engine || engine === "instant_free") {
      const preferred = model || "nemotron-550b";
      const allRoutes = ["nemotron-550b", "gpt-oss-120b", "llama-3.3-70b"];
      const ordered = [preferred, ...allRoutes.filter(x => x !== preferred)];

      let lastErr = null;
      for (const route of ordered) {
        try {
          const text = await callKeylessRoute(route, prompt);
          return res.status(200).json({ text, usedRoute: route });
        } catch (e) {
          lastErr = e;
        }
      }
      return res.status(502).json({
        error: `جميع المحركات الفورية مشغولة حالياً (${lastErr?.message || "timeout"}). أعد المحاولة بعد ثوانٍ أو استخدم زر Arena.ai.`
      });
    }

    const envKeys = {
      gemini: process.env.GEMINI_API_KEY || "",
      groq: process.env.GROQ_API_KEY || "",
      cohere: process.env.COHERE_API_KEY || "",
      openrouter: process.env.OPENROUTER_API_KEY || ""
    };
    const effectiveKey = (apiKey || envKeys[engine] || "").trim();

    if (!effectiveKey) {
      return res.status(400).json({
        error: `لم يتم إدخال مفتاح ${engine.toUpperCase()} بعد. اختر المحرك الأول «⚡ مجاني فوري بدون مفتاح» للتحرير المباشر بدون أي اشتراك أو مفتاح!`
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
    // 3. Cohere v2 Chat API (Free Trial — 1,000 calls/month, no credit card)
    // =====================================================================
    if (engine === "cohere") {
      const r = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${effectiveKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1
        })
      });
      const d = await r.json();
      if (!r.ok) {
        return res.status(r.status).json({ error: d?.message || "خطأ من خادم Cohere" });
      }
      const blocks = d?.message?.content || [];
      const text = Array.isArray(blocks) ? blocks.map(b => b.text || "").join("").trim() : "";
      return res.status(200).json({ text });
    }

    // =====================================================================
    // 4. OpenAI-Compatible APIs: Groq & OpenRouter
    // =====================================================================
    const endpoints = {
      groq: "https://api.groq.com/openai/v1/chat/completions",
      openrouter: "https://openrouter.ai/api/v1/chat/completions"
    };
    const endpoint = endpoints[engine];
    if (!endpoint) return res.status(400).json({ error: "محرك غير مدعوم" });

    const headers = {
      "Authorization": `Bearer ${effectiveKey}`,
      "Content-Type": "application/json"
    };
    if (engine === "openrouter") {
      headers["HTTP-Referer"] = "https://github.com/concordsharaf-source/news";
      headers["X-Title"] = "Arabic Newsroom Editor";
    }

    const r = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1
      })
    });
    const d = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: d?.error?.message || d?.message || "خطأ من المزود" });
    }
    const text = d?.choices?.[0]?.message?.content || "";
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "خطأ داخلي في الخادم" });
  }
}
