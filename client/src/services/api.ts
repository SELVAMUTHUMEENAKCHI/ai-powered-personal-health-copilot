import { MockApiService } from './mockApi';

export const API_URL_STORAGE_KEY = 'HEALTH_COPILOT_API_URL';
export const API_MODE_STORAGE_KEY = 'HEALTH_COPILOT_API_MODE';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

/**
 * Returns the currently configured API base URL.
 * Defaults to in-browser mock on GitHub Pages if no backend URL is set.
 */
export function getApiBaseUrl(): string {
  const customUrl = localStorage.getItem(API_URL_STORAGE_KEY);
  if (customUrl) return customUrl.trim().replace(/\/+$/, '');

  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl.trim().replace(/\/+$/, '');

  // If running on GitHub Pages and no backend URL is explicitly configured, default to mock
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    return 'mock';
  }

  return '/api';
}

export function isDemoMode(): boolean {
  const mode = localStorage.getItem(API_MODE_STORAGE_KEY);
  if (mode === 'demo') return true;
  if (mode === 'live') return false;
  return getApiBaseUrl() === 'mock';
}

export function setApiConfiguration(url: string | null, forceDemo = false): void {
  if (forceDemo || !url || url === 'mock') {
    localStorage.setItem(API_MODE_STORAGE_KEY, 'demo');
    localStorage.removeItem(API_URL_STORAGE_KEY);
  } else {
    localStorage.setItem(API_MODE_STORAGE_KEY, 'live');
    localStorage.setItem(API_URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  }
  window.dispatchEvent(new CustomEvent('health-copilot-api-config-changed'));
}

export async function testBackendHealth(candidateUrl: string): Promise<{ ok: boolean; message: string }> {
  const baseUrl = candidateUrl.trim().replace(/\/+$/, '');
  const testUrl = baseUrl.endsWith('/api') ? `${baseUrl}/health` : `${baseUrl}/api/health`;

  try {
    const res = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: `Connected: ${data.service || 'AI Personal Health Copilot API'}` };
    }
    return { ok: false, message: `Server replied with HTTP status ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed (server unreachable or CORS blocked)' };
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers = {}, ...customConfig } = options;
  const baseUrl = getApiBaseUrl();

  // 1. Direct In-Browser Mock Mode
  if (isDemoMode() || baseUrl === 'mock') {
    return MockApiService.handleRequest<T>(endpoint, options);
  }

  // 2. Live API Request with Automatic Fallback
  const config: RequestInit = {
    ...customConfig,
    credentials: 'include', // Sends httpOnly session cookie
    headers: {
      ...(data instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  };

  if (data) {
    config.body = data instanceof FormData ? data : JSON.stringify(data);
  }

  const normalizedBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  const fullUrl = `${normalizedBase}${endpoint}`;

  try {
    const response = await fetch(fullUrl, config);

    // If GitHub Pages static host returns 405 (Method Not Allowed) or 404, fallback to mock
    if (response.status === 405 || (response.status === 404 && typeof window !== 'undefined' && window.location.hostname.endsWith('github.io'))) {
      console.warn(`[API] Received HTTP ${response.status} from ${fullUrl}. Seamlessly falling back to In-Browser Demo Mode.`);
      setApiConfiguration(null, true);
      return MockApiService.handleRequest<T>(endpoint, options);
    }

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
  } catch (err: any) {
    // If Network Error ("Failed to fetch") on GitHub Pages or if no backend running, fallback to mock
    const isNetworkError =
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError');

    if (isNetworkError && typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
      console.warn(`[API] Network error connecting to ${fullUrl}. Seamlessly falling back to In-Browser Demo Mode.`);
      setApiConfiguration(null, true);
      return MockApiService.handleRequest<T>(endpoint, options);
    }

    throw err;
  }
}
