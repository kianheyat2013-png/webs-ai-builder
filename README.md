# Webs AI Builder

This repository contains a prototype full-page AI-driven site customizer. The site runs a local Node/Express proxy to call the OpenAI API and a frontend UI that lets you send natural-language instructions to an LLM which returns structured "actions" (JSON) the frontend executes inside a sandboxed iframe preview.

What the site does
- Full-page editor: chat panel + live preview (iframe)
- AI returns JSON actions: create/update/delete/css/eval/message
- Preview runs inside a sandboxed iframe (srcdoc) and applies safe actions
- Ability to download the preview HTML and reset the preview

Security notes
- The server does not (and must not) receive or run arbitrary code. The preview eval runs only inside the sandboxed iframe and only if you enable "Allow JS in preview".
- Keep your OPENAI_API_KEY secret. Do not commit it to the repo.

Quick start (local)
1. Clone the repo
2. Create a `.env` file with:

```
OPENAI_API_KEY=sk-...
```

3. npm install
4. npm start
5. Open http://localhost:3000

Deploy
- Recommended: Render or Railway. Set environment variable `OPENAI_API_KEY` in the service's dashboard.
- Start command: `node server.js`

Files added
- index.html — full-page editor
- styles.css
- public/app.js
- public/preview-runner.js
- server.js
- package.json
- README.md
- .env.example

If you want I can also:
- Convert the server to a serverless function (for Vercel)
- Add a JSON schema validator for model responses
- Add a simple project save/load feature

