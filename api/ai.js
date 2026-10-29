// Vercel Serverless Function (Bridge for Yemen + Auto-Model Fallback for Gemini/Groq/OpenRouter)
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { action, engine, model, prompt, apiKey } = req.body || {};

    // Optional live model listing so the app never goes stale when providers update model IDs!
    if (action === "list_models" && engine === "gemini") {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Gemini مطلوب" });
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      const d = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: d?.error?.message || "تعذر جلب النماذج" });
      const models = (d.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map(m => ({ id: m.name.replace(/^models\//, ""), name: m.displayName || m.name.replace(/^models\//, "") }));
      return res.status(200).json({ models });
    }

    if (!engine || !model || !prompt) {
      return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
    }

    if (engine === "gemini") {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Gemini غير موجود" });

      async function callGeminiModel(targetModel) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent`;
        const upstream = await fetch(url, {
          method: "POST",
          headers: {
            "x-goog-api-key": key,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }
          })
        });
        const data = await upstream.json();
        return { ok: upstream.ok, status: upstream.status, data };
      }

      let attempt = await callGeminiModel(model);

      // Auto-heal if Google suggests a newer replacement model ID in error message!
      if (!attempt.ok) {
        const errMsg = attempt.data?.error?.message || "";
        const suggestedMatch = errMsg.match(/models\/(gemini-[a-zA-Z0-9.-]+)/);
        if (suggestedMatch && suggestedMatch[1] && suggestedMatch[1] !== model) {
          attempt = await callGeminiModel(suggestedMatch[1]);
        } else if (errMsg.includes("no longer available") && model !== "gemini-3.8-flash") {
          attempt = await callGeminiModel("gemini-3.8-flash");
        }
      }

      if (!attempt.ok) {
        return res.status(attempt.status).json({ error: attempt.data?.error?.message || "خطأ من Gemini API" });
      }

      // Filter out internal thinking parts (`thought: true`) on Gemini 3.8 thinking models!
      const parts = attempt.data?.candidates?.[0]?.content?.parts || [];
      const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
      return res.status(200).json({ text });
    }

    if (engine === "groq") {
      const key = apiKey || process.env.GROQ_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Groq غير موجود" });

      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1 })
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من Groq API" });
      return res.status(200).json({ text: (data?.choices?.[0]?.message?.content || "").trim() });
    }

    if (engine === "openrouter") {
      const key = apiKey || process.env.OPENROUTER_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح OpenRouter غير موجود" });

      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1 })
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من OpenRouter API" });
      return res.status(200).json({ text: (data?.choices?.[0]?.message?.content || "").trim() });
    }

    return res.status(400).json({ error: "محرك غير مدعوم عبر الخادم" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "خطأ داخلي في الخادم الوسيط" });
  }
};
