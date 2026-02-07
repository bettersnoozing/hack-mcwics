import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Star, MessageSquare, Reply } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useApi } from '../../contexts/ApiContext';
import { useDevSession } from '../../contexts/DevSessionContext';
import type { Application, ApplicationStatus, ReviewThread } from '../../contracts';

const statusVariant: Record<ApplicationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default', submitted: 'info', under_review: 'warning', interview: 'info', accepted: 'success', rejected: 'danger',
};
const statusLabel: Record<ApplicationStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', interview: 'Interview', accepted: 'Accepted', rejected: 'Rejected',
};

export function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const api = useApi();
  const { session } = useDevSession();
  const [app, setApp] = useState<Application | undefined>();
  const [thread, setThread] = useState<ReviewThread | undefined>();
  const [loading, setLoading] = useState(true);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  useEffect(() => {
    if (!applicationId) return;
    Promise.all([
      api.getApplicationDetail(applicationId),
      api.getReviewThread(applicationId),
    ]).then(([a, t]) => { setApp(a); setThread(t); setLoading(false); });
  }, [api, applicationId]);

  const handleStatusChange = async (status: ApplicationStatus) => {
    if (!app) return;
    const updated = await api.updateApplicationStatus(app.id, status);
    setApp(updated);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !session || !reviewBody.trim() || reviewRating === 0) return;
    setSubmitting(true);
    const review = await api.addTopLevelReview(app.id, {
      reviewerId: session.id,
      reviewerName: session.name,
      rating: reviewRating,
      body: reviewBody.trim(),
    });
    setThread((prev) => prev ? { ...prev, reviews: [...prev.reviews, review] } : prev);
    setReviewBody('');
    setReviewRating(0);
    setSubmitting(false);
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!session || !replyBody.trim()) return;
    const reply = await api.replyToReview(reviewId, {
      authorId: session.id,
      authorName: session.name,
      body: replyBody.trim(),
    });
    setThread((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reviews: prev.reviews.map((r) =>
          r.id === reviewId ? { ...r, replies: [...r.replies, reply] } : r
        ),
      };
    });
    setReplyBody('');
    setReplyingTo(null);
  };

  if (loading) {
    return <PageContainer><SkeletonCard /><SkeletonCard className="mt-4" /></PageContainer>;
  }

  if (!app) {
    return <PageContainer><EmptyStateCard emoji="😕" title="Application not found" description="This application doesn't exist." /></PageContainer>;
  }

  const reviews = thread?.reviews ?? [];

  return (
    <AnimatedPage>
      <PageContainer>
        <Link to="/admin/applications" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to Applications
        </Link>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-warmGray-800">{app.applicantName}</h1>
              <Badge variant={statusVariant[app.status]}>{statusLabel[app.status]}</Badge>
            </div>
            <p className="text-sm text-warmGray-500">{app.positionTitle} at {app.clubName} &middot; {app.applicantEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleStatusChange('rejected')}>Reject</Button>
            <Button variant="cozyGradient" onClick={() => handleStatusChange('accepted')}>Accept</Button>
          </div>
        </div>

        <SectionHeader title="Application Answers" className="mb-4" />
        <div className="mb-8 space-y-4">
          {app.answers.map((ans) => (
            <Card key={ans.questionId}>
              <CardContent>
                <p className="text-sm font-medium text-warmGray-600">{ans.question}</p>
                <p className="mt-2 text-sm text-warmGray-800">{ans.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <SectionHeader title="Reviews" subtitle={`${reviews.length} review${reviews.length !== 1 ? 's' : ''}`} className="mb-4" />
        {reviews.length === 0 ? (
          <EmptyStateCard emoji="📝" title="No reviews yet" description="Be the first to leave a review." className="mb-6" />
        ) : (
          <div className="mb-6 space-y-4">
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
                  <p className="mt-2 text-xs text-warmGray-400">{rev.createdAt}</p>

                  {/* Replies */}
                  {rev.replies.length > 0 && (
                    <div className="mt-3 ml-6 space-y-3 border-l-2 border-warmGray-100 pl-4">
                      {rev.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-warmGray-600">{reply.authorName}</span>
                            <span className="text-[10px] text-warmGray-400">{reply.createdAt}</span>
                          </div>
                          <p className="text-sm text-warmGray-500">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingTo === rev.id ? (
                    <div className="mt-3 ml-6 flex gap-2">
                      <div className="flex-1">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="default" onClick={() => handleSubmitReply(rev.id)} disabled={!replyBody.trim()}>Reply</Button>
                        <Button variant="ghost" onClick={() => { setReplyingTo(null); setReplyBody(''); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(rev.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-warmGray-400 hover:text-warmGray-600 transition-colors cursor-pointer"
                    >
                      <Reply size={12} />
                      Reply
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-warmGray-700">
              <MessageSquare size={16} />
              Add a Review
            </h3>
            <form className="space-y-4" onSubmit={handleSubmitReview}>
              <Textarea placeholder="Write your review..." value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} />
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
                <Button variant="default" icon={<MessageSquare size={16} />} disabled={submitting || !reviewBody.trim() || reviewRating === 0}>
                  Submit Review
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </AnimatedPage>
  );
}
