import express from "express";
import cors from "cors";
import path from "path";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";

dotenv.config();

// Read your GitHub token from environment variable
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GitHub token missing. Set GITHUB_TOKEN in Render environment variables.");
  process.exit(1);
}

// Initialize Llama API client
const client = ModelClient(
  "https://models.github.ai/inference",
  new AzureKeyCredential(token)
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Accept large base64 images

// Serve static front-end files from 'public'
app.use(express.static(path.join(process.cwd(), "public")));

// Redirect root URL to index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

// Analyze image endpoint
app.post("/analyze-image", async (req, res) => {
  const imageBase64 = req.body.image;
  if (!imageBase64) return res.status(400).send({ error: "Image missing" });

  try {
    const response = await client.path("/chat/completions").post({
      body: {
        model: "meta/Llama-3.2-90B-Vision-Instruct",
        messages: [
          { role: "system", content: "You are a helpful assistant that describes images." },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageBase64, details: "high" } },
              { type: "text", text: "Describe this image in detail" }
            ]
          }
        ],
        temperature: 0.7,
        max_tokens: 512
      }
    });

    if (isUnexpected(response)) {
      return res.status(500).send(response.body.error);
    }

    const analysis = response.body.choices[0].message.content;
    res.send({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});

// Start server on Render's assigned port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
