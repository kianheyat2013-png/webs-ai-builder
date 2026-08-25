// Simple Express server that proxies requests to OpenAI and instructs the model to return JSON actions.
// Requires an environment variable OPENAI_API_KEY
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', express.static(path.join(__dirname)));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!OPENAI_KEY) {
  console.warn('No OPENAI_API_KEY found in .env — /api/ai will fail until you set it.');
}

app.post('/api/ai', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send('Missing prompt');

  const system = `
You are an assistant that accepts a user's instruction to modify a website preview. 
Respond ONLY with JSON or with a JSON block somewhere in your response. Use this schema:

{
  "actions": [
    {
      "type": "create" | "update" | "delete" | "css" | "eval" | "message",
      "tag": "div|button|section|form|... (for create)",
      "id": "optional-id",
      "parent": "CSS selector of parent (default #preview-body)",
      "selector": "CSS selector for update/delete",
      "attrs": {"attrName":"value"},
      "text": "textContent",
      "html": "<strong>optional</strong>",
      "css": "css code for type == 'css'",
      "code": "js code for type == 'eval'"
    }
  ]
}

Keep your actions minimal and explicit. Do not attempt to access server files or external resources. If the user asks for something that cannot be done safely, return a single action of type 'message' with an explanatory text.
Do not include anything outside the JSON block unless absolutely necessary. If you include other text, also include the JSON.
`;

  const userMsg = `User instruction: ${prompt}\nReturn a JSON object following the schema exactly.`;

  try {
    const body = {
      model: MODEL,
      messages: [
        {role: 'system', content: system},
        {role: 'user', content: userMsg}
      ],
      temperature: 0.2,
      max_tokens: 800
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('OpenAI error', r.status, text);
      return res.status(500).send(text);
    }
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || '';
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) {
      const match = raw.match(/\{[\s\S]*\}$/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch(e2){}
      }
    }

    return res.json({ raw_text: raw, json: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
