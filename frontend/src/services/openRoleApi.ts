import { getStoredToken } from './authApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface OpenRoleData {
  _id: string;
  club: string;
  jobTitle: string;
  description: string;
  deadline: string;
  applicationQuestions: string[];
  createdAt: string;
  updatedAt: string;
}

export const openRoleApi = {
  getById: (openRoleId: string) =>
    request<OpenRoleData>(`/open-roles/${openRoleId}`),

  list: (clubId: string) =>
    request<OpenRoleData[]>(`/clubs/${clubId}/open-roles`),

  create: (clubId: string, data: {
    jobTitle: string;
    description: string;
    deadline: string;
    applicationQuestions?: string[];
  }) =>
    request<OpenRoleData>(`/clubs/${clubId}/open-roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (openRoleId: string, data: {
    jobTitle?: string;
    description?: string;
    deadline?: string;
    applicationQuestions?: string[];
  }) =>
    request<OpenRoleData>(`/open-roles/${openRoleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (openRoleId: string) =>
    request<{ message: string }>(`/open-roles/${openRoleId}`, { method: 'DELETE' }),
};
