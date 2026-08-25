# Webs AI Builder

This repository contains a prototype full-page AI-driven site customizer. The site runs a local Node/Express proxy to call the OpenAI API and a frontend UI that lets you send natural-language instructions to an LLM which returns structured "actions" (JSON) the frontend executes inside a sandboxed iframe preview.

New feature: eBay scanner
- The site now includes a small eBay scanning endpoint and UI so you can search eBay and return listings under a given max price.
- Endpoint: POST /api/ebay { query: string, maxPrice: number }
- The UI form "Scan eBay for Deals" will call this endpoint and list matching results.

Security & policy notes
- This prototype scrapes eBay's public search results pages. Scraping may violate eBay's terms of service; in production you should use the official eBay APIs (Finding API) with credentials and follow their developer policies.
- Do not expose this server to untrusted users. Add rate-limiting, caching, and authentication before using publicly.

Quick start (local)
1. Clone:
   git clone https://github.com/kianheyat2013-png/webs-ai-builder
   cd webs-ai-builder
2. Create a `.env` file with:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

3. npm install
4. npm start
5. Open http://localhost:3000

Notes
- The eBay scanner is minimal: it parses visible prices on the search results page and returns items whose listed price is <= maxPrice (if provided). It does not account for shipping costs or sold/completed listings. Use it as a starting point and replace with official API calls for production.

If you want, I can next:
- Replace scraping with calls to the eBay Finding API (requires your eBay AppID) and add caching.
- Add notifications (email/webhook) to send found links automatically.
- Harden the endpoint with rate-limiting and authentication.
