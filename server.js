import express from "express";
import cors from "cors";
import path from "path";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("❌ GitHub token missing. Set GITHUB_TOKEN in Render environment variables.");
  process.exit(1);
}

// ✅ Initialize the Llama Vision model client
const client = ModelClient(
  "https://models.github.ai/inference",
  new AzureKeyCredential(token)
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ✅ Serve static files
app.use(express.static(path.join(process.cwd(), "public")));

// ✅ Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// ✅ Analyze image route
app.post("/analyze-image", async (req, res) => {
  const imageBase64 = req.body.image;

  if (!imageBase64) {
    return res.status(400).json({ error: "No image provided" });
  }

  // ✅ Ensure image is properly formatted
  const isBase64 = imageBase64.startsWith("data:image/");
  const imageUrl = isBase64 ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

  try {
    const response = await client.path("/chat/completions").post({
      body: {
        model: "meta/Llama-3.2-90B-Vision-Instruct",
        messages: [
          { role: "system", content: "You are a helpful assistant that describes images." },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl, details: "high" } },
              { type: "text", text: "Describe this image in detail." }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 512,
      },
    });

    // ✅ Check for unexpected response
    if (isUnexpected(response)) {
      console.error("❌ Unexpected response from API:", response.body);
      return res.status(500).json({ error: "Unexpected response", details: response.body });
    }

    // ✅ Validate and safely extract response
    const choices = response.body?.choices;
    if (!choices || !Array.isArray(choices) || !choices[0]?.message?.content) {
      console.error("❌ Invalid or empty response body:", response.body);
      return res.status(500).json({ error: "Empty or invalid response from model" });
    }

    const analysis = choices[0].message.content;
    res.json({ analysis });
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ✅ Use Render’s port or 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
