import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Routes
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, currentCode } = req.body;
    const client = getGeminiClient();

    const systemInstruction = `You are an expert TallyPrime TDL (Tally Definition Language) Developer and Consultant.
Your task is to help the user write, customize, understand, or troubleshoot TDL (Tally Definition Language) code blocks for TallyPrime 4.x.

Here is the current TDL code generated in the editor for context:
\`\`\`tdl
${currentCode || ""}
\`\`\`

Guidelines:
1. Provide accurate, clean, and well-structured TDL code following TallyPrime 4.x standards.
2. Use standard definitions like [System: UDF], [#Part: ...], [Line: ...], [Field: ...].
3. For data persistence, make sure the Field uses the 'Storage' property mapping to a defined System UDF.
4. When writing code, write the complete, clean TDL block using standard brackets.
5. Keep explanations clear, technical, and precise. Avoid overly flowery language.
6. If the user asks about an error, diagnose the root cause (e.g., duplicate definitions, incorrect form name, syntax typo) and provide the correct code snippet with explanation.`;

    const contents = [];
    
    // Add history if present
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      }
    }
    
    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the Gemini API." });
  }
});

// Serve UI / Vite Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
