import { getStoredToken } from './authApi';

// Use backend1 (Express) for discover API
const DISCOVER_API_BASE = 'http://localhost:3000';

async function request<T>(path: string): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${DISCOVER_API_BASE}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface DiscoverClub {
  _id: string;
  name: string;
  description: string;
  email?: string;
  website?: string;
  tags?: string[];
  isRecruiting: boolean;
  openRoleCount: number;
}

export interface DiscoverOpenRole {
  _id: string;
  club: string | { _id: string; name: string };
  jobTitle: string;
  description: string;
  deadline: string;
  applicationQuestions: string[];
  createdAt: string;
}

export interface DiscoverClubDetail extends DiscoverClub {
  execs: string[];
  openRoles: DiscoverOpenRole[];
}

export const discoverApi = {
  listClubs: () => request<DiscoverClub[]>('/discover/clubs'),
  getClubDetail: (clubId: string) => request<DiscoverClubDetail>(`/discover/clubs/${clubId}`),
  listOpenRoles: (clubId?: string) => {
    const qs = clubId ? `?clubId=${clubId}` : '';
    return request<DiscoverOpenRole[]>(`/discover/open-roles${qs}`);
  },
};
