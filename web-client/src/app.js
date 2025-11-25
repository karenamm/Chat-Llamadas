import "./styles.css";
import { apiPost, apiGet } from "./api";
import { connectWs, sendWsMessage } from "./wsClient";

const $ = (id) => document.getElementById(id);

let currentRoomId = null;
let currentUser = null;

// 🟢 Conexión WebSocket cuando tengamos usuario y sala
function ensureWsConnected() {
  if (!currentRoomId || !currentUser) return;

  connectWs(currentRoomId, (payload) => {
    // payload viene de WebSocketController -> template.convertAndSend
    appendMessageToHistory({
      from: payload.user,
      to: currentRoomId,
      text: payload.message,
      createdAt: payload.createdAt
    });
  });
}

function appendMessageToHistory(msg) {
  const container = $("history");
  const div = document.createElement("div");
  div.className = "msg";
  const when = new Date(msg.createdAt || Date.now()).toLocaleString();
  div.innerHTML = `
    <div class="meta"><b>${msg.from}</b> → <b>${msg.to}</b> · ${when}</div>
    <div>${escapeHtml(msg.text || "")}</div>
  `;
  container.appendChild(div);
}

// Crear grupo (HTTP vía proxy)
$("btnCreateGroup").onclick = async () => {
  try {
    const name = $("groupName").value.trim();
    const members = $("groupMembers").value.trim()
      ? $("groupMembers").value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const resp = await apiPost("/api/groups", { name, members });
    $("groupOut").textContent = JSON.stringify(resp, null, 2);
  } catch (e) {
    $("groupOut").textContent = "Error: " + e.message;
  }
};

// Enviar mensaje (HTTP + WS)
$("btnSend").onclick = async () => {
  try {
    const toType = $("toType").value;
    const to = $("toId").value.trim();
    const from = $("fromId").value.trim();
    const contentType = $("contentType").value;
    const val = $("textOrUrl").value.trim();

    currentRoomId = to;
    currentUser = from;
    ensureWsConnected();

    const body = { toType, to, from, contentType };
    if (contentType === "text") body.text = val;
    else body.audioUrl = val;

    // 1) Persistimos el mensaje en Java vía HTTP
    const resp = await apiPost("/api/messages", body);
    $("sendOut").textContent = JSON.stringify(resp, null, 2);

    // 2) Enviamos el mensaje en tiempo real vía WebSocket
    if (contentType === "text") {
      sendWsMessage(to, {
        user: from,
        message: val,
        createdAt: Date.now()
      });
    }

  } catch (e) {
    $("sendOut").textContent = "Error: " + e.message;
  }
};

// Historial (igual que antes, HTTP)
$("btnHistory").onclick = async () => {
  try {
    const scope = $("scope").value;
    const id = $("scopeId").value.trim();
    const resp = await apiGet("/api/history", { scope, id });

    const list = Array.isArray(resp.items) ? resp.items : [];
    const container = $("history");
    container.innerHTML = "";
    list.forEach((it) => appendMessageToHistory(it));
  } catch (e) {
    $("history").innerHTML = `<pre>Error: ${e.message}</pre>`;
  }
};

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}
