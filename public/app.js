(function(){
  const messagesEl = document.getElementById('messages');
  const form = document.getElementById('promptForm');
  const input = document.getElementById('promptInput');
  const previewFrame = document.getElementById('previewFrame');
  const enableJsCheckbox = document.getElementById('enable-js');
  const historyList = document.getElementById('historyList');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');

  const ebayForm = document.getElementById('ebayForm');
  const ebayQuery = document.getElementById('ebayQuery');
  const ebayMax = document.getElementById('ebayMax');
  const ebayResults = document.getElementById('ebayResults');

  function addMessage(text, cls='bot'){
    const m = document.createElement('div');
    m.className = 'message ' + (cls === 'user' ? 'user' : 'bot');
    m.textContent = text;
    messagesEl.appendChild(m);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function prependHistory(item){
    const li = document.createElement('li');
    li.textContent = item;
    historyList.insertBefore(li, historyList.firstChild);
  }

  async function callAI(prompt, history = []) {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({prompt, history})
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'AI request failed');
    }
    return res.json();
  }

  function safeParseJSONMaybe(text){
    try{ return JSON.parse(text); }catch(e){
      const match = text.match(/\{[\s\S]*\}$/);
      if(match) try { return JSON.parse(match[0]); } catch(e2){}
    }
    return null;
  }

  function sendActionsToPreview(actions){
    previewFrame.contentWindow.postMessage({ type: 'apply-actions', actions, allowJs: enableJsCheckbox.checked }, '*');
  }

  window.addEventListener('message', (ev) => {
    if (!ev.data) return;
    if (ev.data.type === 'preview-ready') {
      console.log('Preview runner ready');
    } else if (ev.data.type === 'preview-log') {
      console.log('Preview:', ev.data.message);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    addMessage(prompt, 'user');
    input.value = '';
    addMessage('Thinking…', 'bot');
    try {
      // Quick heuristic: if user asked to scan eBay, call the ebay API instead of LLM
      const ebayMatch = prompt.match(/scan ebay for (.+?) under \$?(\d+)/i);
      if (ebayMatch) {
        const query = ebayMatch[1].trim();
        const max = parseFloat(ebayMatch[2]);
        addMessage(`Scanning eBay for "${query}" under $${max}…`, 'bot');
        const r = await fetch('/api/ebay', {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query, maxPrice: max})
        });
        const data = await r.json();
        if (data.items && data.items.length) {
          addMessage(`Found ${data.items.length} listing(s):`, 'bot');
          data.items.forEach(it => {
            const el = document.createElement('div');
            el.className = 'message bot';
            const a = document.createElement('a');
            a.href = it.url; a.textContent = `${it.title} — $${it.price}`; a.target = '_blank';
            el.appendChild(a);
            messagesEl.appendChild(el);
          });
        } else {
          addMessage('No listings found under that price.', 'bot');
        }
        return;
      }

      const aiResp = await callAI(prompt, []);
      const lastBotEl = Array.from(messagesEl.querySelectorAll('.message.bot')).pop();
      if (aiResp.raw_text) lastBotEl.textContent = aiResp.raw_text;
      const parsed = aiResp.json || safeParseJSONMaybe(aiResp.raw_text || '') || null;
      if (parsed && Array.isArray(parsed.actions)) {
        addMessage('Applying: ' + parsed.actions.map(a => a.type).join(', '), 'bot');
        sendActionsToPreview(parsed.actions);
        prependHistory(parsed.actions.map(a => a.type + (a.selector? ' ' + a.selector : '')).join(' | '));
      } else {
        addMessage('AI did not return actions. Response: ' + (aiResp.raw_text || aiResp.text || '(empty)'), 'bot');
      }
    } catch (err) {
      addMessage('Error: ' + err.message, 'bot');
    }
  });

  ebayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = ebayQuery.value.trim();
    const max = parseFloat(ebayMax.value);
    if (!q) return alert('Please enter a search term');
    ebayResults.innerHTML = 'Scanning…';
    try {
      const r = await fetch('/api/ebay', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query: q, maxPrice: max || null}) });
      const data = await r.json();
      ebayResults.innerHTML = '';
      if (data.items && data.items.length) {
        const ul = document.createElement('ul');
        data.items.forEach(it => {
          const li = document.createElement('li');
          const a = document.createElement('a'); a.href = it.url; a.textContent = `${it.title} — $${it.price}`; a.target = '_blank';
          li.appendChild(a);
          ul.appendChild(li);
        });
        ebayResults.appendChild(ul);
        prependHistory(`eBay scan: ${q} under $${max || 'any'}`);
      } else {
        ebayResults.textContent = 'No deals found.';
      }
    } catch (err) {
      ebayResults.textContent = 'Error: ' + err.message;
    }
  });

  // Download current preview HTML
  downloadBtn.addEventListener('click', () => {
    try{
      const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
      const html = '<!doctype html>\n' + previewDoc.documentElement.outerHTML;
      const blob = new Blob([html], {type: 'text/html'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'preview.html'; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }catch(e){ alert('Unable to download preview: ' + e.message); }
  });

  // Reset preview to original scaffold
  resetBtn.addEventListener('click', () => {
    previewFrame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="preview-body" style="font-family: system-ui, sans-serif; padding:20px; color:#0b1220;"><h2>Welcome — ask the AI to customize this page</h2><p>This preview is sandboxed. Use the AI panel to add sections, styles, or simple interactions.</p></div><script src="/preview-runner.js"></script></body></html>';
  });

})();
