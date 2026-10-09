const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers = {}, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    credentials: 'include', // Automatically sends httpOnly session cookie
    headers: {
      ...(data instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  };

  if (data) {
    config.body = data instanceof FormData ? data : JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  let json: any = null;
  let text = '';
  try {
    text = await response.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!response.ok) {
    const errorMsg =
      json?.error?.message ||
      json?.message ||
      (text && !text.trim().startsWith('<') ? text.trim() : null) ||
      `Request failed with status ${response.status}. Please check backend connection.`;
    const error = new Error(errorMsg);
    (error as { code?: string }).code = json?.error?.code || 'API_ERROR';
    (error as { status?: number }).status = response.status;
    throw error;
  }

  return json as T;
}
