import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { openRoleApi, type OpenRoleData } from '../../services/openRoleApi';
import { applicationApi } from '../../services/applicationApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ApplicationForm() {
  const { clubId, openRoleId } = useParams<{ clubId: string; openRoleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [role, setRole] = useState<OpenRoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!openRoleId) return;
    Promise.all([
      openRoleApi.getById(openRoleId),
      user ? applicationApi.listMyAppliedRoleIds().catch(() => [] as string[]) : Promise.resolve([] as string[]),
    ])
      .then(([r, appliedIds]) => {
        setRole(r);
        if (appliedIds.includes(openRoleId)) setAlreadyApplied(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [openRoleId, user]);

  if (loading) {
    return (
      <PageContainer>
        <SkeletonCard />
        <SkeletonCard className="mt-4" />
      </PageContainer>
    );
  }

  if (!role) {
    return (
      <PageContainer>
        <EmptyStateCard emoji="😕" title="Position not found" description="The position you're looking for doesn't exist." />
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <EmptyStateCard emoji="🔒" title="Sign in required" description="Please sign in to apply." />
      </PageContainer>
    );
  }

  if (alreadyApplied) {
    return (
      <AnimatedPage>
        <PageContainer className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-calm-100 text-3xl">
                &#x2705;
              </div>
              <h2 className="text-xl font-bold text-warmGray-800">Already Applied</h2>
              <p className="mt-2 text-sm text-warmGray-500">
                You have already submitted an application for <strong>{role.jobTitle}</strong>. You can view it from your dashboard.
              </p>
              <div className="mt-6">
                <Button variant="cozyGradient" onClick={() => navigate('/app')} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AnimatedPage>
    );
  }

  const questions = role.applicationQuestions ?? [];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      if (!(answers[q] ?? '').trim()) {
        newErrors[q] = 'This field is required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await applicationApi.submit({
        openRoleId: role._id,
        answers,
      });
      setSubmitted(true);
      showToast('Application submitted successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AnimatedPage>
        <PageContainer className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-calm-100 to-calm-200 text-3xl">
                🎉
              </div>
              <h2 className="text-xl font-bold text-warmGray-800">Application Submitted!</h2>
              <p className="mt-2 text-sm text-warmGray-500">
                Your application for <strong>{role.jobTitle}</strong> has been submitted. You can track it in your dashboard.
              </p>
              <div className="mt-6">
                <Button variant="cozyGradient" onClick={() => navigate('/app')} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <Link
          to={clubId ? `/clubs/${clubId}` : '/'}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to club
        </Link>

        <SectionHeader
          title={`Apply: ${role.jobTitle}`}
          className="mb-6"
        />

        <div className="mb-6 flex flex-wrap gap-1.5">
          <Badge variant="warning">Deadline: {formatDate(role.deadline)}</Badge>
          {questions.length > 0 && (
            <Badge variant="info">{questions.length} question{questions.length !== 1 ? 's' : ''}</Badge>
          )}
        </div>

        {questions.length === 0 ? (
          <EmptyStateCard
            emoji="📋"
            title="No application form yet"
            description="The club hasn't set up application questions for this role yet. Check back later."
          />
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Card>
              <CardContent>
                <p className="text-xs font-medium text-warmGray-400 uppercase tracking-wide mb-3">Your Information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full Name" value={user.name} readOnly />
                  <Input label="Email" value={user.email} readOnly />
                </div>
              </CardContent>
            </Card>

            {questions.map((q, i) => (
              <Card key={i}>
                <CardContent>
                  <Textarea
                    label={`${q} *`}
                    placeholder="Your answer..."
                    value={answers[q] ?? ''}
                    onChange={(e) => {
                      setAnswers((a) => ({ ...a, [q]: e.target.value }));
                      if (errors[q]) setErrors((prev) => { const c = { ...prev }; delete c[q]; return c; });
                    }}
                    error={errors[q]}
                  />
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-3 pt-2">
              <Button variant="cozyGradient" icon={<Send size={16} />} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
