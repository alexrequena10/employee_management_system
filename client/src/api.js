const TOKEN_KEY = 'wm_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const pre = text.match(/<pre>([\s\S]*?)<\/pre>/i);
      const message = pre?.[1]?.trim() || text.trim().slice(0, 200);
      if (!res.ok) throw new Error(message || res.statusText);
    }
  }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
