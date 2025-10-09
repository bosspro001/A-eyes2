import express from "express";
import cors from "cors";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";

dotenv.config();
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GitHub token missing in .env");
  process.exit(1);
}

const client = ModelClient(
  "https://models.github.ai/inference",
  new AzureKeyCredential(token)
);

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // to accept image in base64
app.use(express.static("public"));

app.post("/analyze-image", async (req, res) => {
  const imageBase64 = req.body.image;
  if (!imageBase64) return res.status(400).send({ error: "Image missing" });

  try {
    const response = await client.path("/chat/completions").post({
      body: {
        model: "meta/Llama-3.2-90B-Vision-Instruct",
        messages: [
          { role: "system", content: "You are a helpful assistant that describes images." },
          { role: "user", content: [{ type: "image_url", image_url: { url: imageBase64, details: "high" } }, { type: "text", text: "Describe this image in detail" }] }
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
    res.status(500).send({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
