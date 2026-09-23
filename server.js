import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 3000;
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const prompts = {
  title: "Create 10 catchy YouTube Shorts title ideas for this topic. Keep them concise, natural, non-clickbait where possible, and varied.",
  caption: "Write 3 engaging Instagram captions for this topic. Give different tones: simple, emotional, and energetic. Keep them easy to edit.",
  hashtag: "Generate 20 relevant Instagram/YouTube hashtags for this topic. Mix broad and specific tags and avoid spammy tags.",
  prompt: "Turn this idea into a detailed prompt for an AI image/video generator. Include subject, setting, action, camera, lighting, style and aspect ratio.",
  hook: "Create 10 strong opening hooks for a short-form video about this topic. Make them natural and attention-grabbing without making false claims.",
  description: "Write a concise YouTube video description for this topic, with a natural call to action and relevant keywords."
};

app.post("/api/generate", async (req, res) => {
  try {
    const { type, topic } = req.body || {};
    if (!type || !prompts[type]) return res.status(400).json({ error: "Unknown tool." });
    if (!topic || !topic.trim()) return res.status(400).json({ error: "Please enter a topic." });

    const response = await client.responses.create({
      model: "gpt-5.6-luna",
      input: `${prompts[type]}\n\nTopic: ${topic.trim()}`
    });

    res.json({ text: response.output_text || "No result returned." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI generation failed. Check the server API key and try again." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => console.log(`DM Hub running on http://localhost:${port}`));
