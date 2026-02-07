import type {
  Application,
  ApplicationFilters,
  ApplicationStatus,
  Club,
  FormSchema,
  ForumChannel,
  ForumPost,
  InterviewSlot,
  Position,
  RecruitmentPost,
  Review,
  ReviewReply,
  ReviewThread,
} from '../contracts';

export interface PortalApi {
  // ── Clubs ─────────────────────────────────────────
  listClubsRecruiting(): Promise<Club[]>;
  listAllClubs(): Promise<Club[]>;
  getClub(slug: string): Promise<Club | undefined>;
  getClubPositions(clubSlug: string): Promise<Position[]>;

  // ── Recruitment (admin) ───────────────────────────
  listRecruitmentPosts(clubId: string): Promise<RecruitmentPost[]>;
  upsertRecruitmentPost(post: Omit<RecruitmentPost, 'id'> & { id?: string }): Promise<RecruitmentPost>;
  deleteRecruitmentPost(postId: string): Promise<void>;
  addPosition(postId: string, position: Omit<Position, 'id' | 'applicantCount' | 'createdAt'>): Promise<Position>;
  updatePosition(postId: string, positionId: string, data: Partial<Omit<Position, 'id' | 'clubId' | 'applicantCount' | 'createdAt'>>): Promise<Position>;
  deletePosition(postId: string, positionId: string): Promise<void>;

  // ── Form Schema ───────────────────────────────────
  getFormSchema(positionId: string): Promise<FormSchema | undefined>;
  upsertFormSchema(positionId: string, schema: Omit<FormSchema, 'id' | 'positionId' | 'updatedAt'>): Promise<FormSchema>;

  // ── Applications (student) ────────────────────────
  submitApplication(data: {
    userId: string;
    clubId: string;
    positionId: string;
    answers: { questionId: string; question: string; answer: string }[];
    applicantName: string;
    applicantEmail: string;
    clubName: string;
    positionTitle: string;
  }): Promise<Application>;
  listMyApplications(studentId: string): Promise<Application[]>;

  // ── Applications (admin) ──────────────────────────
  listApplicationsForClub(clubId: string, filters?: ApplicationFilters): Promise<Application[]>;
  getApplicationDetail(applicationId: string): Promise<Application | undefined>;
  updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<Application>;

  // ── Reviews (threaded) ────────────────────────────
  getReviewThread(applicationId: string): Promise<ReviewThread>;
  addTopLevelReview(applicationId: string, data: { reviewerId: string; reviewerName: string; rating: number; body: string }): Promise<Review>;
  replyToReview(reviewId: string, data: { authorId: string; authorName: string; body: string }): Promise<ReviewReply>;

  // ── Interview Slots ───────────────────────────────
  listInterviewSlots(positionId: string): Promise<InterviewSlot[]>;
  bookInterviewSlot(applicationId: string, slotId: string, applicantName: string): Promise<InterviewSlot>;

  // ── Forum ─────────────────────────────────────────
  getForumChannel(applicationGroupId: string): Promise<ForumChannel | undefined>;
  listForumChannels(userId: string): Promise<ForumChannel[]>;
  postForumMessage(applicationGroupId: string, data: { senderId: string; senderName: string; body: string }): Promise<ForumPost>;
  ensureForumChannel(data: {
    positionId: string;
    clubName: string;
    positionTitle: string;
    member: { id: string; name: string };
  }): Promise<ForumChannel>;
}
