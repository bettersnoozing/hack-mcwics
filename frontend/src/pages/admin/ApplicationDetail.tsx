import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useToast } from '../../contexts/ToastContext';
import { applicationApi, type ApplicationData, type AppStatus } from '../../services/applicationApi';

const ALL_STATUSES: AppStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
const statusVariant: Record<AppStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  SUBMITTED: 'info', UNDER_REVIEW: 'warning', ACCEPTED: 'success', REJECTED: 'danger', WITHDRAWN: 'default',
};
const statusLabel: Record<AppStatus, string> = {
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review', ACCEPTED: 'Accepted', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
};

function StatusDropdown({ current, onChange }: { current: AppStatus; onChange: (s: AppStatus) => void }) {
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
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer ${s === current ? 'bg-warmGray-50 font-medium' : 'hover:bg-warmGray-50'}`}>
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

export function ApplicationDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { showToast } = useToast();
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) return;
    applicationApi.getDetail(applicationId)
      .then(setApp)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [applicationId]);

  const handleStatusChange = async (status: AppStatus) => {
    if (!app) return;
    try {
      const updated = await applicationApi.updateStatus(app._id, status);
      setApp(updated);
      showToast(`Status updated to ${statusLabel[status]}`);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <PageContainer className="max-w-4xl">
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
      </PageContainer>
    );
  }

  if (!app) {
    return <PageContainer><EmptyStateCard emoji="😕" title="Application not found" description="This application doesn't exist." /></PageContainer>;
  }

  // Parse answers: the model stores answers as Record<string, string> keyed by question text
  const answerEntries = Object.entries(app.answers as Record<string, string>);
  const questions = app.openRole.applicationQuestions ?? [];

  return (
    <AnimatedPage>
      <PageContainer className="max-w-4xl">
        <Link to="/admin/applications" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} /> Back to Applications
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-calm-100 text-lg font-bold text-brand-600">
                {app.applicant.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-warmGray-800">{app.applicant.name}</h1>
                <p className="text-sm text-warmGray-500">{app.applicant.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="default">{app.openRole.jobTitle}</Badge>
              <span className="text-xs text-warmGray-400">Submitted {app.createdAt.split('T')[0]}</span>
            </div>
          </div>
          <StatusDropdown current={app.status} onChange={handleStatusChange} />
        </div>

        {/* Answers */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-warmGray-700 uppercase tracking-wide">Application Answers</h2>

          {answerEntries.length > 0 ? (
            <div className="space-y-4">
              {answerEntries.map(([question, answer], i) => (
                <Card key={i}>
                  <CardContent>
                    <p className="text-xs font-medium text-warmGray-400 uppercase tracking-wide mb-1">Q{i + 1}</p>
                    <p className="text-sm font-medium text-warmGray-700">{question}</p>
                    <p className="mt-2 text-sm text-warmGray-600 whitespace-pre-wrap">{answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q, i) => (
                <Card key={i}>
                  <CardContent>
                    <p className="text-xs font-medium text-warmGray-400 uppercase tracking-wide mb-1">Q{i + 1}</p>
                    <p className="text-sm font-medium text-warmGray-700">{q}</p>
                    <p className="mt-2 text-sm text-warmGray-400 italic">No answer provided</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyStateCard emoji="📝" title="No answers" description="This application has no answers yet." />
          )}

          {/* Coming soon placeholders */}
          <div className="grid gap-4 sm:grid-cols-2 mt-8">
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-warmGray-400 text-sm">Reviews</p>
                <p className="text-xs text-warmGray-300 mt-1">Coming soon</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-warmGray-400 text-sm">Internal Notes</p>
                <p className="text-xs text-warmGray-300 mt-1">Coming soon</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AnimatedPage>
  );
}
