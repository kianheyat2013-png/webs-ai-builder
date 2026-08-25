(function(){
  function log(msg){ parent.postMessage({type:'preview-log', message: msg}, '*'); }
  window.addEventListener('message', async (ev) => {
    const data = ev.data;
    if (!data || data.type !== 'apply-actions') return;
    const actions = data.actions || [];
    const allowJs = !!data.allowJs;

    for (const action of actions) {
      try {
        if (action.type === 'create') {
          const parentSel = action.parent || '#preview-body';
          const parent = document.querySelector(parentSel) || document.body;
          const el = document.createElement(action.tag || 'div');
          if (action.id) el.id = action.id;
          if (action.attrs) {
            for (const [k,v] of Object.entries(action.attrs)) el.setAttribute(k,v);
          }
          if (action.text) el.textContent = action.text;
          if (action.html) el.innerHTML = action.html;
          parent.appendChild(el);
        } else if (action.type === 'update') {
          const sel = action.selector;
          if (!sel) continue;
          const el = document.querySelector(sel);
          if (!el) continue;
          if (action.text !== undefined) el.textContent = action.text;
          if (action.html !== undefined) el.innerHTML = action.html;
          if (action.attrs) {
            for (const [k,v] of Object.entries(action.attrs)) el.setAttribute(k,v);
          }
        } else if (action.type === 'delete') {
          const el = document.querySelector(action.selector);
          if (el) el.remove();
        } else if (action.type === 'css') {
          let style = document.getElementById('ai-generated-style');
          if (!style) { style = document.createElement('style'); style.id = 'ai-generated-style'; document.head.appendChild(style); }
          style.textContent += '\n' + (action.css || '');
        } else if (action.type === 'eval') {
          if (!allowJs) { log('JS execution blocked by user setting'); continue; }
          try {
            // eslint-disable-next-line no-eval
            eval(action.code || '');
          } catch (e) { log('eval error: ' + e.toString()); }
        } else if (action.type === 'message') {
          log('AI message: ' + (action.text || ''));
        } else {
          log('Unknown action type: ' + action.type);
        }
      } catch (e) {
        log('Action failed: ' + e.toString());
      }
    }

    parent.postMessage({type:'preview-ready'}, '*');
  });

  parent.postMessage({type:'preview-ready'}, '*');
})();
