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
    const err = new Error((body as { message?: string }).message || `Request failed: ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export interface CommentThreadData {
  _id: string;
  type: string;
  clubId: string;
  createdBy: string;
  visibility: string;
  locked: boolean;
  title: string;
  application?: string;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentData {
  _id: string;
  threadId: string;
  parentId: string | null;
  author: {
    _id: string;
    name: string;
    profilePhotoUrl?: string;
    roles?: string[];
  };
  body: string;
  deleted: boolean;
  stars?: number;
  createdAt: string;
  updatedAt: string;
}

export const forumApi = {
  getOrCreateForumThread: (clubId: string) =>
    request<CommentThreadData>(`/clubs/${clubId}/forum-thread`, { method: 'POST' }),

  getOrCreateReviewThread: (applicationId: string) =>
    request<CommentThreadData>(`/applications/${applicationId}/review-thread`, { method: 'POST' }),

  getThread: (threadId: string) =>
    request<CommentThreadData>(`/comment-threads/${threadId}`),

  listComments: (threadId: string) =>
    request<CommentData[]>(`/comment-threads/${threadId}/comments`),

  postComment: (threadId: string, body: string, parentId?: string | null, stars?: number) =>
    request<CommentData>(`/comment-threads/${threadId}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body,
        parentId: parentId ?? null,
        ...(stars !== undefined && { stars }),
      }),
    }),

  editComment: (commentId: string, data: { body?: string; stars?: number }) =>
    request<CommentData>(`/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  softDeleteComment: (commentId: string) =>
    request<CommentData>(`/comments/${commentId}/delete`, { method: 'PATCH' }),
};
