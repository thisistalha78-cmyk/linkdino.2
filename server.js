import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// ---------- Helper: get keyword from post ----------
function extractKeyword(text) {
  const words = text
    .replace(/[#.,]/g, "")
    .split(" ")
    .filter(w => w.length > 4);

  return words[Math.floor(words.length / 2)] || "business";
}

// ---------- Helper: Pexels video ----------
async function getPexelsVideo(keyword) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(
      keyword
    )}&per_page=1`,
    {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    }
  );

  const data = await res.json();

  if (!data.videos || data.videos.length === 0) {
    return null;
  }

  const video = data.videos[0];
  return {
    videoUrl: video.video_files[0].link,
    thumbnail: video.image
  };
}

// ---------- MAIN ROUTE ----------
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You write clean, professional LinkedIn posts with short paragraphs and hashtags."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const aiData = await aiRes.json();
    const post = aiData.choices[0].message.content;

    const keyword = extractKeyword(post);
    const video = await getPexelsVideo(keyword);

    res.json({
      post,
      video
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate content" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
