const express = require('express');
const fs = require('fs');
const path = require('path');

const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)));

const app = express();
const PORT = process.env.PORT || 3000;

const DEFAULT_MODEL = 'gpt-3.5-turbo';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '.')));

function loadApiConfig() {
    const apiPath = path.join(__dirname, 'api');
    const config = {
        key: process.env.API_KEY || '',
        baseUrl: process.env.API_BASE_URL || DEFAULT_BASE_URL,
        model: process.env.API_MODEL || DEFAULT_MODEL,
    };

    if (!fs.existsSync(apiPath)) {
        console.warn("Warning: 'api' file not found. Provide API_KEY via environment or create the file.");
        return config;
    }

    try {
        const raw = fs.readFileSync(apiPath, 'utf8');
        const keyMatch = raw.match(/apikey\s*[:=]\s*(\S+)/i);
        const baseMatch = raw.match(/base[_-]?url\s*[:=]\s*["\']?([^"'\s,]+)["\']?/i);
        const modelMatch = raw.match(/model\s*[:=]\s*["\']?([^"'\s,]+)["\']?/i);

        if (keyMatch) config.key = keyMatch[1].trim();
        if (baseMatch) config.baseUrl = baseMatch[1].trim();
        if (modelMatch) config.model = modelMatch[1].trim();

        if (!keyMatch && raw.trim()) {
            const firstLine = raw.split(/\r?\n/).find(Boolean);
            if (firstLine) {
                config.key = firstLine.trim();
            }
        }

        console.log('API configuration loaded.');
    } catch (err) {
        console.error("Error reading 'api' file:", err);
    }

    return config;
}

const apiConfig = loadApiConfig();

app.post('/api/generate', async (req, res) => {
    if (!apiConfig.key) {
        return res.status(500).json({ error: "API Key not configured on server. Please create an 'api' file or set API_KEY env." });
    }

    const text = (req.body?.text || '').toString().trim();
    if (!text) {
        return res.status(400).json({ error: "No text provided." });
    }

    const systemPrompt = `
You are an educational AI assistant. Your task is to analyze the provided text and generate interactive learning cards in JSON format.
The output must be a valid JSON array of objects. Do not include markdown formatting (like \`\`\`json).
Each object represents a card and should follow this schema:
{
  "type": "choice" | "boolean" | "fill",
  "question": "The question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "correctAnswer": "Answer string",
  "pairs": [{"left": "Term", "right": "Definition"}],
  "explanation": "Explanation of the answer",
  "size": "small" | "large"
}
Generate at least 3-5 cards based on the text. Mix the types.
    `;

    try {
        const baseUrl = apiConfig.baseUrl.replace(/\/$/, '');
        const apiUrl = `${baseUrl}/chat/completions`;

        console.log(`[DEBUG] Requesting: ${apiUrl}`);
        console.log(`[DEBUG] Model: ${apiConfig.model}`);

        const requestBody = {
            model: apiConfig.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text }
            ],
            temperature: 0.7
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.key}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`[DEBUG] Response status: ${apiResponse.status}`);

        if (!apiResponse.ok) {
            const errText = await apiResponse.text().catch(() => '');
            console.error(`[DEBUG] Error response: ${errText}`);
            throw new Error(`Provider API Error: ${apiResponse.status} ${errText}`.trim());
        }

        const data = await apiResponse.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Provider response missing content');
        }

        let cards = [];
        try {
            const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();
            cards = JSON.parse(cleanContent);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            const match = content.match(/\[.*\]/s);
            if (match) {
                try {
                    cards = JSON.parse(match[0]);
                } catch (e2) {
                    return res.status(500).json({ error: "Failed to parse AI response", raw: content });
                }
            } else {
                return res.status(500).json({ error: "Failed to parse AI response", raw: content });
            }
        }

        res.json(cards);

    } catch (error) {
        console.error("Generation Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
