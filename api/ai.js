// Vercel Serverless Function (60s timeout + fast low-thinking Gemini 3.8 + CORS-clean key query)
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { engine, model, prompt, apiKey } = req.body || {};
    if (!engine || !model || !prompt) {
      return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
    }

    if (engine === "gemini") {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Gemini غير موجود" });

      async function callGeminiModel(targetModel, useLowThinking) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(key)}`;
        const genConfig = { temperature: 0.1 };
        if (useLowThinking && targetModel.includes("3.8")) {
          genConfig.thinkingConfig = { thinkingLevel: "low" };
        }
        const upstream = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: genConfig
          })
        });
        const data = await upstream.json();
        return { ok: upstream.ok, status: upstream.status, data };
      }

      let attempt = await callGeminiModel(model, true);

      // If thinkingConfig wasn't accepted on a variant, retry cleanly without thinkingConfig
      if (!attempt.ok && (attempt.data?.error?.message || "").toLowerCase().includes("thinking")) {
        attempt = await callGeminiModel(model, false);
      }

      // Auto-heal if Google suggests a replacement model
      if (!attempt.ok) {
        const errMsg = attempt.data?.error?.message || "";
        const suggestedMatch = errMsg.match(/models\/(gemini-[a-zA-Z0-9.-]+)/);
        if (suggestedMatch && suggestedMatch[1] && suggestedMatch[1] !== model) {
          attempt = await callGeminiModel(suggestedMatch[1], true);
        } else if (errMsg.includes("no longer available") && model !== "gemini-3.5-flash-lite") {
          attempt = await callGeminiModel("gemini-3.5-flash-lite", false);
        }
      }

      if (!attempt.ok) {
        return res.status(attempt.status).json({ error: attempt.data?.error?.message || "خطأ من Gemini API" });
      }

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
