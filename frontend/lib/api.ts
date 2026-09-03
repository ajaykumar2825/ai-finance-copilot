const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  token?: string;
}

interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export class ApiClientError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = error.status;
    this.errors = error.errors;
  }
}

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const { supabase } = await import("@/lib/supabase");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const authToken = token ?? (await getAuthToken());

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (authToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        message: `Request failed with status ${response.status}`,
        status: response.status,
      };
    }
    throw new ApiClientError(errorData);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T = unknown>(endpoint: string, opts?: RequestOptions) =>
    apiClient<T>(endpoint, { method: "GET", ...opts }),

  post: <T = unknown>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    apiClient<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    apiClient<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown, opts?: RequestOptions) =>
    apiClient<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...opts,
    }),

  delete: <T = unknown>(endpoint: string, opts?: RequestOptions) =>
    apiClient<T>(endpoint, { method: "DELETE", ...opts }),
};
