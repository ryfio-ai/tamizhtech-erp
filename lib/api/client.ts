/**
 * TAMIZHTECH ERP — TYPED API CLIENT
 * Standardizes fetch requests, response parsing, and HTTP error classification.
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isConflict() {
    return this.status === 409;
  }
  get isValidationError() {
    return this.status === 422 || this.status === 400;
  }
  get isRateLimited() {
    return this.status === 429;
  }
  get isServerError() {
    return this.status >= 500;
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = endpoint.startsWith("http") ? endpoint : endpoint;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let json: any = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      json = await res.json();
    } catch {
      // Empty or invalid json response
    }
  }

  if (!res.ok) {
    const errorMsg =
      json?.error ||
      json?.message ||
      `Request failed with status ${res.status}: ${res.statusText}`;
    throw new ApiError(errorMsg, res.status, json?.code, json?.details);
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiClient<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiClient<T>(endpoint, { method: "DELETE", ...options }),
};
