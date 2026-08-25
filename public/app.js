// public/app.js
// Frontend chat UI + send to server + apply actions to preview iframe
(function(){
  const messagesEl = document.getElementById('messages');
  const form = document.getElementById('promptForm');
  const input = document.getElementById('promptInput');
  const previewFrame = document.getElementById('previewFrame');
  const enableJsCheckbox = document.getElementById('enable-js');
  const historyList = document.getElementById('historyList');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetBtn = document.getElementById('resetBtn');

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
