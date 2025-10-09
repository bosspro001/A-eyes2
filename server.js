import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(express.json());

// ✅ Analyze route
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const image = fs.readFileSync(filePath);
    const base64Image = image.toString("base64");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Describe this image in detail." },
              { type: "input_image", image_data: base64Image }
            ]
          }
        ]
      }),
    });

    // ⚠️ If OpenAI didn’t return valid JSON
    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI API error:", errText);
      return res.status(500).json({ error: "OpenAI API Error", details: errText });
    }

    const data = await response.json();
    console.log("Response from API:", data);

    const analysis = data.output_text || "No description returned.";
    res.json({ result: analysis });

    // Cleanup uploaded file
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ✅ Serve HTML
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ Port configuration (for Render + Local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
