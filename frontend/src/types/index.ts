export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  avatarUrl?: string;
  createdAt: string;
}

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

export interface Application {
  id: string;
  userId: string;
  clubId: string;
  positionId: string;
  status: ApplicationStatus;
  answers: ApplicationAnswer[];
  submittedAt: string;
  updatedAt: string;
  applicantName?: string;
  applicantEmail?: string;
  clubName?: string;
  positionTitle?: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'interview'
  | 'accepted'
  | 'rejected';

export interface ApplicationAnswer {
  questionId: string;
  question: string;
  answer: string;
}

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

export interface Review {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ForumMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface ForumGroup {
  id: string;
  applicationId: string;
  clubName: string;
  positionTitle: string;
  members: { id: string; name: string }[];
  lastMessage?: ForumMessage;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
