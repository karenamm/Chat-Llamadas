const API_BASE = "http://localhost:3000";

export async function apiPost(path, data) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function apiGet(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params || {}).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );
  const res = await fetch(url.toString());
  return res.json();
}
