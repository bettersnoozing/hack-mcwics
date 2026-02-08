import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { CommentTree } from '../../components/CommentTree';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { forumApi, type CommentData, type CommentThreadData } from '../../services/forumApi';

export function Forum() {
  const { clubId } = useParams<{ clubId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const from = searchParams.get('from');
  const backTo = from === 'exec' ? `/exec/club/${clubId}` : '/app';
  const backLabel = from === 'exec' ? 'Back to Club' : 'Back to Dashboard';

  const [thread, setThread] = useState<CommentThreadData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLeader = !!(
    user &&
    thread &&
    (user.roles.includes('CLUB_LEADER') || user.roles.includes('ADMIN'))
  );

  const loadThread = useCallback(async () => {
    if (!clubId) return;
    console.log("[DEBUG] Forum: loading thread for clubId=%s", clubId);
    try {
      const t = await forumApi.getOrCreateForumThread(clubId);
      console.log("[DEBUG] Forum: got thread id=%s title=%s", t._id, t.title);
      setThread(t);
      const c = await forumApi.listComments(t._id);
      console.log("[DEBUG] Forum: loaded %d comments", c.length);
      setComments(c);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      console.error("[DEBUG] Forum: error status=%s message=%s", e.status, e.message);
      if (e.status === 403) {
        setError("You don't have access to this forum yet.");
      } else if (e.status === 404) {
        setError('Forum not found.');
      } else {
        setError(e.message || 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const refreshComments = async () => {
    if (!thread) return;
    const c = await forumApi.listComments(thread._id);
    setComments(c);
  };

  const handlePost = async (body: string, parentId?: string | null, stars?: number) => {
    if (!thread) return;
    await forumApi.postComment(thread._id, body, parentId, stars);
    await refreshComments();
  };

  const handleDelete = async (commentId: string) => {
    if (!thread) return;
    await forumApi.softDeleteComment(commentId);
    await refreshComments();
  };

  if (loading) {
    return (
      <AnimatedPage>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard className="mt-4" />
        </PageContainer>
      </AnimatedPage>
    );
  }

  if (error) {
    const is404 = error === 'Forum not found.';
    return (
      <AnimatedPage>
        <PageContainer>
          <Link
            to={backTo}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
          <EmptyStateCard
            emoji={is404 ? "😕" : "🔒"}
            title={is404 ? "Forum Not Found" : "Access Denied"}
            description={error}
          />
        </PageContainer>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <Link
          to={backTo}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          {backLabel}
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-warmGray-800">{thread?.title}</h1>
          <p className="mt-1 text-sm text-warmGray-500">
            {thread?.commentCount ?? 0} {(thread?.commentCount ?? 0) === 1 ? 'post' : 'posts'}
          </p>
        </div>

        <CommentTree
          comments={comments}
          currentUserId={user?.id}
          isLeader={isLeader}
          threadType="FORUM"
          onPost={handlePost}
          onDelete={handleDelete}
          onDeleteError={(msg) => showToast(msg, 'error')}
          composerPlaceholder="Start a new discussion..."
          emptyTitle="No posts yet"
          emptyDescription="Be the first to start the conversation!"
        />
      </PageContainer>
    </AnimatedPage>
  );
}
