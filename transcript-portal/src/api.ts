export const BASE_URL = 'http://127.0.0.1:8000/api';

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function getToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.access;
    localStorage.setItem('access_token', accessToken!);
    if (data.refresh) {
      refreshToken = data.refresh;
      localStorage.setItem('refresh_token', refreshToken!);
    }
    return true;
  } catch {
    return false;
  }
}

async function handle401(res: Response) {
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      logout();
      window.location.reload();
    }
    return refreshed;
  }
  return false;
}

// Login - returns true if successful
export async function login(username: string, password: string) {
  try {
    const res = await fetch(`${BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.access;
    refreshToken = data.refresh;
    localStorage.setItem('access_token', accessToken!);
    localStorage.setItem('refresh_token', refreshToken!);
    return true;
  } catch (err) {
    console.error("Login network error", err);
    return false;
  }
}

export function logout() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('ust_req');
  localStorage.removeItem('ust_tab');
}

async function authFetch(path: string, options: Record<string, any> = {}) {
  const opts = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  };
  let res = await fetch(`${BASE_URL}${path}`, opts);
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      opts.headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${BASE_URL}${path}`, opts);
    } else {
      logout();
      window.location.reload();
      return null;
    }
  }
  return res;
}

// Authenticated GET request
export async function get(path: string) {
  try {
    const res = await authFetch(path);
    if (!res) return null;
    return res.json();
  } catch (err) {
    console.error("API GET error", err);
    return null;
  }
}

// Authenticated POST request
export async function post(path: string, body: any) {
  try {
    const res = await authFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res) return null;
    return res.json();
  } catch (err) {
    console.error("API POST error", err);
    return null;
  }
}

// Authenticated file upload (multipart/form-data)
export async function uploadFile(path: string, formData: FormData) {
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers.Authorization = `Bearer ${accessToken}`;
        const retry = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
        return retry.ok ? retry.json() : null;
      }
      logout();
      window.location.reload();
      return null;
    }
    return res.ok ? res.json() : null;
  } catch (err) {
    console.error("API upload error", err);
    return null;
  }
}

// Authenticated PATCH request
export async function patch(path: string, body: any) {
  try {
    const res = await authFetch(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (!res) return null;
    return res.json();
  } catch (err) {
    console.error("API PATCH error", err);
    return null;
  }
}
