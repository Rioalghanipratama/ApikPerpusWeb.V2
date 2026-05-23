import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Gemini Initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Vision: Analyze Face
app.post('/api/vision/analyze-face', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Image is required' });

    const base64Data = image.split(',')[1];
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Analyze this student's face for library verification. Describe their appearance briefly, state their estimated mood, and check if they are wearing anything that might hinder recognition (like heavy masks). Return a JSON object with fields: description (string), mood (string), detectionAccuracy (number 0-1), isObstructed (boolean), and friendlyMessage (string in Indonesian)." },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            mood: { type: Type.STRING },
            detectionAccuracy: { type: Type.NUMBER },
            isObstructed: { type: Type.BOOLEAN },
            friendlyMessage: { type: Type.STRING }
          },
          required: ["description", "mood", "detectionAccuracy", "isObstructed", "friendlyMessage"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error('Face Vision Error:', error);
    res.status(500).json({ error: 'Failed to analyze face' });
  }
});

// Vision: Scan Book
app.post('/api/vision/scan-book', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Image is required' });

    const base64Data = image.split(',')[1];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Extract book details from this cover image. Return a JSON object with fields: title, author, isbn (if visible, else empty string), category (choose from: Ilmu Komputer, Software Engineering, Sistem Informasi, Sains, Teknologi, Sastra, Seni & Desain), and summary (brief description)." },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            isbn: { type: Type.STRING },
            category: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["title", "author", "category"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error('Book Vision Error:', error);
    res.status(500).json({ error: 'Failed to scan book' });
  }
});

// NLP: AI Assistant Chat
app.post('/api/nlp/chat', async (req, res) => {
  try {
    const { message, context, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const chatContext = `You are "PustakaAI", a smart library assistant for a university library management system. 
    Current Library State Context: ${JSON.stringify(context)}
    User Identity: ${context.userRole || 'Guest'}
    
    Guidelines:
    1. Be helpful, professional, yet friendly in Indonesian (Bahasa Indonesia).
    2. Answer questions about books, library rules, or member status.
    3. If asked for recommendations, use the 'books' array in context to suggest real available books first.
    4. Help admins identify pending tasks (like unreturned books).
    5. Don't make up data not provided in the context; if something is unknown, say you don't have access to that specific record yet.
    6. Keep responses relatively concise but thorough.
    7. Use markdown for formatting (bold, lists).`;

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      history: history || [],
      config: {
        systemInstruction: chatContext
      }
    });

    const result = await chat.sendMessage({ message });
    
    res.json({ text: result.text });
  } catch (error) {
    console.error('NLP Chat Error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
