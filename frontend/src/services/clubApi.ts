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

export interface ClubInfo {
  _id: string;
  name: string;
  description: string;
  email?: string;
  website?: string;
  tags?: string[];
  execs: string[];
  admins: string[];
}

export interface RosterMember {
  userId: string;
  name: string;
  email: string;
  position: string;
  bio: string;
  profilePhotoUrl: string;
  isSuperAdmin: boolean;
}

export interface JoinRequestEntry {
  userId: string;
  name: string;
  email: string;
  position: string;
  bio: string;
  profilePhotoUrl: string;
}

export const clubApi = {
  listClubs: () => request<ClubInfo[]>('/clubs'),

  createClub: (data: {
    name: string;
    description?: string;
    email?: string;
    website?: string;
    execPosition: string;
    bio?: string;
    profilePhotoUrl?: string;
  }) => request<ClubInfo>('/clubs', { method: 'POST', body: JSON.stringify(data) }),

  updateClub: (clubId: string, data: { description?: string; email?: string; website?: string; tags?: string[] }) =>
    request<ClubInfo>(`/clubs/${clubId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getRoster: (clubId: string) => request<RosterMember[]>(`/clubs/${clubId}/roster`),

  requestJoin: (clubId: string, data: { execPosition: string; bio?: string; profilePhotoUrl?: string }) =>
    request<{ message: string }>(`/clubs/${clubId}/join`, { method: 'POST', body: JSON.stringify(data) }),

  listJoinRequests: (clubId: string) => request<JoinRequestEntry[]>(`/clubs/${clubId}/join-requests`),

  approveJoin: (clubId: string, userId: string) =>
    request<{ message: string }>(`/clubs/${clubId}/join-requests/${userId}/approve`, { method: 'POST' }),

  rejectJoin: (clubId: string, userId: string) =>
    request<{ message: string }>(`/clubs/${clubId}/join-requests/${userId}/reject`, { method: 'POST' }),

  updateExecProfile: (data: { execPosition?: string; bio?: string; profilePhotoUrl?: string }) =>
    request('/auth/me/exec-profile', { method: 'PATCH', body: JSON.stringify(data) }),
};
