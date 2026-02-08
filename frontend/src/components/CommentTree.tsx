import { useState } from 'react';
import { MessageSquare, Send, Trash2, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { EmptyStateCard } from './ui/EmptyStateCard';
import type { CommentData } from '../services/forumApi';

function StarDisplay({ stars }: { stars: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= stars ? 'text-amber-400 fill-amber-400' : 'text-warmGray-200'}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="cursor-pointer p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={18}
            className={
              n <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-warmGray-300'
            }
          />
        </button>
      ))}
    </span>
  );
}

export interface CommentNode {
  comment: CommentData;
  children: CommentNode[];
}

export function buildTree(comments: CommentData[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c._id, { comment: c, children: [] });
  }

  for (const c of comments) {
    const node = map.get(c._id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  onReply: (parentId: string) => void;
  onDelete: (commentId: string) => void;
  onEditStars?: (commentId: string, stars: number) => void;
  replyingTo: string | null;
  replyBody: string;
  setReplyBody: (v: string) => void;
  onSubmitReply: () => void;
  submitting: boolean;
  currentUserId: string | undefined;
  isLeader: boolean;
  threadType: 'FORUM' | 'REVIEW';
}

function CommentItem({
  node,
  depth,
  onReply,
  onDelete,
  onEditStars,
  replyingTo,
  replyBody,
  setReplyBody,
  onSubmitReply,
  submitting,
  currentUserId,
  isLeader,
  threadType,
}: CommentItemProps) {
  const { comment, children } = node;
  const [collapsed, setCollapsed] = useState(false);
  const isAuthor = currentUserId === comment.author._id;
  const canDelete =
    !comment.deleted &&
    (threadType === 'REVIEW' ? isAuthor : isAuthor || isLeader);
  const isTopLevelReview = threadType === 'REVIEW' && !comment.parentId;

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-warmGray-100 pl-4' : ''}>
      <div className="py-3">
        <div className="flex items-start gap-3">
          {comment.author.profilePhotoUrl ? (
            <img
              src={comment.author.profilePhotoUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100 text-xs font-medium text-brand-600">
              {comment.deleted ? '?' : comment.author.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-warmGray-700">
                {comment.deleted ? '[deleted]' : comment.author.name}
              </span>
              {comment.author.roles?.includes('CLUB_LEADER') && !comment.deleted && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                  Leader
                </span>
              )}
              <span className="text-xs text-warmGray-400">{timeAgo(comment.createdAt)}</span>
            </div>

            {isTopLevelReview && !comment.deleted && comment.stars && (
              <div className="mt-1">
                {isAuthor && onEditStars ? (
                  <StarPicker
                    value={comment.stars}
                    onChange={(v) => onEditStars(comment._id, v)}
                  />
                ) : (
                  <StarDisplay stars={comment.stars} />
                )}
              </div>
            )}

            <p className={`mt-1 text-sm ${comment.deleted ? 'italic text-warmGray-400' : 'text-warmGray-600'}`}>
              {comment.deleted ? '[deleted]' : comment.body}
            </p>

            {!comment.deleted && (
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  onClick={() => onReply(comment._id)}
                  className="flex items-center gap-1 text-xs text-warmGray-400 hover:text-brand-500 transition-colors cursor-pointer"
                >
                  <MessageSquare size={12} />
                  Reply
                </button>
                {canDelete && (
                  <button
                    onClick={() => onDelete(comment._id)}
                    className="flex items-center gap-1 text-xs text-warmGray-400 hover:text-cozy-500 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                )}
                {children.length > 0 && (
                  <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-1 text-xs text-warmGray-400 hover:text-warmGray-600 transition-colors cursor-pointer"
                  >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    {children.length} {children.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </div>
            )}

            {replyingTo === comment._id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder={`Reply to ${comment.author.name}...`}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="!min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    variant="cozyGradient"
                    icon={<Send size={14} />}
                    onClick={onSubmitReply}
                    disabled={submitting || !replyBody.trim()}
                  >
                    {submitting ? 'Posting...' : 'Reply'}
                  </Button>
                  <Button variant="ghost" onClick={() => onReply('')}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!collapsed &&
        children.map((child) => (
          <CommentItem
            key={child.comment._id}
            node={child}
            depth={depth + 1}
            onReply={onReply}
            onDelete={onDelete}
            onEditStars={onEditStars}
            replyingTo={replyingTo}
            replyBody={replyBody}
            setReplyBody={setReplyBody}
            onSubmitReply={onSubmitReply}
            submitting={submitting}
            currentUserId={currentUserId}
            isLeader={isLeader}
            threadType={threadType}
          />
        ))}
    </div>
  );
}

interface CommentTreeProps {
  comments: CommentData[];
  currentUserId: string | undefined;
  isLeader: boolean;
  threadType: 'FORUM' | 'REVIEW';
  onPost: (body: string, parentId?: string | null, stars?: number) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onEditStars?: (commentId: string, stars: number) => Promise<void>;
  onDeleteError?: (message: string) => void;
  composerPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function CommentTree({
  comments,
  currentUserId,
  isLeader,
  threadType,
  onPost,
  onDelete,
  onEditStars,
  onDeleteError,
  composerPlaceholder = 'Start a new discussion...',
  emptyTitle = 'No posts yet',
  emptyDescription = 'Be the first to start the conversation!',
}: CommentTreeProps) {
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [newStars, setNewStars] = useState(0);

  const tree = buildTree(comments);

  const handleNewPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || posting) return;
    if (threadType === 'REVIEW' && newStars === 0) return;
    setPosting(true);
    try {
      await onPost(
        newPost.trim(),
        null,
        threadType === 'REVIEW' ? newStars : undefined,
      );
      setNewPost('');
      setNewStars(0);
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  const handleReply = (parentId: string) => {
    if (replyingTo === parentId || !parentId) {
      setReplyingTo(null);
      setReplyBody('');
    } else {
      setReplyingTo(parentId);
      setReplyBody('');
    }
  };

  const submitReply = async () => {
    if (!replyingTo || !replyBody.trim() || posting) return;
    setPosting(true);
    try {
      await onPost(replyBody.trim(), replyingTo);
      setReplyingTo(null);
      setReplyBody('');
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await onDelete(commentId);
    } catch (err: unknown) {
      const e = err as Error & { status?: number };
      if (onDeleteError) {
        onDeleteError(
          e.status === 403
            ? 'You can only delete your own comments.'
            : e.message || 'Failed to delete comment.'
        );
      }
    }
  };

  const handleEditStars = onEditStars
    ? async (commentId: string, stars: number) => {
        try { await onEditStars(commentId, stars); } catch { /* ignore */ }
      }
    : undefined;

  const isPostDisabled = posting || !newPost.trim() || (threadType === 'REVIEW' && newStars === 0);

  return (
    <>
      <Card className="mb-6">
        <CardContent>
          <form onSubmit={handleNewPost} className="space-y-3">
            {threadType === 'REVIEW' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-warmGray-600">Rating:</span>
                <StarPicker value={newStars} onChange={setNewStars} />
                {newStars === 0 && (
                  <span className="text-xs text-warmGray-400">Select a rating</span>
                )}
              </div>
            )}
            <Textarea
              placeholder={composerPlaceholder}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="!min-h-[80px]"
            />
            <div className="flex justify-end">
              <Button
                variant="cozyGradient"
                icon={<Send size={14} />}
                disabled={isPostDisabled}
              >
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {tree.length === 0 ? (
        <EmptyStateCard emoji="💬" title={emptyTitle} description={emptyDescription} />
      ) : (
        <Card>
          <CardContent className="divide-y divide-warmGray-100">
            {tree.map((node) => (
              <CommentItem
                key={node.comment._id}
                node={node}
                depth={0}
                onReply={handleReply}
                onDelete={handleDelete}
                onEditStars={handleEditStars}
                replyingTo={replyingTo}
                replyBody={replyBody}
                setReplyBody={setReplyBody}
                onSubmitReply={submitReply}
                submitting={posting}
                currentUserId={currentUserId}
                isLeader={isLeader}
                threadType={threadType}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
