import type { PortalApi } from './portalApi';
import type {
  Application,
  ApplicationFilters,
  ApplicationStatus,
  Club,
  FormSchema,
  ForumChannel,
  ForumPost,
  InternalNote,
  InterviewSlot,
  Position,
  RecruitmentPost,
  Review,
  ReviewReply,
  ReviewThread,
  ActivityEvent,
} from '../contracts';
import { getStoredToken } from './authApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function createRealPortalApi(): PortalApi {
  return {
    // ── Clubs ───────────────────────────────────────
    async listClubsRecruiting(): Promise<Club[]> {
      return request<Club[]>('/clubs?recruiting=true');
    },
    async listAllClubs(): Promise<Club[]> {
      return request<Club[]>('/clubs');
    },
    async getClub(slug: string): Promise<Club | undefined> {
      return request<Club>(`/clubs/${slug}`);
    },
    async getClubPositions(clubSlug: string): Promise<Position[]> {
      return request<Position[]>(`/clubs/${clubSlug}/positions`);
    },

    // ── Recruitment (admin) ─────────────────────────
    async listRecruitmentPosts(clubId: string): Promise<RecruitmentPost[]> {
      return request<RecruitmentPost[]>(`/clubs/${clubId}/recruitment-posts`);
    },
    async upsertRecruitmentPost(post: Omit<RecruitmentPost, 'id'> & { id?: string }): Promise<RecruitmentPost> {
      if (post.id) {
        return request<RecruitmentPost>(`/recruitment-posts/${post.id}`, {
          method: 'PUT',
          body: JSON.stringify(post),
        });
      }
      return request<RecruitmentPost>(`/clubs/${post.clubId}/recruitment-posts`, {
        method: 'POST',
        body: JSON.stringify(post),
      });
    },
    async deleteRecruitmentPost(postId: string): Promise<void> {
      await request<void>(`/recruitment-posts/${postId}`, { method: 'DELETE' });
    },
    async addPosition(postId: string, position: Omit<Position, 'id' | 'applicantCount' | 'createdAt'>): Promise<Position> {
      return request<Position>(`/recruitment-posts/${postId}/positions`, {
        method: 'POST',
        body: JSON.stringify(position),
      });
    },
    async updatePosition(postId: string, positionId: string, data: Partial<Omit<Position, 'id' | 'clubId' | 'applicantCount' | 'createdAt'>>): Promise<Position> {
      return request<Position>(`/recruitment-posts/${postId}/positions/${positionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    async deletePosition(postId: string, positionId: string): Promise<void> {
      await request<void>(`/recruitment-posts/${postId}/positions/${positionId}`, { method: 'DELETE' });
    },

    // ── Form Schema ─────────────────────────────────
    async getFormSchema(positionId: string): Promise<FormSchema | undefined> {
      return request<FormSchema>(`/positions/${positionId}/form-schema`);
    },
    async upsertFormSchema(positionId: string, schema: Omit<FormSchema, 'id' | 'positionId' | 'updatedAt'>): Promise<FormSchema> {
      return request<FormSchema>(`/positions/${positionId}/form-schema`, {
        method: 'PUT',
        body: JSON.stringify(schema),
      });
    },

    // ── Applications (student) ──────────────────────
    async submitApplication(data: {
      userId: string;
      clubId: string;
      positionId: string;
      answers: { questionId: string; question: string; answer: string }[];
      applicantName: string;
      applicantEmail: string;
      clubName: string;
      positionTitle: string;
    }): Promise<Application> {
      return request<Application>('/applications', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async listMyApplications(studentId: string): Promise<Application[]> {
      return request<Application[]>(`/users/${studentId}/applications`);
    },

    // ── Applications (admin) ────────────────────────
    async listApplicationsForClub(clubId: string, filters?: ApplicationFilters): Promise<Application[]> {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.positionId) params.set('positionId', filters.positionId);
      const qs = params.toString();
      return request<Application[]>(`/clubs/${clubId}/applications${qs ? `?${qs}` : ''}`);
    },
    async getApplicationDetail(applicationId: string): Promise<Application | undefined> {
      return request<Application>(`/applications/${applicationId}`);
    },
    async updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<Application> {
      return request<Application>(`/applications/${applicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    async bulkUpdateApplicationStatus(applicationIds: string[], status: ApplicationStatus): Promise<Application[]> {
      return request<Application[]>('/applications/bulk-status', {
        method: 'PATCH',
        body: JSON.stringify({ applicationIds, status }),
      });
    },

    // ── Reviews (threaded) ──────────────────────────
    async getReviewThread(applicationId: string): Promise<ReviewThread> {
      return request<ReviewThread>(`/applications/${applicationId}/reviews`);
    },
    async addTopLevelReview(applicationId: string, data: { reviewerId: string; reviewerName: string; rating: number; body: string }): Promise<Review> {
      return request<Review>(`/applications/${applicationId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async replyToReview(reviewId: string, data: { authorId: string; authorName: string; body: string }): Promise<ReviewReply> {
      return request<ReviewReply>(`/reviews/${reviewId}/replies`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // ── Internal Notes ──────────────────────────────
    async getInternalNotes(applicationId: string): Promise<InternalNote[]> {
      return request<InternalNote[]>(`/applications/${applicationId}/notes`);
    },
    async addInternalNote(applicationId: string, data: { authorId: string; authorName: string; body: string }): Promise<InternalNote> {
      return request<InternalNote>(`/applications/${applicationId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // ── Activity Timeline ───────────────────────────
    async getActivityTimeline(applicationId: string): Promise<ActivityEvent[]> {
      return request<ActivityEvent[]>(`/applications/${applicationId}/activity`);
    },

    // ── Interview Slots ─────────────────────────────
    async listInterviewSlots(positionId: string): Promise<InterviewSlot[]> {
      return request<InterviewSlot[]>(`/positions/${positionId}/interview-slots`);
    },
    async createInterviewSlot(positionId: string, data: { startTime: string; duration: number; capacity: number }): Promise<InterviewSlot> {
      return request<InterviewSlot>(`/positions/${positionId}/interview-slots`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async deleteInterviewSlot(slotId: string): Promise<void> {
      await request<void>(`/interview-slots/${slotId}`, { method: 'DELETE' });
    },
    async bookInterviewSlot(applicationId: string, slotId: string, applicantName: string): Promise<InterviewSlot> {
      return request<InterviewSlot>(`/interview-slots/${slotId}/book`, {
        method: 'POST',
        body: JSON.stringify({ applicationId, applicantName }),
      });
    },

    // ── Forum ───────────────────────────────────────
    async getForumChannel(applicationGroupId: string): Promise<ForumChannel | undefined> {
      return request<ForumChannel>(`/forum-channels/${applicationGroupId}`);
    },
    async listForumChannels(userId: string): Promise<ForumChannel[]> {
      return request<ForumChannel[]>(`/users/${userId}/forum-channels`);
    },
    async postForumMessage(applicationGroupId: string, data: { senderId: string; senderName: string; body: string }): Promise<ForumPost> {
      return request<ForumPost>(`/forum-channels/${applicationGroupId}/posts`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async ensureForumChannel(data: {
      positionId: string;
      clubName: string;
      positionTitle: string;
      member: { id: string; name: string };
    }): Promise<ForumChannel> {
      return request<ForumChannel>('/forum-channels', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  };
}
