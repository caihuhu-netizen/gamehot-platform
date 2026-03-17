/**
 * REST API 客户端
 * 统一封装 fetch，自动带 Cookie（JWT）、处理 401 重定向
 */

export const BASE_URL = ''; // 同域，走 Nginx 代理转发到 https://c.easejoy.com

function handleUnauthorized() {
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

/**
 * 从 cookie 读取 CSRF token
 */
export function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '__csrf_token') return decodeURIComponent(value);
  }
  return undefined;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('未登录');
  }
  if (!res.ok) {
    let errText: string;
    try {
      const errData = await res.json();
      errText = errData.message || errData.error || JSON.stringify(errData);
    } catch {
      errText = await res.text().catch(() => `HTTP ${res.status}`);
    }
    throw new Error(errText);
  }
  const data = await res.json();
  // Spring Boot 通常包装在 { code, data, message } 结构中
  if (data && typeof data === 'object' && 'data' in data) {
    return data.data as T;
  }
  return data as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== undefined) {
        url.searchParams.set(k, String(v));
      }
    });
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  return parseResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const res = await fetch(path, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });
  return parseResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const res = await fetch(path, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });
  return parseResponse<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const res = await fetch(path, {
    method: 'PATCH',
    headers,
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });
  return parseResponse<T>(res);
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  const csrfToken = getCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const res = await fetch(path, {
    method: 'DELETE',
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  return parseResponse<T>(res);
}
