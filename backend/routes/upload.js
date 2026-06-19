const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/upload/analyze - Analyze image or document
router.post("/analyze", auth, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const question = req.body.question || "Analyze this file and describe its contents in detail.";

    if (!file) return res.status(400).json({ error: "No file provided" });

    const mimeType = file.mimetype;
    let analysisResult = "";

    if (mimeType.startsWith("image/")) {
      // Vision analysis
      const base64 = file.buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const response = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: dataUrl } },
            { type: "text", text: question }
          ]
        }],
        max_tokens: 2048
      });
      analysisResult = response.choices[0]?.message?.content || "Unable to analyze image.";
    } else if (mimeType === "application/pdf") {
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(file.buffer);
      const text = data.text.slice(0, 8000);
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You analyze documents and answer questions about them accurately." },
          { role: "user", content: `Document content:\n${text}\n\nQuestion: ${question}` }
        ],
        max_tokens: 2048
      });
      analysisResult = response.choices[0]?.message?.content || "Unable to analyze PDF.";
    } else if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const text = result.value.slice(0, 8000);
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You analyze documents and answer questions about them accurately." },
          { role: "user", content: `Document content:\n${text}\n\nQuestion: ${question}` }
        ],
        max_tokens: 2048
      });
      analysisResult = response.choices[0]?.message?.content || "Unable to analyze DOCX.";
    } else if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      const XLSX = require("xlsx");
      const wb = XLSX.read(file.buffer, { type: "buffer" });
      let text = "";
      wb.SheetNames.forEach(name => {
        const ws = wb.Sheets[name];
        text += `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(ws)}\n\n`;
      });
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You analyze spreadsheet data and answer questions accurately." },
          { role: "user", content: `Spreadsheet data:\n${text.slice(0, 8000)}\n\nQuestion: ${question}` }
        ],
        max_tokens: 2048
      });
      analysisResult = response.choices[0]?.message?.content || "Unable to analyze spreadsheet.";
    } else {
      // Plain text
      const text = file.buffer.toString("utf-8").slice(0, 8000);
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You analyze text files and answer questions accurately." },
          { role: "user", content: `File content:\n${text}\n\nQuestion: ${question}` }
        ],
        max_tokens: 2048
      });
      analysisResult = response.choices[0]?.message?.content || "Unable to analyze file.";
    }

    res.json({
      success: true,
      fileName: file.originalname,
      fileType: mimeType,
      analysis: analysisResult
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
