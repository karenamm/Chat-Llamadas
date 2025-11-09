const $ = (id) => document.getElementById(id);

const api = {
  async post(path, data) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || r.statusText);
    return j;
  },
  async get(path, qs) {
    const url = new URL(path, window.location.origin);
    Object.entries(qs || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const r = await fetch(url.toString());
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || r.statusText);
    return j;
  }
};

$('btnCreateGroup').onclick = async () => {
  try {
    const name = $('groupName').value.trim();
    const members = $('groupMembers').value.trim()
      ? $('groupMembers').value.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const resp = await api.post('/api/groups', { name, members });
    $('groupOut').textContent = JSON.stringify(resp, null, 2);
  } catch (e) { $('groupOut').textContent = 'Error: ' + e.message; }
};

$('btnSend').onclick = async () => {
  try {
    const toType = $('toType').value;
    const to = $('toId').value.trim();
    const from = $('fromId').value.trim();
    const contentType = $('contentType').value;
    const val = $('textOrUrl').value.trim();

    const body = { toType, to, from, contentType };
    if (contentType === 'text') body.text = val;
    else body.audioUrl = val;

    const resp = await api.post('/api/messages', body);
    $('sendOut').textContent = JSON.stringify(resp, null, 2);
  } catch (e) { $('sendOut').textContent = 'Error: ' + e.message; }
};

$('btnHistory').onclick = async () => {
  try {
    const scope = $('scope').value;
    const id = $('scopeId').value.trim();
    const resp = await api.get('/api/history', { scope, id });

    const list = Array.isArray(resp.items) ? resp.items : [];
    const container = $('history');
    container.innerHTML = '';
    list.forEach(it => {
      const div = document.createElement('div');
      div.className = 'msg';
      const when = new Date(it.createdAt || Date.now()).toLocaleString();
      div.innerHTML = `
        <div class="meta"><b>${it.from}</b> → <b>${it.to}</b> · ${when}</div>
        ${it.type === 'text' ? `<div>${escapeHtml(it.text || '')}</div>` : ''}
        ${it.type === 'audio' ? `<audio controls src="${it.audioUrl}"></audio>` : ''}
      `;
      container.appendChild(div);
    });
  } catch (e) { $('history').innerHTML = `<pre>Error: ${e.message}</pre>`; }
};

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
