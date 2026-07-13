const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    localStorage.setItem("access_token", data.access);
    return data.access;
  } catch {
    return null;
  }
}

async function apiFetch(endpoint: string, options: RequestInit = {}, requireAuth: boolean = true): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
let response = await fetch(url, {    ...options,
    headers,
  });

  // If unauthorized and we have a refresh token, try refreshing once and retry
  if (response.status === 401 && requireAuth) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    } else {
      // Refresh failed too — force logout
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (errorData.detail) {
      throw new Error(errorData.detail);
    }

    const firstFieldError = Object.values(errorData)[0];
    if (Array.isArray(firstFieldError) && firstFieldError.length > 0) {
      throw new Error(firstFieldError[0] as string);
    }

    throw new Error(`Request failed: ${response.status}`);
  }
     if (response.status === 204) {
      return null;
      }

      return response.json();
}

export const api = {
  signup: (username: string, email: string, password: string) =>
    apiFetch("/accounts/signup/", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }, false),   // <-- new: third argument added

  login: (username: string, password: string) =>
    apiFetch("/token/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }, false), 
  getProfile: () => apiFetch("/accounts/profile/"),
  getReports: (url?: string) => apiFetch(url || "/research/reports/"),

  getReport: (id: number) => apiFetch(`/research/reports/${id}/`),
  deleteReport: (id: number) =>
  apiFetch(`/research/reports/${id}/`, { method: "DELETE" }),

  createReport: (topic: string) =>
    apiFetch("/research/reports/", {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),
};