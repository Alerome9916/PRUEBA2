// Cliente HTTP con manejo de token JWT.
const TOKEN_KEY = 'churu_token';
const USER_KEY = 'churu_user';

export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get user() { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } },
  set(token, user) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); },
  clear() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
  get isLogged() { return !!this.token; },
};

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && auth.isLogged) {
    auth.clear();
    location.hash = '#/login';
  }
  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) throw new Error((data && data.error) || `Error ${res.status}`);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
  login: (usuario, password) => request('POST', '/auth/login', { usuario, password }),
};
