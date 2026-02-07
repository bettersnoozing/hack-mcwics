import type {
  ActivityEvent,
  Application,
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
} from '../contracts';
import type { PortalApi } from './portalApi';

// ── Helpers ───────────────────────────────────────────
const LS_KEY = 'mcgill-portal-mock';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function now(): string {
  return new Date().toISOString();
}

interface MockStore {
  clubs: Club[];
  positions: Position[];
  recruitmentPosts: RecruitmentPost[];
  formSchemas: FormSchema[];
  applications: Application[];
  reviews: Review[];
  forumChannels: ForumChannel[];
  interviewSlots: InterviewSlot[];
  internalNotes: InternalNote[];
  activityEvents: ActivityEvent[];
}

function defaultFixtures(): MockStore {
  const clubs: Club[] = [
    { id: 'c1', slug: 'mcgill-ai', name: 'McGill AI Society', description: 'Exploring artificial intelligence through workshops, research projects, and guest lectures. Open to all faculties.', tags: ['AI', 'Machine Learning', 'Research'], memberCount: 120, isRecruiting: true, createdAt: '2024-09-01' },
    { id: 'c2', slug: 'hack-mcgill', name: 'HackMcGill', description: 'Organizing McHacks and other hackathon events. Join our team to help plan the largest student hackathon in Montreal!', tags: ['Hackathons', 'Events', 'Development'], memberCount: 85, isRecruiting: true, createdAt: '2024-08-15' },
    { id: 'c3', slug: 'csus', name: 'Computer Science Undergraduate Society', description: 'Your student government for CS. We run career fairs, tutoring, and social events.', tags: ['CS', 'Community', 'Careers'], memberCount: 200, isRecruiting: false, createdAt: '2024-07-01' },
    { id: 'c4', slug: 'mcgill-robotics', name: 'McGill Robotics', description: 'Design and build autonomous robots for international competitions. Mechanical, electrical, and software teams.', tags: ['Robotics', 'Engineering', 'Hardware'], memberCount: 65, isRecruiting: true, createdAt: '2024-09-10' },
    { id: 'c5', slug: 'mcgill-women-cs', name: 'McGill Women in CS', description: 'Supporting women and non-binary individuals in computer science through mentorship, networking, and workshops.', tags: ['Diversity', 'CS', 'Mentorship'], memberCount: 150, isRecruiting: true, createdAt: '2024-08-20' },
    { id: 'c6', slug: 'mcgill-blockchain', name: 'McGill Blockchain Club', description: 'Diving into blockchain, Web3, and decentralized technologies. Weekly study sessions and project teams.', tags: ['Blockchain', 'Web3', 'Crypto'], memberCount: 40, isRecruiting: true, createdAt: '2024-10-01' },
  ];

  const positions: Position[] = [
    { id: 'p1', clubId: 'c1', title: 'Software Developer', description: 'Build and maintain internal tools and project codebases.', requirements: ['Python or JavaScript experience', 'Git proficiency'], deadline: '2025-03-15', isOpen: true, applicantCount: 12, createdAt: '2025-01-10' },
    { id: 'p2', clubId: 'c1', title: 'Workshop Coordinator', description: 'Plan and run weekly AI/ML workshops for members.', requirements: ['Presentation skills', 'Basic ML knowledge'], deadline: '2025-03-10', isOpen: true, applicantCount: 8, createdAt: '2025-01-10' },
    { id: 'p3', clubId: 'c2', title: 'Frontend Developer', description: 'Build the McHacks website and registration system.', requirements: ['React', 'TypeScript', 'CSS'], deadline: '2025-02-28', isOpen: true, applicantCount: 20, createdAt: '2025-01-05' },
    { id: 'p4', clubId: 'c4', title: 'Controls Engineer', description: 'Develop autonomous navigation and control systems for our robots.', requirements: ['ROS experience', 'C++ or Python', 'Control theory basics'], deadline: '2025-03-20', isOpen: true, applicantCount: 5, createdAt: '2025-01-15' },
    { id: 'p5', clubId: 'c5', title: 'Events Coordinator', description: 'Plan mentorship mixers, coding workshops, and networking nights.', requirements: ['Event planning', 'Communication skills'], deadline: '2025-03-01', isOpen: true, applicantCount: 10, createdAt: '2025-01-12' },
    { id: 'p6', clubId: 'c6', title: 'Blockchain Developer', description: 'Build smart contracts and DApp prototypes for educational projects.', requirements: ['Solidity or Rust', 'Web3.js'], deadline: '2025-04-01', isOpen: true, applicantCount: 3, createdAt: '2025-01-20' },
  ];

  const recruitmentPosts: RecruitmentPost[] = [
    { id: 'r1', clubId: 'c1', title: 'Winter 2025 Recruitment', description: 'Join our team for the winter semester! We have multiple openings.', positions: [positions[0]!, positions[1]!], publishedAt: '2025-01-10', closesAt: '2025-03-15', isActive: true },
    { id: 'r2', clubId: 'c2', title: 'McHacks Team Recruitment', description: 'Help us build the best hackathon experience!', positions: [positions[2]!], publishedAt: '2025-01-05', closesAt: '2025-02-28', isActive: true },
    { id: 'r3', clubId: 'c4', title: 'Robotics Winter Recruitment', description: 'Multiple sub-teams looking for new members.', positions: [positions[3]!], publishedAt: '2025-01-15', closesAt: '2025-03-20', isActive: true },
    { id: 'r4', clubId: 'c5', title: 'WiCS Exec Applications', description: 'Join the exec team and help us empower women in tech.', positions: [positions[4]!], publishedAt: '2025-01-12', closesAt: '2025-03-01', isActive: true },
  ];

  const formSchemas: FormSchema[] = positions.map((p) => ({
    id: `fs-${p.id}`,
    positionId: p.id,
    questions: [
      { id: `q-${p.id}-1`, label: 'Why do you want to join this club?', type: 'long_text' as const, required: true, placeholder: 'Tell us about your motivation...' },
      { id: `q-${p.id}-2`, label: 'Relevant experience', type: 'long_text' as const, required: true, placeholder: 'Describe your skills and experience...' },
      { id: `q-${p.id}-3`, label: 'Portfolio / GitHub URL', type: 'url' as const, required: false, placeholder: 'https://github.com/...' },
    ],
    updatedAt: '2025-01-10',
  }));

  const applications: Application[] = [
    { id: 'a1', userId: 'stu-alice', clubId: 'c1', positionId: 'p1', status: 'submitted', answers: [{ questionId: 'q-p1-1', question: 'Why do you want to join this club?', answer: 'I love AI and want to contribute to meaningful projects.' }, { questionId: 'q-p1-2', question: 'Relevant experience', answer: '2 years of Python development, completed ML course.' }], submittedAt: '2025-01-20', updatedAt: '2025-01-20', applicantName: 'Alice Chen', applicantEmail: 'alice.chen@mail.mcgill.ca', clubName: 'McGill AI Society', positionTitle: 'Software Developer' },
    { id: 'a2', userId: 'stu-alice', clubId: 'c2', positionId: 'p3', status: 'under_review', answers: [{ questionId: 'q-p3-1', question: 'Why do you want to join this club?', answer: 'I love hackathons and want to help organize McHacks.' }, { questionId: 'q-p3-2', question: 'Relevant experience', answer: 'Built 3 web apps, experienced with React and TypeScript.' }], submittedAt: '2025-01-18', updatedAt: '2025-01-22', applicantName: 'Alice Chen', applicantEmail: 'alice.chen@mail.mcgill.ca', clubName: 'HackMcGill', positionTitle: 'Frontend Developer' },
    { id: 'a3', userId: 'stu-bob', clubId: 'c1', positionId: 'p2', status: 'interview_invited', answers: [{ questionId: 'q-p2-1', question: 'Why do you want to join this club?', answer: 'I want to share my ML knowledge with others.' }, { questionId: 'q-p2-2', question: 'Relevant experience', answer: 'TA for COMP 551, gave 5 conference presentations.' }], submittedAt: '2025-01-15', updatedAt: '2025-01-25', applicantName: 'Bob Martinez', applicantEmail: 'bob.martinez@mail.mcgill.ca', clubName: 'McGill AI Society', positionTitle: 'Workshop Coordinator' },
    { id: 'a4', userId: 'stu-clara', clubId: 'c4', positionId: 'p4', status: 'accepted', answers: [{ questionId: 'q-p4-1', question: 'Why do you want to join this club?', answer: 'Passionate about robotics since high school.' }, { questionId: 'q-p4-2', question: 'Relevant experience', answer: 'FRC team lead, ROS and C++ experience.' }], submittedAt: '2025-01-12', updatedAt: '2025-01-28', applicantName: 'Clara Kim', applicantEmail: 'clara.kim@mail.mcgill.ca', clubName: 'McGill Robotics', positionTitle: 'Controls Engineer' },
    { id: 'a5', userId: 'stu-bob', clubId: 'c5', positionId: 'p5', status: 'submitted', answers: [{ questionId: 'q-p5-1', question: 'Why do you want to join this club?', answer: 'I care about diversity in tech and want to help organize events.' }, { questionId: 'q-p5-2', question: 'Relevant experience', answer: 'Organized 2 campus events, strong communication skills.' }], submittedAt: '2025-01-22', updatedAt: '2025-01-22', applicantName: 'Bob Martinez', applicantEmail: 'bob.martinez@mail.mcgill.ca', clubName: 'McGill Women in CS', positionTitle: 'Events Coordinator' },
  ];

  const reviews: Review[] = [
    { id: 'rev1', applicationId: 'a1', reviewerId: 'adm-ai-1', reviewerName: 'Dr. Smith', rating: 4, body: 'Strong technical background, good fit for the team.', replies: [{ id: 'rr1', reviewId: 'rev1', authorId: 'adm-ai-2', authorName: 'Sarah Lee', body: 'Agreed, I think we should move them forward.', createdAt: '2025-01-23' }], createdAt: '2025-01-22' },
    { id: 'rev2', applicationId: 'a1', reviewerId: 'adm-ai-2', reviewerName: 'Sarah Lee', rating: 5, body: 'Excellent answers, very enthusiastic about AI.', replies: [], createdAt: '2025-01-23' },
    { id: 'rev3', applicationId: 'a3', reviewerId: 'adm-ai-1', reviewerName: 'Dr. Smith', rating: 4, body: 'Great presentation experience, perfect for workshop coordinator role.', replies: [], createdAt: '2025-01-26' },
  ];

  const forumChannels: ForumChannel[] = [
    {
      id: 'fc1', applicationGroupId: 'fg1', clubName: 'HackMcGill', positionTitle: 'Frontend Developer',
      members: [{ id: 'stu-alice', name: 'Alice Chen' }, { id: 'stu-dave', name: 'Dave Park' }, { id: 'stu-emma', name: 'Emma Wilson' }],
      posts: [
        { id: 'fp1', channelId: 'fc1', senderId: 'stu-alice', senderName: 'Alice Chen', body: 'Hey everyone! Excited to be applying for the same position. Anyone have tips for the interview?', createdAt: '2025-01-24T10:00:00' },
        { id: 'fp2', channelId: 'fc1', senderId: 'stu-emma', senderName: 'Emma Wilson', body: 'I heard they focus on React concepts and system design. Good luck!', createdAt: '2025-01-24T12:15:00' },
        { id: 'fp3', channelId: 'fc1', senderId: 'stu-dave', senderName: 'Dave Park', body: 'Good luck everyone! When do interviews start?', createdAt: '2025-01-24T15:30:00' },
      ],
    },
  ];

  const interviewSlots: InterviewSlot[] = [
    { id: 'is1', positionId: 'p1', startTime: '2025-02-10T10:00:00', endTime: '2025-02-10T10:30:00', duration: 30, capacity: 1, bookedCount: 0, bookings: [] },
    { id: 'is2', positionId: 'p1', startTime: '2025-02-10T10:30:00', endTime: '2025-02-10T11:00:00', duration: 30, capacity: 1, bookedCount: 0, bookings: [] },
    { id: 'is3', positionId: 'p1', startTime: '2025-02-10T11:00:00', endTime: '2025-02-10T11:30:00', duration: 30, capacity: 2, bookedCount: 1, bookings: [{ applicationId: 'a1', applicantName: 'Alice Chen' }] },
    { id: 'is4', positionId: 'p2', startTime: '2025-02-12T14:00:00', endTime: '2025-02-12T14:30:00', duration: 30, capacity: 1, bookedCount: 0, bookings: [] },
    { id: 'is5', positionId: 'p2', startTime: '2025-02-12T14:30:00', endTime: '2025-02-12T15:00:00', duration: 30, capacity: 1, bookedCount: 1, bookings: [{ applicationId: 'a3', applicantName: 'Bob Martinez' }] },
  ];

  const internalNotes: InternalNote[] = [
    { id: 'note1', applicationId: 'a1', authorId: 'adm-ai-1', authorName: 'Dr. Smith', body: 'Strong candidate, schedule for technical interview.', createdAt: '2025-01-21T10:30:00' },
    { id: 'note2', applicationId: 'a3', authorId: 'adm-ai-1', authorName: 'Dr. Smith', body: 'Great presentation skills. Would be perfect for workshops.', createdAt: '2025-01-26T14:00:00' },
  ];

  const activityEvents: ActivityEvent[] = [
    { id: 'ev1', applicationId: 'a1', type: 'submitted', actorName: 'Alice Chen', description: 'Application submitted', createdAt: '2025-01-20T09:00:00' },
    { id: 'ev2', applicationId: 'a1', type: 'status_change', actorName: 'Dr. Smith', description: 'Status changed to Under Review', createdAt: '2025-01-21T10:00:00' },
    { id: 'ev3', applicationId: 'a1', type: 'note_added', actorName: 'Dr. Smith', description: 'Added internal note', createdAt: '2025-01-21T10:30:00' },
    { id: 'ev4', applicationId: 'a1', type: 'review_added', actorName: 'Dr. Smith', description: 'Added a 4-star review', createdAt: '2025-01-22T11:00:00' },
    { id: 'ev5', applicationId: 'a3', type: 'submitted', actorName: 'Bob Martinez', description: 'Application submitted', createdAt: '2025-01-15T08:00:00' },
    { id: 'ev6', applicationId: 'a3', type: 'status_change', actorName: 'Dr. Smith', description: 'Status changed to Interview', createdAt: '2025-01-25T09:00:00' },
  ];

  return { clubs, positions, recruitmentPosts, formSchemas, applications, reviews, forumChannels, interviewSlots, internalNotes, activityEvents };
}

// ── Store manager ─────────────────────────────────────
function loadStore(): MockStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockStore;
      // Migrate old data: add missing arrays
      if (!parsed.internalNotes) parsed.internalNotes = [];
      if (!parsed.activityEvents) parsed.activityEvents = [];
      // Migrate old interview slots to new structure
      if (parsed.interviewSlots?.length && !('bookings' in parsed.interviewSlots[0])) {
        parsed.interviewSlots = parsed.interviewSlots.map((s: any) => ({
          ...s,
          duration: 30,
          capacity: 1,
          bookedCount: s.bookedByApplicationId ? 1 : 0,
          bookings: s.bookedByApplicationId ? [{ applicationId: s.bookedByApplicationId, applicantName: s.bookedByName || '' }] : [],
        }));
      }
      return parsed;
    }
  } catch { /* corrupted — reset */ }
  const store = defaultFixtures();
  localStorage.setItem(LS_KEY, JSON.stringify(store));
  return store;
}

function saveStore(store: MockStore): void {
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

// Simulate network latency
function delay(ms = 80): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Implementation ────────────────────────────────────
export function createMockPortalApi(): PortalApi {
  let store = loadStore();

  const persist = () => saveStore(store);

  const api: PortalApi = {
    // ── Clubs ───────────────────────────────────────
    async listClubsRecruiting() {
      await delay();
      return store.clubs.filter((c) => c.isRecruiting);
    },
    async listAllClubs() {
      await delay();
      return [...store.clubs];
    },
    async getClub(slug) {
      await delay();
      return store.clubs.find((c) => c.slug === slug);
    },
    async getClubPositions(clubSlug) {
      await delay();
      const club = store.clubs.find((c) => c.slug === clubSlug);
      if (!club) return [];
      return store.positions.filter((p) => p.clubId === club.id && p.isOpen);
    },

    // ── Recruitment ─────────────────────────────────
    async listRecruitmentPosts(clubId) {
      await delay();
      return store.recruitmentPosts.filter((r) => r.clubId === clubId);
    },
    async upsertRecruitmentPost(post) {
      await delay();
      if (post.id) {
        const idx = store.recruitmentPosts.findIndex((r) => r.id === post.id);
        if (idx >= 0) {
          store.recruitmentPosts[idx] = { ...store.recruitmentPosts[idx]!, ...post, id: post.id };
          // Sync club isRecruiting
          const clubId = store.recruitmentPosts[idx]!.clubId;
          const hasActive = store.recruitmentPosts.some((r) => r.clubId === clubId && r.isActive);
          const club = store.clubs.find((c) => c.id === clubId);
          if (club) club.isRecruiting = hasActive;
          persist();
          return store.recruitmentPosts[idx]!;
        }
      }
      const created: RecruitmentPost = { ...post, id: post.id ?? uid() } as RecruitmentPost;
      store.recruitmentPosts.push(created);
      // Sync club isRecruiting
      if (created.isActive) {
        const club = store.clubs.find((c) => c.id === created.clubId);
        if (club) club.isRecruiting = true;
      }
      persist();
      return created;
    },

    async deleteRecruitmentPost(postId) {
      await delay();
      const idx = store.recruitmentPosts.findIndex((r) => r.id === postId);
      if (idx >= 0) {
        const post = store.recruitmentPosts[idx]!;
        // Remove associated positions from global store
        for (const pos of post.positions) {
          const pIdx = store.positions.findIndex((p) => p.id === pos.id);
          if (pIdx >= 0) store.positions.splice(pIdx, 1);
        }
        store.recruitmentPosts.splice(idx, 1);
        // Update club isRecruiting flag
        const remaining = store.recruitmentPosts.filter((r) => r.clubId === post.clubId && r.isActive);
        const club = store.clubs.find((c) => c.id === post.clubId);
        if (club) club.isRecruiting = remaining.length > 0;
        persist();
      }
    },

    async addPosition(postId, position) {
      await delay();
      const post = store.recruitmentPosts.find((r) => r.id === postId);
      if (!post) throw new Error('Recruitment post not found');
      const created: Position = {
        ...position,
        id: uid(),
        applicantCount: 0,
        createdAt: now(),
      };
      post.positions.push(created);
      store.positions.push(created);
      // Auto-create a default form schema
      store.formSchemas.push({
        id: uid(),
        positionId: created.id,
        questions: [
          { id: uid(), label: 'Why do you want to join this club?', type: 'long_text', required: true, placeholder: 'Tell us about your motivation...' },
          { id: uid(), label: 'Relevant experience', type: 'long_text', required: true, placeholder: 'Describe your skills and experience...' },
          { id: uid(), label: 'Portfolio / GitHub URL', type: 'url', required: false, placeholder: 'https://github.com/...' },
        ],
        updatedAt: now(),
      });
      // Update club isRecruiting if position is open
      if (created.isOpen) {
        const club = store.clubs.find((c) => c.id === post.clubId);
        if (club) club.isRecruiting = true;
      }
      persist();
      return created;
    },

    async updatePosition(postId, positionId, data) {
      await delay();
      const post = store.recruitmentPosts.find((r) => r.id === postId);
      if (!post) throw new Error('Recruitment post not found');
      const posInPost = post.positions.find((p) => p.id === positionId);
      if (!posInPost) throw new Error('Position not found in post');
      Object.assign(posInPost, data);
      // Also update in global positions array
      const global = store.positions.find((p) => p.id === positionId);
      if (global) Object.assign(global, data);
      persist();
      return posInPost;
    },

    async deletePosition(postId, positionId) {
      await delay();
      const post = store.recruitmentPosts.find((r) => r.id === postId);
      if (!post) throw new Error('Recruitment post not found');
      post.positions = post.positions.filter((p) => p.id !== positionId);
      const gIdx = store.positions.findIndex((p) => p.id === positionId);
      if (gIdx >= 0) store.positions.splice(gIdx, 1);
      persist();
    },

    // ── Form Schema ─────────────────────────────────
    async getFormSchema(positionId) {
      await delay();
      return store.formSchemas.find((f) => f.positionId === positionId);
    },
    async upsertFormSchema(positionId, schema) {
      await delay();
      const idx = store.formSchemas.findIndex((f) => f.positionId === positionId);
      const entry: FormSchema = { ...schema, id: idx >= 0 ? store.formSchemas[idx]!.id : uid(), positionId, updatedAt: now() };
      if (idx >= 0) store.formSchemas[idx] = entry;
      else store.formSchemas.push(entry);
      persist();
      return entry;
    },

    // ── Applications (student) ──────────────────────
    async submitApplication(data) {
      await delay();
      const app: Application = {
        id: uid(),
        ...data,
        status: 'submitted',
        submittedAt: now(),
        updatedAt: now(),
      };
      store.applications.push(app);
      // bump applicant count
      const pos = store.positions.find((p) => p.id === data.positionId);
      if (pos) pos.applicantCount += 1;
      persist();
      return app;
    },
    async listMyApplications(studentId) {
      await delay();
      return store.applications.filter((a) => a.userId === studentId);
    },

    // ── Applications (admin) ────────────────────────
    async listApplicationsForClub(clubId, filters) {
      await delay();
      let result = store.applications.filter((a) => a.clubId === clubId);
      if (filters?.status) result = result.filter((a) => a.status === filters.status);
      if (filters?.positionId) result = result.filter((a) => a.positionId === filters.positionId);
      return result;
    },
    async getApplicationDetail(applicationId) {
      await delay();
      return store.applications.find((a) => a.id === applicationId);
    },
    async updateApplicationStatus(applicationId, status) {
      await delay();
      const app = store.applications.find((a) => a.id === applicationId);
      if (!app) throw new Error('Application not found');
      app.status = status;
      app.updatedAt = now();
      persist();
      return app;
    },

    async bulkUpdateApplicationStatus(applicationIds, status) {
      await delay();
      const updated: Application[] = [];
      for (const id of applicationIds) {
        const app = store.applications.find((a) => a.id === id);
        if (app) {
          app.status = status;
          app.updatedAt = now();
          updated.push(app);
        }
      }
      persist();
      return updated;
    },

    // ── Reviews ─────────────────────────────────────
    async getReviewThread(applicationId) {
      await delay();
      return { applicationId, reviews: store.reviews.filter((r) => r.applicationId === applicationId) };
    },
    async addTopLevelReview(applicationId, data) {
      await delay();
      const review: Review = { id: uid(), applicationId, ...data, replies: [], createdAt: now() };
      store.reviews.push(review);
      persist();
      return review;
    },
    async replyToReview(reviewId, data) {
      await delay();
      const review = store.reviews.find((r) => r.id === reviewId);
      if (!review) throw new Error('Review not found');
      const reply: ReviewReply = { id: uid(), reviewId, ...data, createdAt: now() };
      review.replies.push(reply);
      persist();
      return reply;
    },

    // ── Internal Notes ──────────────────────────────
    async getInternalNotes(applicationId) {
      await delay();
      return store.internalNotes.filter((n) => n.applicationId === applicationId);
    },
    async addInternalNote(applicationId, data) {
      await delay();
      const note: InternalNote = { id: uid(), applicationId, ...data, createdAt: now() };
      store.internalNotes.push(note);
      // Add activity event
      store.activityEvents.push({
        id: uid(),
        applicationId,
        type: 'note_added',
        actorName: data.authorName,
        description: 'Added internal note',
        createdAt: now(),
      });
      persist();
      return note;
    },

    // ── Activity Timeline ───────────────────────────
    async getActivityTimeline(applicationId) {
      await delay();
      return store.activityEvents
        .filter((e) => e.applicationId === applicationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    // ── Interview Slots ─────────────────────────────
    async listInterviewSlots(positionId) {
      await delay();
      return store.interviewSlots.filter((s) => s.positionId === positionId);
    },
    async createInterviewSlot(positionId, data) {
      await delay();
      const endTime = new Date(new Date(data.startTime).getTime() + data.duration * 60000).toISOString();
      const slot: InterviewSlot = {
        id: uid(),
        positionId,
        startTime: data.startTime,
        endTime,
        duration: data.duration,
        capacity: data.capacity,
        bookedCount: 0,
        bookings: [],
      };
      store.interviewSlots.push(slot);
      persist();
      return slot;
    },
    async deleteInterviewSlot(slotId) {
      await delay();
      const idx = store.interviewSlots.findIndex((s) => s.id === slotId);
      if (idx >= 0) store.interviewSlots.splice(idx, 1);
      persist();
    },
    async bookInterviewSlot(applicationId, slotId, applicantName) {
      await delay();
      const slot = store.interviewSlots.find((s) => s.id === slotId);
      if (!slot) throw new Error('Slot not found');
      if (slot.bookedCount >= slot.capacity) throw new Error('Slot is full');
      slot.bookings.push({ applicationId, applicantName });
      slot.bookedCount++;
      persist();
      return slot;
    },

    // ── Forum ───────────────────────────────────────
    async getForumChannel(applicationGroupId) {
      await delay();
      return store.forumChannels.find((c) => c.applicationGroupId === applicationGroupId);
    },
    async listForumChannels(userId) {
      await delay();
      return store.forumChannels.filter((c) => c.members.some((m) => m.id === userId));
    },
    async postForumMessage(applicationGroupId, data) {
      await delay();
      const channel = store.forumChannels.find((c) => c.applicationGroupId === applicationGroupId);
      if (!channel) throw new Error('Forum channel not found');
      const post: ForumPost = { id: uid(), channelId: channel.id, ...data, createdAt: now() };
      channel.posts.push(post);
      persist();
      return post;
    },

    async ensureForumChannel({ positionId, clubName, positionTitle, member }) {
      await delay();
      const groupId = `forum-${positionId}`;
      let channel = store.forumChannels.find((c) => c.applicationGroupId === groupId);
      if (channel) {
        if (!channel.members.some((m) => m.id === member.id)) {
          channel.members.push(member);
          persist();
        }
        return channel;
      }
      channel = {
        id: uid(),
        applicationGroupId: groupId,
        clubName,
        positionTitle,
        members: [member],
        posts: [],
      };
      store.forumChannels.push(channel);
      persist();
      return channel;
    },
  };

  return api;
}
