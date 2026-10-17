const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type ApiOptions = {
  method?: string;
  body?: any;
};

export async function api(path: string, options: ApiOptions = {}) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("voluntess_token")
      : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body
      ? JSON.stringify(options.body)
      : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err: any = new Error(
      data.message || `Request failed (${response.status})`
    );
    err.status = response.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }

  return data;
}

export function saveSession(data: any) {
  if (typeof window === "undefined") return;

  if (data?.token) {
    localStorage.setItem("voluntess_token", data.token);
  }

  if (data?.user) {
    localStorage.setItem(
      "voluntess_user",
      JSON.stringify(data.user)
    );
  }
}

export function getUser() {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem("voluntess_user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("voluntess_token");
  localStorage.removeItem("voluntess_user");

  window.location.href = "/login";
}