import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Star, MessageSquare, Reply, ChevronDown, Check,
  Clock, FileText, User, StickyNote, Send, Calendar,
} from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { EmailPreviewModal, generateInterviewInviteEmail, generateAcceptedEmail, generateRejectedEmail } from '../../components/EmailPreviewModal';
import { useApi } from '../../contexts/ApiContext';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../contexts/ToastContext';
import { useOutbox } from '../../contexts/OutboxContext';
import type { Application, ApplicationStatus, ReviewThread, InternalNote, ActivityEvent, InterviewSlot } from '../../contracts';

// ── Status config ─────────────────────────────────────
const ALL_STATUSES: ApplicationStatus[] = ['submitted', 'under_review', 'interview_invited', 'interview_scheduled', 'accepted', 'rejected'];
const statusVariant: Record<ApplicationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default', submitted: 'info', under_review: 'warning', interview_invited: 'info', interview_scheduled: 'info', accepted: 'success', rejected: 'danger',
};
const statusLabel: Record<ApplicationStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', interview_invited: 'Interview Invited', interview_scheduled: 'Interview Scheduled', accepted: 'Accepted', rejected: 'Rejected',
};

const EMAIL_STATUSES: ApplicationStatus[] = ['interview_invited', 'accepted', 'rejected'];

// ── Status Dropdown ───────────────────────────────────
function StatusDropdown({ current, onChange }: { current: ApplicationStatus; onChange: (s: ApplicationStatus) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 cursor-pointer">
        <Badge variant={statusVariant[current]} className="text-sm px-3 py-1">{statusLabel[current]}</Badge>
        <ChevronDown size={14} className="text-warmGray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-warmGray-100 bg-white py-1 shadow-lg">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer ${s === current ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'}`}
              >
                <Badge variant={statusVariant[s]}>{statusLabel[s]}</Badge>
                {s === current && <Check size={12} className="ml-auto text-calm-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Timeline Event Icon ───────────────────────────────
function TimelineIcon({ type }: { type: ActivityEvent['type'] }) {
  const base = 'flex h-7 w-7 items-center justify-center rounded-full';
  switch (type) {
    case 'submitted': return <div className={`${base} bg-brand-100 text-brand-600`}><FileText size={12} /></div>;
    case 'status_change': return <div className={`${base} bg-calm-100 text-calm-600`}><Clock size={12} /></div>;
    case 'review_added': return <div className={`${base} bg-amber-100 text-amber-600`}><Star size={12} /></div>;
    case 'note_added': return <div className={`${base} bg-cozy-100 text-cozy-600`}><StickyNote size={12} /></div>;
    default: return <div className={`${base} bg-warmGray-100 text-warmGray-500`}><User size={12} /></div>;
  }
}

// ── Main Page ─────────────────────────────────────────
export function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const api = useApi();
  const session = useSession();
  const { showToast } = useToast();
  const { addEmail } = useOutbox();

  const [app, setApp] = useState<Application | undefined>();
  const [thread, setThread] = useState<ReviewThread | undefined>();
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [reviewBody, setReviewBody] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  // Note form state
  const [noteBody, setNoteBody] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Refs to prevent double submissions
  const submittingReviewRef = useRef(false);
  const submittingReplyRef = useRef(false);
  const submittingNoteRef = useRef(false);

  // Email preview modal
  const [emailPreview, setEmailPreview] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    Promise.all([
      api.getApplicationDetail(applicationId),
      api.getReviewThread(applicationId),
      api.getInternalNotes(applicationId).catch(() => []),
      api.getActivityTimeline(applicationId).catch(() => []),
    ]).then(([a, t, n, tl]) => {
      setApp(a);
      setThread(t);
      setNotes(n);
      setTimeline(tl);
      if (a) {
        api.listInterviewSlots(a.positionId).then(setSlots).catch(() => {});
      }
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load application detail:', err);
      setLoading(false);
    });
  }, [api, applicationId]);

  const generateEmailForStatus = (status: ApplicationStatus) => {
    if (!app) return null;
    const data = {
      studentEmail: app.applicantEmail,
      studentName: app.applicantName,
      clubName: app.clubName,
      positionTitle: app.positionTitle,
    };
    if (status === 'interview_invited') return generateInterviewInviteEmail(data);
    if (status === 'accepted') return generateAcceptedEmail(data);
    if (status === 'rejected') return generateRejectedEmail(data);
    return null;
  };

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!app || !session.role) return;

    // If this status triggers an email, show preview first
    if (EMAIL_STATUSES.includes(status)) {
      const email = generateEmailForStatus(status);
      if (email) {
        setEmailPreview(email);
        setPendingStatus(status);
        return;
      }
    }

    // Otherwise just update directly
    const updated = await api.updateApplicationStatus(app.id, status);
    setApp(updated);
    setTimeline((prev) => [{
      id: Math.random().toString(36).slice(2),
      applicationId: app.id,
      type: 'status_change',
      actorName: session.name,
      description: `Status changed to ${statusLabel[status]}`,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    showToast(`Status updated to ${statusLabel[status]}`);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || !emailPreview || !app || !session.role) return;
    
    addEmail(emailPreview);
    const updated = await api.updateApplicationStatus(app.id, pendingStatus);
    setApp(updated);
    setTimeline((prev) => [{
      id: Math.random().toString(36).slice(2),
      applicationId: app.id,
      type: 'status_change',
      actorName: session.name,
      description: `Status changed to ${statusLabel[pendingStatus]}`,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    showToast(`Status updated to ${statusLabel[pendingStatus]}`);
    setEmailPreview(null);
    setPendingStatus(null);
  };

  const cancelStatusChange = () => {
    setEmailPreview(null);
    setPendingStatus(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !session.role || !reviewBody.trim() || reviewRating === 0 || submittingReviewRef.current) return;
    submittingReviewRef.current = true;
    setSubmittingReview(true);
    try {
      await api.addTopLevelReview(app.id, {
        reviewerId: session.id,
        reviewerName: session.name,
        rating: reviewRating,
        body: reviewBody.trim(),
      });
      // Refetch to avoid duplicates
      const [updatedThread, updatedTimeline] = await Promise.all([
        api.getReviewThread(app.id),
        api.getActivityTimeline(app.id).catch(() => []),
      ]);
      setThread(updatedThread);
      setTimeline(updatedTimeline);
      setReviewBody('');
      setReviewRating(0);
    } finally {
      submittingReviewRef.current = false;
      setSubmittingReview(false);
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!app || !session.role || !replyBody.trim() || submittingReplyRef.current) return;
    submittingReplyRef.current = true;
    try {
      await api.replyToReview(reviewId, {
        authorId: session.id,
        authorName: session.name,
        body: replyBody.trim(),
      });
      // Refetch to avoid duplicates
      const updatedThread = await api.getReviewThread(app.id);
      setThread(updatedThread);
      setReplyBody('');
      setReplyingTo(null);
    } finally {
      submittingReplyRef.current = false;
    }
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !session.role || !noteBody.trim() || submittingNoteRef.current) return;
    submittingNoteRef.current = true;
    setSubmittingNote(true);
    try {
      await api.addInternalNote(app.id, {
        authorId: session.id,
        authorName: session.name,
        body: noteBody.trim(),
      });
      // Refetch to avoid duplicates
      const [updatedNotes, updatedTimeline] = await Promise.all([
        api.getInternalNotes(app.id).catch(() => []),
        api.getActivityTimeline(app.id).catch(() => []),
      ]);
      setNotes(updatedNotes);
      setTimeline(updatedTimeline);
      setNoteBody('');
      showToast('Note added');
    } finally {
      submittingNoteRef.current = false;
      setSubmittingNote(false);
    }
  };

  // Find booked slot for this application
  const bookedSlot = slots.find((s) => s.bookings.some((b) => b.applicationId === app?.id));

  if (loading) {
    return (
      <PageContainer className="max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4"><SkeletonCard /><SkeletonCard /></div>
          <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
        </div>
      </PageContainer>
    );
  }

  if (!app) {
    return <PageContainer><EmptyStateCard emoji="😕" title="Application not found" description="This application doesn't exist." /></PageContainer>;
  }

  const reviews = thread?.reviews ?? [];

  return (
    <AnimatedPage>
      <PageContainer className="max-w-6xl">
        <Link to="/admin/applications" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to Applications
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-calm-100 text-lg font-bold text-brand-600">
                {app.applicantName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-warmGray-800">{app.applicantName}</h1>
                <p className="text-sm text-warmGray-500">{app.applicantEmail}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="default">{app.positionTitle}</Badge>
              <span className="text-xs text-warmGray-400">at {app.clubName}</span>
              <span className="text-xs text-warmGray-400">&middot; Submitted {app.submittedAt.split('T')[0]}</span>
            </div>
          </div>
          <StatusDropdown current={app.status} onChange={handleStatusChange} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main Content ────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interview Info (if scheduled) */}
            {app.status === 'interview_scheduled' && bookedSlot && (
              <Card className="border-calm-200 bg-calm-50/30">
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-calm-100 text-calm-600">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-warmGray-800">Interview Scheduled</p>
                      <p className="text-sm text-warmGray-600">
                        {new Date(bookedSlot.startTime).toLocaleDateString()} at {new Date(bookedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(bookedSlot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Answers */}
            <div>
              <h2 className="text-sm font-semibold text-warmGray-700 uppercase tracking-wide mb-3">Application Answers</h2>
              <div className="space-y-4">
                {app.answers.map((ans, i) => (
                  <Card key={ans.questionId}>
                    <CardContent>
                      <p className="text-xs font-medium text-warmGray-400 uppercase tracking-wide mb-1">Q{i + 1}</p>
                      <p className="text-sm font-medium text-warmGray-700">{ans.question}</p>
                      <p className="mt-2 text-sm text-warmGray-600 whitespace-pre-wrap">{ans.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <h2 className="text-sm font-semibold text-warmGray-700 uppercase tracking-wide mb-3">
                Reviews ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <EmptyStateCard emoji="📝" title="No reviews yet" description="Be the first to leave a review." />
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <Card key={rev.id}>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100 text-xs font-medium text-brand-600">
                            {rev.reviewerName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-warmGray-700">{rev.reviewerName}</span>
                          <div className="flex items-center gap-0.5 ml-auto">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={14} className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-warmGray-200'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-warmGray-600">{rev.body}</p>
                        <p className="mt-2 text-xs text-warmGray-400">{new Date(rev.createdAt).toLocaleDateString()}</p>

                        {rev.replies.length > 0 && (
                          <div className="mt-3 ml-6 space-y-3 border-l-2 border-warmGray-100 pl-4">
                            {rev.replies.map((reply) => (
                              <div key={reply.id}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-warmGray-600">{reply.authorName}</span>
                                  <span className="text-[10px] text-warmGray-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-warmGray-500">{reply.body}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {replyingTo === rev.id ? (
                          <div className="mt-3 flex gap-2">
                            <div className="flex-1">
                              <Textarea placeholder="Write a reply..." value={replyBody} onChange={(e) => setReplyBody(e.target.value)} className="min-h-[60px]" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button variant="default" onClick={() => handleSubmitReply(rev.id)} disabled={!replyBody.trim()}>Reply</Button>
                              <Button variant="ghost" onClick={() => { setReplyingTo(null); setReplyBody(''); }}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setReplyingTo(rev.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-warmGray-400 hover:text-warmGray-600 transition-colors cursor-pointer">
                            <Reply size={12} />
                            Reply
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="mt-4">
                <CardContent>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-warmGray-700">
                    <MessageSquare size={16} />
                    Add a Review
                  </h3>
                  <form className="space-y-3" onSubmit={handleSubmitReview}>
                    <Textarea placeholder="Write your review..." value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} className="min-h-[80px]" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReviewRating(i + 1)}
                            className={`transition-colors cursor-pointer ${i < reviewRating ? 'text-amber-400' : 'text-warmGray-300 hover:text-amber-400'}`}
                          >
                            <Star size={18} className={i < reviewRating ? 'fill-amber-400' : ''} />
                          </button>
                        ))}
                      </div>
                      <Button variant="default" icon={<Send size={14} />} disabled={submittingReview || !reviewBody.trim() || reviewRating === 0}>
                        Submit
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Sidebar ─────────────────────────────────── */}
          <div className="space-y-6">
            {/* Internal Notes */}
            <div>
              <h2 className="text-sm font-semibold text-warmGray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <StickyNote size={14} />
                Internal Notes ({notes.length})
              </h2>
              <Card>
                <CardContent className="space-y-4">
                  {notes.length === 0 ? (
                    <p className="text-xs text-warmGray-400 text-center py-2">No notes yet.</p>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="border-l-2 border-brand-200 pl-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-warmGray-600">{note.authorName}</span>
                          <span className="text-[10px] text-warmGray-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-warmGray-600 mt-1">{note.body}</p>
                      </div>
                    ))
                  )}
                  <form onSubmit={handleSubmitNote} className="pt-2 border-t border-warmGray-100">
                    <Textarea placeholder="Add a private note..." value={noteBody} onChange={(e) => setNoteBody(e.target.value)} className="min-h-[60px] text-sm" />
                    <Button variant="outline" className="mt-2 w-full" disabled={submittingNote || !noteBody.trim()}>
                      {submittingNote ? 'Adding...' : 'Add Note'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            <div>
              <h2 className="text-sm font-semibold text-warmGray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock size={14} />
                Activity Timeline
              </h2>
              <Card>
                <CardContent>
                  {timeline.length === 0 ? (
                    <p className="text-xs text-warmGray-400 text-center py-2">No activity yet.</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-warmGray-100" />
                      <div className="space-y-4">
                        {timeline.map((ev) => (
                          <div key={ev.id} className="flex gap-3 relative">
                            <TimelineIcon type={ev.type} />
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="text-sm text-warmGray-700">{ev.description}</p>
                              <p className="text-xs text-warmGray-400">
                                {ev.actorName} &middot; {new Date(ev.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Email Preview Modal */}
        <EmailPreviewModal
          open={!!emailPreview}
          onClose={cancelStatusChange}
          onConfirm={confirmStatusChange}
          email={emailPreview}
        />
      </PageContainer>
    </AnimatedPage>
  );
}
