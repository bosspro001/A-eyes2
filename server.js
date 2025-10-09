import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const port = process.env.PORT || 3000;

// 🔹 Simple home route
app.get("/", (req, res) => {
  res.send("✅ Server is running and ready to analyze images!");
});

// 🔹 Analyze image route
app.post("/analyze", async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "No image URL provided" });
    }

    // Azure model endpoint (replace if you’re using a custom one)
    const endpoint =
      "https://models.inference.ai.azure.com/imageanalysis:analyze";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image clearly" },
              { type: "image_url", image_url: imageUrl },
            ],
          },
        ],
      }),
    });

    // 🧩 Parse response safely
    const text = await response.text();
    if (!text) {
      return res.status(500).json({ error: "Empty response from AI model" });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("⚠️ JSON parse failed:", text);
      return res
        .status(500)
        .json({ error: "Invalid JSON from AI model", raw: text });
    }

    // 🧠 Extract result text
    const result =
      data.output?.[0]?.content?.[0]?.text ||
      data.choices?.[0]?.message?.content ||
      "No description found.";

    res.json({ result });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
