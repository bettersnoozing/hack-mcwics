import type {
  ApiResponse,
  Application,
  Club,
  ForumGroup,
  ForumMessage,
  PaginatedResponse,
  Position,
  RecruitmentPost,
  Review,
  User,
} from '../types';

const BASE_URL = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Request failed');
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  signIn: (email: string, password: string) =>
    request<ApiResponse<{ user: User; token: string }>>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signUp: (data: { email: string; password: string; name: string }) =>
    request<ApiResponse<{ user: User; token: string }>>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<ApiResponse<User>>('/auth/me'),
};

// ── Clubs ─────────────────────────────────────────────
export const clubsApi = {
  list: (params?: { search?: string; tags?: string[] }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.tags?.length) query.set('tags', params.tags.join(','));
    return request<PaginatedResponse<Club>>(`/clubs?${query.toString()}`);
  },
  get: (slug: string) => request<ApiResponse<Club>>(`/clubs/${slug}`),
  getPositions: (slug: string) =>
    request<ApiResponse<Position[]>>(`/clubs/${slug}/positions`),
};

// ── Recruitment ───────────────────────────────────────
export const recruitmentApi = {
  list: () => request<PaginatedResponse<RecruitmentPost>>('/recruitment'),
  get: (id: string) =>
    request<ApiResponse<RecruitmentPost>>(`/recruitment/${id}`),
  create: (data: Partial<RecruitmentPost>) =>
    request<ApiResponse<RecruitmentPost>>('/recruitment', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<RecruitmentPost>) =>
    request<ApiResponse<RecruitmentPost>>(`/recruitment/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ── Applications ──────────────────────────────────────
export const applicationsApi = {
  list: () => request<PaginatedResponse<Application>>('/applications'),
  get: (id: string) =>
    request<ApiResponse<Application>>(`/applications/${id}`),
  create: (data: Partial<Application>) =>
    request<ApiResponse<Application>>('/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: Application['status']) =>
    request<ApiResponse<Application>>(`/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ── Reviews ───────────────────────────────────────────
export const reviewsApi = {
  list: (applicationId: string) =>
    request<ApiResponse<Review[]>>(
      `/applications/${applicationId}/reviews`,
    ),
  create: (applicationId: string, data: Partial<Review>) =>
    request<ApiResponse<Review>>(
      `/applications/${applicationId}/reviews`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
};

// ── Forum ─────────────────────────────────────────────
export const forumApi = {
  getGroup: (groupId: string) =>
    request<ApiResponse<ForumGroup>>(`/forum/${groupId}`),
  getMessages: (groupId: string) =>
    request<ApiResponse<ForumMessage[]>>(`/forum/${groupId}/messages`),
  sendMessage: (groupId: string, content: string) =>
    request<ApiResponse<ForumMessage>>(`/forum/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};
