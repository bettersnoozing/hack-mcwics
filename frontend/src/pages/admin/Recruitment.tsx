import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Pencil, Trash2, FileText } from 'lucide-react';
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
import { useAuth } from '../../contexts/AuthContext';
import { openRoleApi, type OpenRoleData } from '../../services/openRoleApi';

interface RoleFormState {
  jobTitle: string;
  description: string;
  deadline: string;
}

const emptyForm: RoleFormState = { jobTitle: '', description: '', deadline: '' };

function RoleDialog({ open, onClose, onSave, initial, saving }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: RoleFormState) => void;
  initial?: RoleFormState;
  saving: boolean;
}) {
  const [form, setForm] = useState<RoleFormState>(initial ?? emptyForm);

  useEffect(() => {
    if (open) setForm(initial ?? emptyForm);
  }, [open, initial]);

  const set = (key: keyof RoleFormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Edit Open Role' : 'New Open Role'}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <Input
          label="Job Title"
          placeholder="e.g. Frontend Developer"
          value={form.jobTitle}
          onChange={(e) => set('jobTitle', e.target.value)}
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
          label="Application Deadline"
          type="date"
          value={form.deadline}
          onChange={(e) => set('deadline', e.target.value)}
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="cozyGradient" disabled={saving || !form.jobTitle.trim()}>
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOpen(deadline: string): boolean {
  return new Date(deadline) > new Date();
}

export function Recruitment() {
  const { user, loading: authLoading } = useAuth();
  const clubId = user?.adminClub ?? '';
  const [roles, setRoles] = useState<OpenRoleData[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OpenRoleData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    openRoleApi.list(clubId)
      .then(setRoles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clubId]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: OpenRoleData) => { setEditing(r); setDialogOpen(true); };

  const handleSave = async (form: RoleFormState) => {
    if (!clubId) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await openRoleApi.update(editing._id, {
          jobTitle: form.jobTitle,
          description: form.description,
          deadline: form.deadline,
        });
        setRoles((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      } else {
        const created = await openRoleApi.create(clubId, {
          jobTitle: form.jobTitle,
          description: form.description,
          deadline: form.deadline,
        });
        setRoles((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
    } catch {
      // error handling could be added
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await openRoleApi.delete(id);
    setRoles((prev) => prev.filter((r) => r._id !== id));
  };

  if (authLoading || loading) {
    return (
      <PageContainer>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </PageContainer>
    );
  }

  if (!clubId) {
    return (
      <PageContainer>
        <EmptyStateCard emoji="🔒" title="No club assigned" description="Complete exec onboarding to manage recruitment." />
      </PageContainer>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <Link to="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to Admin
        </Link>

        <SectionHeader
          title="Open Roles"
          subtitle="Manage your club's open positions"
          action={
            <Button variant="cozyGradient" icon={<Plus size={16} />} onClick={openNew}>
              New Role
            </Button>
          }
          className="mb-6"
        />

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : roles.length === 0 ? (
          <EmptyStateCard
            emoji="📋"
            title="No open roles"
            description="Create your first open role to start receiving applications."
          />
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {roles.map((role) => (
                <motion.div
                  key={role._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16, height: 0 }}
                  transition={{ duration: 0.25 }}
                  layout
                >
                  <Card>
                    <CardContent>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-warmGray-800">{role.jobTitle}</h3>
                            <Badge variant={isOpen(role.deadline) ? 'success' : 'default'}>
                              {isOpen(role.deadline) ? 'Open' : 'Closed'}
                            </Badge>
                            {role.applicationQuestions.length > 0 && (
                              <Badge variant="info">{role.applicationQuestions.length} question{role.applicationQuestions.length !== 1 ? 's' : ''}</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-warmGray-500">{role.description}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-warmGray-400">
                            <span className="flex items-center gap-1"><Calendar size={12} />Deadline: {formatDate(role.deadline)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Link
                            to={`/admin/recruitment/roles/${role._id}/form`}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border border-warmGray-200 bg-white text-warmGray-700 hover:bg-warmGray-50 transition-colors"
                            title="Edit application questions"
                          >
                            <FileText size={14} />
                            Questions
                          </Link>
                          <Button variant="outline" icon={<Pencil size={14} />} onClick={() => openEdit(role)}>
                            Edit
                          </Button>
                          <Button variant="ghost" className="text-cozy-500 hover:text-cozy-600 hover:bg-cozy-50" onClick={() => handleDelete(role._id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <RoleDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          saving={saving}
          initial={editing ? {
            jobTitle: editing.jobTitle,
            description: editing.description,
            deadline: editing.deadline.split('T')[0] ?? '',
          } : undefined}
        />
      </PageContainer>
    </AnimatedPage>
  );
}
