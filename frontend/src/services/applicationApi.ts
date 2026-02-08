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

export type AppStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface ApplicationData {
  _id: string;
  openRole: {
    _id: string;
    jobTitle: string;
    description?: string;
    applicationQuestions?: string[];
    deadline?: string;
    club?: string | { _id: string; name: string };
  };
  applicant: {
    _id: string;
    name: string;
    email: string;
  };
  answers: Record<string, string>;
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MyApplicationData {
  _id: string;
  openRole: {
    _id: string;
    jobTitle: string;
    description?: string;
    deadline?: string;
    club?: { _id: string; name: string };
  };
  applicant: string;
  answers: Record<string, string>;
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
}

export const applicationApi = {
  submit: (data: { openRoleId: string; answers: Record<string, string> }) =>
    request<ApplicationData>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listMine: () =>
    request<MyApplicationData[]>('/applications/mine'),

  listMyAppliedRoleIds: () =>
    request<string[]>('/applications/mine/roles'),

  listForClub: (clubId: string, filters?: { openRoleId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.openRoleId) params.set('openRoleId', filters.openRoleId);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return request<ApplicationData[]>(`/clubs/${clubId}/applications${qs ? `?${qs}` : ''}`);
  },

  getDetail: (applicationId: string) =>
    request<ApplicationData>(`/applications/${applicationId}`),

  updateStatus: (applicationId: string, status: AppStatus) =>
    request<ApplicationData>(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
