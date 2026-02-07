// ── Identity ──────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  clubId?: string; // set when role === 'admin'
  avatarUrl?: string;
  createdAt: string;
}

// ── Clubs ─────────────────────────────────────────────
export interface Club {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  tags: string[];
  memberCount: number;
  isRecruiting: boolean;
  createdAt: string;
}

// ── Recruitment ───────────────────────────────────────
export interface RecruitmentPost {
  id: string;
  clubId: string;
  title: string;
  description: string;
  positions: Position[];
  publishedAt: string;
  closesAt: string;
  isActive: boolean;
}

export interface Position {
  id: string;
  clubId: string;
  title: string;
  description: string;
  requirements: string[];
  deadline: string;
  isOpen: boolean;
  applicantCount: number;
  createdAt: string;
}

// ── Form Schema (dynamic application forms) ───────────
export interface FormSchema {
  id: string;
  positionId: string;
  questions: Question[];
  updatedAt: string;
}

export interface Question {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'url' | 'select';
  required: boolean;
  options?: string[]; // for type === 'select'
  placeholder?: string;
}

// ── Applications ──────────────────────────────────────
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'interview'
  | 'accepted'
  | 'rejected';

export interface Application {
  id: string;
  userId: string;
  clubId: string;
  positionId: string;
  status: ApplicationStatus;
  answers: ApplicationAnswer[];
  submittedAt: string;
  updatedAt: string;
  applicantName: string;
  applicantEmail: string;
  clubName: string;
  positionTitle: string;
}

export interface ApplicationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

// ── Reviews (threaded) ────────────────────────────────
export interface ReviewThread {
  applicationId: string;
  reviews: Review[];
}

export interface Review {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  body: string;
  replies: ReviewReply[];
  createdAt: string;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

// ── Forum ─────────────────────────────────────────────
export interface ForumChannel {
  id: string;
  applicationGroupId: string;
  clubName: string;
  positionTitle: string;
  members: { id: string; name: string }[];
  posts: ForumPost[];
}

export interface ForumPost {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

// ── Interview Slots ───────────────────────────────────
export interface InterviewSlot {
  id: string;
  positionId: string;
  startTime: string;
  endTime: string;
  bookedByApplicationId?: string;
  bookedByName?: string;
}

// ── Filter helpers ────────────────────────────────────
export interface ApplicationFilters {
  status?: ApplicationStatus;
  positionId?: string;
}
