import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { applicationApi, type ApplicationData, type AppStatus } from '../../services/applicationApi';

const statusConfig: Record<AppStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'warning' },
  ACCEPTED: { label: 'Accepted', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'default' },
};

export function ApplicationView() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    applicationApi.getDetail(applicationId)
      .then(setApp)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  if (loading) {
    return (
      <PageContainer>
        <SkeletonCard />
        <SkeletonCard className="mt-4" />
      </PageContainer>
    );
  }

  if (error || !app) {
    return (
      <PageContainer>
        <EmptyStateCard emoji="😕" title="Application not found" description={error ?? "The application you're looking for doesn't exist."} />
      </PageContainer>
    );
  }

  const st = statusConfig[app.status] ?? { label: app.status, variant: 'default' as const };
  const clubName = typeof app.openRole?.club === 'object' ? app.openRole.club.name : '';
  const questions = app.openRole?.applicationQuestions ?? [];

  return (
    <AnimatedPage>
      <PageContainer>
        <Link
          to="/app"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <SectionHeader
          title={app.openRole?.jobTitle ?? 'Application'}
          subtitle={clubName}
          className="mb-4"
        />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge variant={st.variant}>{st.label}</Badge>
          <span className="flex items-center gap-1 text-xs text-warmGray-400">
            <Clock size={12} />
            Submitted {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Applicant info */}
        <Card className="mb-4">
          <CardContent>
            <p className="text-xs font-medium text-warmGray-400 uppercase tracking-wide mb-3">Your Information</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-warmGray-400">Name</p>
                <p className="text-sm font-medium text-warmGray-700">{app.applicant?.name}</p>
              </div>
              <div>
                <p className="text-xs text-warmGray-400">Email</p>
                <p className="text-sm font-medium text-warmGray-700">{app.applicant?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers */}
        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={i}>
                <CardContent>
                  <p className="text-sm font-medium text-warmGray-700 mb-2">{q}</p>
                  <p className="text-sm text-warmGray-600 whitespace-pre-wrap bg-warmGray-50 rounded-lg p-3">
                    {app.answers[q] || <span className="italic text-warmGray-400">No answer provided</span>}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Fallback: render answers by key if questions aren't available
          Object.keys(app.answers).length > 0 && (
            <div className="space-y-4">
              {Object.entries(app.answers).map(([question, answer]) => (
                <Card key={question}>
                  <CardContent>
                    <p className="text-sm font-medium text-warmGray-700 mb-2">{question}</p>
                    <p className="text-sm text-warmGray-600 whitespace-pre-wrap bg-warmGray-50 rounded-lg p-3">
                      {answer || <span className="italic text-warmGray-400">No answer provided</span>}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
