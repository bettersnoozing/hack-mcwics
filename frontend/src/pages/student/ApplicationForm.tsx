import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
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
import { useApi } from '../../contexts/ApiContext';
import { useSession } from '../../hooks/useSession';
import { useToast } from '../../contexts/ToastContext';
import type { Club, Position, FormSchema, ForumChannel } from '../../contracts';

export function ApplicationForm() {
  const { clubSlug, positionId } = useParams<{ clubSlug: string; positionId: string }>();
  const api = useApi();
  const session = useSession();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [club, setClub] = useState<Club | undefined>();
  const [position, setPosition] = useState<Position | undefined>();
  const [schema, setSchema] = useState<FormSchema | undefined>();
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [forumChannel, setForumChannel] = useState<ForumChannel | undefined>();

  useEffect(() => {
    if (!clubSlug || !positionId) return;
    Promise.all([
      api.getClub(clubSlug),
      api.getClubPositions(clubSlug),
      api.getFormSchema(positionId),
    ]).then(([c, positions, fs]) => {
      setClub(c);
      setPosition(positions.find((p) => p.id === positionId));
      setSchema(fs);
      setLoading(false);
    });
  }, [api, clubSlug, positionId]);

  if (loading) {
    return (
      <PageContainer>
        <SkeletonCard />
        <SkeletonCard className="mt-4" />
      </PageContainer>
    );
  }

  if (!club || !position) {
    return (
      <PageContainer>
        <EmptyStateCard
          emoji="😕"
          title="Position not found"
          description="The position you're looking for doesn't exist."
        />
      </PageContainer>
    );
  }

  if (session.role !== 'student') {
    return (
      <PageContainer>
        <EmptyStateCard
          emoji="🔒"
          title="Student access only"
          description="Please log in as a student to apply."
        />
      </PageContainer>
    );
  }

  const questions = schema?.questions ?? [];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      if (q.required && !(answers[q.id] ?? '').trim()) {
        newErrors[q.id] = 'This field is required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const answerEntries = questions.map((q) => ({
      questionId: q.id,
      question: q.label,
      answer: answers[q.id] ?? '',
    }));

    await api.submitApplication({
      userId: session.id,
      clubId: club.id,
      positionId: position.id,
      answers: answerEntries,
      applicantName: session.name,
      applicantEmail: session.email,
      clubName: club.name,
      positionTitle: position.title,
    });

    // Auto-join applicant forum
    const channel = await api.ensureForumChannel({
      positionId: position.id,
      clubName: club.name,
      positionTitle: position.title,
      member: { id: session.id, name: session.name },
    });
    setForumChannel(channel);

    setSubmitting(false);
    setSubmitted(true);
    showToast('Application submitted successfully!');
  };

  // ── Success state ─────────────────────────────────
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
                Your application for <strong>{position.title}</strong> at{' '}
                <strong>{club.name}</strong> has been submitted. You can track it in your dashboard.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="cozyGradient" onClick={() => navigate('/app')} className="w-full">
                  Go to Dashboard
                </Button>
                {forumChannel && (
                  <Link to={`/app/forum/${forumChannel.applicationGroupId}`}>
                    <Button variant="outline" icon={<MessageCircle size={16} />} className="w-full">
                      Join Applicant Lounge
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </AnimatedPage>
    );
  }

  // ── Form rendering ────────────────────────────────
  return (
    <AnimatedPage>
      <PageContainer>
        <Link
          to={`/clubs/${club.slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to {club.name}
        </Link>

        <SectionHeader
          title={`Apply: ${position.title}`}
          subtitle={club.name}
          className="mb-6"
        />

        <div className="mb-6 flex flex-wrap gap-1.5">
          {position.requirements.map((req) => (
            <Badge key={req} variant="info">{req}</Badge>
          ))}
          <Badge variant="warning">Deadline: {position.deadline}</Badge>
        </div>

        {questions.length === 0 ? (
          <EmptyStateCard
            emoji="📋"
            title="No application form yet"
            description="The club hasn't set up an application form for this position yet. Check back later."
          />
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Auto-filled identity card */}
            <Card>
              <CardContent>
                <p className="text-xs font-medium text-warmGray-400 uppercase tracking-wide mb-3">
                  Your Information
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full Name" value={session.name} readOnly />
                  <Input label="McGill Email" value={session.email} readOnly />
                </div>
              </CardContent>
            </Card>

            {/* Dynamic questions */}
            {questions.map((q) => (
              <Card key={q.id}>
                <CardContent>
                  {q.type === 'long_text' && (
                    <Textarea
                      label={`${q.label}${q.required ? ' *' : ''}`}
                      placeholder={q.placeholder}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => {
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }));
                        if (errors[q.id]) setErrors((prev) => { const c = { ...prev }; delete c[q.id]; return c; });
                      }}
                      error={errors[q.id]}
                    />
                  )}
                  {q.type === 'short_text' && (
                    <Input
                      label={`${q.label}${q.required ? ' *' : ''}`}
                      placeholder={q.placeholder}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => {
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }));
                        if (errors[q.id]) setErrors((prev) => { const c = { ...prev }; delete c[q.id]; return c; });
                      }}
                      error={errors[q.id]}
                    />
                  )}
                  {q.type === 'url' && (
                    <Input
                      label={`${q.label}${q.required ? ' *' : ''}`}
                      type="url"
                      placeholder={q.placeholder ?? 'https://...'}
                      value={answers[q.id] ?? ''}
                      onChange={(e) => {
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }));
                        if (errors[q.id]) setErrors((prev) => { const c = { ...prev }; delete c[q.id]; return c; });
                      }}
                      error={errors[q.id]}
                    />
                  )}
                  {q.type === 'select' && (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-warmGray-700">
                        {q.label}{q.required ? ' *' : ''}
                      </label>
                      <div className="space-y-2">
                        {(q.options ?? []).map((opt) => (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                              answers[q.id] === opt
                                ? 'border-brand-300 bg-brand-50/50 text-brand-700'
                                : 'border-warmGray-200 bg-white text-warmGray-700 hover:border-warmGray-300'
                            }`}
                          >
                            <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                              answers[q.id] === opt ? 'border-brand-400' : 'border-warmGray-300'
                            }`}>
                              {answers[q.id] === opt && (
                                <div className="h-2 w-2 rounded-full bg-brand-400" />
                              )}
                            </div>
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => {
                                setAnswers((a) => ({ ...a, [q.id]: opt }));
                                if (errors[q.id]) setErrors((prev) => { const c = { ...prev }; delete c[q.id]; return c; });
                              }}
                              className="sr-only"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                      {errors[q.id] && <p className="text-xs text-cozy-500">{errors[q.id]}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-3 pt-2">
              <Button
                variant="cozyGradient"
                icon={<Send size={16} />}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
