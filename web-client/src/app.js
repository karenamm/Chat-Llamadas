import "./styles.css";
import { apiPost, apiGet } from "./api";

const $ = (id) => document.getElementById(id);

// Crear grupo
$('btnCreateGroup').onclick = async () => {
  try {
    const name = $('groupName').value.trim();
    const members = $('groupMembers').value.trim()
      ? $('groupMembers').value.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const resp = await apiPost('/api/groups', { name, members });
    $('groupOut').textContent = JSON.stringify(resp, null, 2);
  } catch (e) {
    $('groupOut').textContent = 'Error: ' + e.message;
  }
};

// Enviar mensaje
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

    const resp = await apiPost('/api/messages', body);
    $('sendOut').textContent = JSON.stringify(resp, null, 2);
  } catch (e) {
    $('sendOut').textContent = 'Error: ' + e.message;
  }
};

// Historial
$('btnHistory').onclick = async () => {
  try {
    const scope = $('scope').value;
    const id = $('scopeId').value.trim();
    const resp = await apiGet('/api/history', { scope, id });

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
  } catch (e) {
    $('history').innerHTML = `<pre>Error: ${e.message}</pre>`;
  }
};

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
