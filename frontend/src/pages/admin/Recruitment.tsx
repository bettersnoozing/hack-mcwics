import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Users, Pencil, Trash2, ToggleLeft, ToggleRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Dialog } from '../../components/ui/Dialog';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useApi } from '../../contexts/ApiContext';
import { useSession } from '../../hooks/useSession';
import type { RecruitmentPost, Position } from '../../contracts';

// ── Post dialog ───────────────────────────────────────
interface PostFormState {
  title: string;
  description: string;
  closesAt: string;
  isActive: boolean;
}

const emptyPostForm: PostFormState = { title: '', description: '', closesAt: '', isActive: true };

function PostDialog({ open, onClose, onSave, initial, saving }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: PostFormState) => void;
  initial?: PostFormState;
  saving: boolean;
}) {
  const [form, setForm] = useState<PostFormState>(initial ?? emptyPostForm);

  useEffect(() => {
    if (open) setForm(initial ?? emptyPostForm);
  }, [open, initial]);

  const set = (key: keyof PostFormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Edit Recruitment Post' : 'New Recruitment Post'}>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); onSave(form); }}
      >
        <Input
          label="Title"
          placeholder="e.g. Winter 2025 Recruitment"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
        />
        <Textarea
          label="Description"
          placeholder="Describe what you're recruiting for..."
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          required
        />
        <Input
          label="Closes on"
          type="date"
          value={form.closesAt}
          onChange={(e) => set('closesAt', e.target.value)}
          required
        />
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => set('isActive', !form.isActive)}
            className="text-warmGray-400 hover:text-brand-500 transition-colors cursor-pointer"
          >
            {form.isActive
              ? <ToggleRight size={28} className="text-calm-500" />
              : <ToggleLeft size={28} />
            }
          </button>
          <span className="text-sm font-medium text-warmGray-700">
            {form.isActive ? 'Active — visible to students' : 'Inactive — hidden from students'}
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="cozyGradient" disabled={saving || !form.title.trim()}>
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Post'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ── Position dialog ───────────────────────────────────
interface PosFormState {
  title: string;
  description: string;
  requirements: string;
  deadline: string;
  isOpen: boolean;
}

const emptyPosForm: PosFormState = { title: '', description: '', requirements: '', deadline: '', isOpen: true };

function PositionDialog({ open, onClose, onSave, initial, saving }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: PosFormState) => void;
  initial?: PosFormState;
  saving: boolean;
}) {
  const [form, setForm] = useState<PosFormState>(initial ?? emptyPosForm);

  useEffect(() => {
    if (open) setForm(initial ?? emptyPosForm);
  }, [open, initial]);

  const set = (key: keyof PosFormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Edit Position' : 'Add Position'}>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); onSave(form); }}
      >
        <Input
          label="Position Title"
          placeholder="e.g. Frontend Developer"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
        />
        <Textarea
          label="Description"
          placeholder="What will this person do?"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          required
        />
        <Input
          label="Requirements (comma-separated)"
          placeholder="e.g. React, TypeScript, Git"
          value={form.requirements}
          onChange={(e) => set('requirements', e.target.value)}
        />
        <Input
          label="Application Deadline"
          type="date"
          value={form.deadline}
          onChange={(e) => set('deadline', e.target.value)}
          required
        />
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            onClick={() => set('isOpen', !form.isOpen)}
            className="text-warmGray-400 hover:text-brand-500 transition-colors cursor-pointer"
          >
            {form.isOpen
              ? <ToggleRight size={28} className="text-calm-500" />
              : <ToggleLeft size={28} />
            }
          </button>
          <span className="text-sm font-medium text-warmGray-700">
            {form.isOpen ? 'Open for applications' : 'Closed — not accepting applications'}
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="cozyGradient" disabled={saving || !form.title.trim()}>
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Position'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────
export function Recruitment() {
  const api = useApi();
  const session = useSession();
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Post dialog state
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<RecruitmentPost | null>(null);
  const [postSaving, setPostSaving] = useState(false);

  // Position dialog state
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [posTargetPostId, setPosTargetPostId] = useState<string | null>(null);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [posSaving, setPosSaving] = useState(false);

  const clubId = session.role === 'admin' ? (session.clubId ?? '') : '';

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    api.listRecruitmentPosts(clubId).then((r) => { setPosts(r); setLoading(false); });
  }, [api, clubId]);

  // ── Post CRUD ─────────────────────────────────────
  const openNewPost = () => { setEditingPost(null); setPostDialogOpen(true); };
  const openEditPost = (post: RecruitmentPost) => { setEditingPost(post); setPostDialogOpen(true); };

  const handleSavePost = async (form: PostFormState) => {
    if (!clubId) return;
    setPostSaving(true);
    if (editingPost) {
      const updated = await api.upsertRecruitmentPost({
        ...editingPost,
        title: form.title,
        description: form.description,
        closesAt: form.closesAt,
        isActive: form.isActive,
      });
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await api.upsertRecruitmentPost({
        clubId,
        title: form.title,
        description: form.description,
        closesAt: form.closesAt,
        isActive: form.isActive,
        positions: [],
        publishedAt: new Date().toISOString().split('T')[0]!,
      });
      setPosts((prev) => [...prev, created]);
    }
    setPostSaving(false);
    setPostDialogOpen(false);
  };

  const handleDeletePost = async (postId: string) => {
    await api.deleteRecruitmentPost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // ── Position CRUD ─────────────────────────────────
  const openAddPos = (postId: string) => {
    setPosTargetPostId(postId);
    setEditingPos(null);
    setPosDialogOpen(true);
  };

  const openEditPos = (postId: string, pos: Position) => {
    setPosTargetPostId(postId);
    setEditingPos(pos);
    setPosDialogOpen(true);
  };

  const handleSavePos = async (form: PosFormState) => {
    if (!posTargetPostId || !clubId) return;
    setPosSaving(true);
    const requirements = form.requirements.split(',').map((s) => s.trim()).filter(Boolean);

    if (editingPos) {
      const updated = await api.updatePosition(posTargetPostId, editingPos.id, {
        title: form.title,
        description: form.description,
        requirements,
        deadline: form.deadline,
        isOpen: form.isOpen,
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === posTargetPostId
            ? { ...p, positions: p.positions.map((pos) => (pos.id === updated.id ? updated : pos)) }
            : p
        )
      );
    } else {
      const created = await api.addPosition(posTargetPostId, {
        clubId,
        title: form.title,
        description: form.description,
        requirements,
        deadline: form.deadline,
        isOpen: form.isOpen,
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === posTargetPostId ? { ...p, positions: [...p.positions, created] } : p
        )
      );
    }
    setPosSaving(false);
    setPosDialogOpen(false);
  };

  const handleDeletePos = async (postId: string, posId: string) => {
    await api.deletePosition(postId, posId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, positions: p.positions.filter((pos) => pos.id !== posId) } : p
      )
    );
  };

  return (
    <AnimatedPage>
      <PageContainer>
        <Link to="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to Admin
        </Link>

        <SectionHeader
          title="Recruitment Posts"
          subtitle="Manage your club's open positions and recruitment drives"
          action={
            <Button variant="cozyGradient" icon={<Plus size={16} />} onClick={openNewPost}>
              New Post
            </Button>
          }
          className="mb-6"
        />

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : posts.length === 0 ? (
          <EmptyStateCard
            emoji="📢"
            title="No recruitment posts"
            description="Create a recruitment post to start receiving applications."
          />
        ) : (
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  layout
                >
                  <Card>
                    <CardContent>
                      {/* Post header */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-warmGray-800">{post.title}</h3>
                            <Badge variant={post.isActive ? 'success' : 'default'}>
                              {post.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-warmGray-500">{post.description}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-warmGray-400">
                            <span className="flex items-center gap-1"><Calendar size={12} />Closes {post.closesAt}</span>
                            <span className="flex items-center gap-1"><Users size={12} />{post.positions.length} position{post.positions.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" icon={<Pencil size={14} />} onClick={() => openEditPost(post)}>
                            Edit
                          </Button>
                          <Button variant="ghost" className="text-cozy-500 hover:text-cozy-600 hover:bg-cozy-50" onClick={() => handleDeletePost(post.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Positions list */}
                      <div className="mt-5 border-t border-warmGray-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-warmGray-700">Positions</h4>
                          <Button variant="outline" icon={<Plus size={14} />} className="text-xs px-3 py-1.5" onClick={() => openAddPos(post.id)}>
                            Add Position
                          </Button>
                        </div>

                        {post.positions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-warmGray-200 bg-warmGray-50/50 px-6 py-8 text-center">
                            <span className="mb-2 text-2xl">📋</span>
                            <p className="text-sm font-medium text-warmGray-600">No positions yet</p>
                            <p className="text-xs text-warmGray-400 mt-0.5">Add a position so students can apply</p>
                          </div>
                        ) : (
                          <AnimatePresence initial={false}>
                            <div className="space-y-2">
                              {post.positions.map((pos) => (
                                <motion.div
                                  key={pos.id}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  layout
                                >
                                  <div className="flex items-center gap-3 rounded-xl border border-warmGray-100 bg-warmGray-50/50 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-warmGray-800">{pos.title}</span>
                                        <Badge variant={pos.isOpen ? 'success' : 'default'}>
                                          {pos.isOpen ? 'Open' : 'Closed'}
                                        </Badge>
                                        <Badge>{pos.applicantCount} applicant{pos.applicantCount !== 1 ? 's' : ''}</Badge>
                                      </div>
                                      <p className="text-xs text-warmGray-400 mt-0.5 truncate">{pos.description}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Link
                                        to={`/admin/recruitment/positions/${pos.id}/form`}
                                        className="rounded-lg p-1.5 text-warmGray-400 hover:text-calm-500 hover:bg-white transition-colors"
                                        title="Edit application form"
                                      >
                                        <FileText size={14} />
                                      </Link>
                                      <button
                                        onClick={() => openEditPos(post.id, pos)}
                                        className="rounded-lg p-1.5 text-warmGray-400 hover:text-brand-500 hover:bg-white transition-colors cursor-pointer"
                                        title="Edit position"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDeletePos(post.id, pos.id)}
                                        className="rounded-lg p-1.5 text-warmGray-400 hover:text-cozy-500 hover:bg-white transition-colors cursor-pointer"
                                        title="Delete position"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </AnimatePresence>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Dialogs */}
        <PostDialog
          open={postDialogOpen}
          onClose={() => setPostDialogOpen(false)}
          onSave={handleSavePost}
          saving={postSaving}
          initial={editingPost ? {
            title: editingPost.title,
            description: editingPost.description,
            closesAt: editingPost.closesAt,
            isActive: editingPost.isActive,
          } : undefined}
        />

        <PositionDialog
          open={posDialogOpen}
          onClose={() => setPosDialogOpen(false)}
          onSave={handleSavePos}
          saving={posSaving}
          initial={editingPos ? {
            title: editingPos.title,
            description: editingPos.description,
            requirements: editingPos.requirements.join(', '),
            deadline: editingPos.deadline,
            isOpen: editingPos.isOpen,
          } : undefined}
        />
      </PageContainer>
    </AnimatedPage>
  );
}
