// Vercel Serverless Function — Supports Groq (OpenAI GPT-OSS 120B), Mistral, Cohere Command-A, OpenRouter Free & Gemini
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

    if (engine === "groq") {
      const key = apiKey || process.env.GROQ_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Groq المجاني غير موجود" });

      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1 })
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من Groq API" });
      return res.status(200).json({ text: (data?.choices?.[0]?.message?.content || "").trim() });
    }

    if (engine === "mistral") {
      const key = apiKey || process.env.MISTRAL_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Mistral المجاني غير موجود" });

      const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1 })
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: data?.message || data?.error?.message || "خطأ من Mistral API" });
      return res.status(200).json({ text: (data?.choices?.[0]?.message?.content || "").trim() });
    }

    if (engine === "cohere") {
      const key = apiKey || process.env.COHERE_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Cohere المجاني غير موجود" });

      const upstream = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1 })
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: data?.message || "خطأ من Cohere API" });
      const text = (data?.message?.content?.map(c => c.text || "").join("") || "").trim();
      return res.status(200).json({ text });
    }

    if (engine === "openrouter") {
      const key = apiKey || process.env.OPENROUTER_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح OpenRouter المجاني غير موجود" });

      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1 })
      });
      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من OpenRouter API" });
      return res.status(200).json({ text: (data?.choices?.[0]?.message?.content || "").trim() });
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
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: genConfig })
        });
        const data = await upstream.json();
        return { ok: upstream.ok, status: upstream.status, data };
      }

      let attempt = await callGeminiModel(model, true);
      if (!attempt.ok && (attempt.data?.error?.message || "").toLowerCase().includes("thinking")) {
        attempt = await callGeminiModel(model, false);
      }
      if (!attempt.ok) {
        const errMsg = attempt.data?.error?.message || "";
        const suggestedMatch = errMsg.match(/models\/(gemini-[a-zA-Z0-9.-]+)/);
        if (suggestedMatch && suggestedMatch[1] && suggestedMatch[1] !== model) {
          attempt = await callGeminiModel(suggestedMatch[1], true);
        }
      }
      if (!attempt.ok) return res.status(attempt.status).json({ error: attempt.data?.error?.message || "خطأ من Gemini API" });

      const parts = attempt.data?.candidates?.[0]?.content?.parts || [];
      const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: "محرك غير مدعوم" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "خطأ داخلي في الخادم الوسيط" });
  }
};
