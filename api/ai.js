// Vercel Serverless Function (Bridge for Yemen - bypasses regional IP blocks without VPN!)
// Keys are NOT stored on the server; they are passed securely over HTTPS from the user's browser.
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { engine, model, prompt, apiKey } = req.body || {};
    if (!engine || !model || !prompt) {
      return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
    }

    if (engine === "gemini") {
      const key = apiKey || process.env.GEMINI_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Gemini غير موجود" });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.15 }
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من Gemini API" });
      }
      const text = (data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "").trim();
      return res.status(200).json({ text });
    }

    if (engine === "groq") {
      const key = apiKey || process.env.GROQ_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح Groq غير موجود" });

      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.15
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من Groq API" });
      }
      const text = (data?.choices?.[0]?.message?.content || "").trim();
      return res.status(200).json({ text });
    }

    if (engine === "openrouter") {
      const key = apiKey || process.env.OPENROUTER_API_KEY;
      if (!key) return res.status(400).json({ error: "مفتاح OpenRouter غير موجود" });

      const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.15
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: data?.error?.message || "خطأ من OpenRouter API" });
      }
      const text = (data?.choices?.[0]?.message?.content || "").trim();
      return res.status(200).json({ text });
    }

    return res.status(400).json({ error: "محرك غير مدعوم عبر الخادم" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "خطأ داخلي في الخادم الوسيط" });
  }
};
