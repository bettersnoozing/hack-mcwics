import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, ClipboardList, TrendingUp } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useApi } from '../../contexts/ApiContext';
import { useSession } from '../../hooks/useSession';
import type { Application, RecruitmentPost } from '../../contracts';

export function AdminHome() {
  const api = useApi();
  const session = useSession();
  const [posts, setPosts] = useState<RecruitmentPost[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const clubId = session.role === 'admin' ? (session.clubId ?? '') : '';

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    Promise.all([
      api.listRecruitmentPosts(clubId),
      api.listApplicationsForClub(clubId),
    ]).then(([r, a]) => { setPosts(r); setApps(a); setLoading(false); });
  }, [api, clubId]);

  if (session.role !== 'admin') {
    return (
      <PageContainer>
        <EmptyStateCard emoji="🔒" title="Admin access only" description="Please log in as a club administrator to access this page." />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      </PageContainer>
    );
  }

  const metrics = [
    { label: 'Active Posts', value: posts.filter((r) => r.isActive).length, icon: <FileText size={20} />, color: 'from-brand-100 to-brand-200 text-brand-600' },
    { label: 'Total Applications', value: apps.length, icon: <ClipboardList size={20} />, color: 'from-cozy-100 to-cozy-200 text-cozy-600' },
    { label: 'Under Review', value: apps.filter((a) => a.status === 'under_review').length, icon: <TrendingUp size={20} />, color: 'from-calm-100 to-calm-200 text-calm-600' },
    { label: 'Accepted', value: apps.filter((a) => a.status === 'accepted').length, icon: <Users size={20} />, color: 'from-green-100 to-green-200 text-green-600' },
  ];

  return (
    <AnimatedPage>
      <PageContainer>
        <SectionHeader
          title={`${session.clubName ?? 'Club'} Admin`}
          subtitle="Manage your club's recruitment and applications"
          action={
            <Link to="/admin/recruitment">
              <Button variant="cozyGradient" icon={<FileText size={16} />}>Manage Posts</Button>
            </Link>
          }
          className="mb-8"
        />

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.color}`}>{m.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-warmGray-800">{m.value}</p>
                    <p className="text-xs text-warmGray-500">{m.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <SectionHeader title="Quick Actions" className="mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/admin/recruitment">
            <Card hover>
              <CardContent>
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-brand-400" />
                  <div>
                    <h3 className="font-semibold text-warmGray-800">Recruitment Posts</h3>
                    <p className="text-sm text-warmGray-500">Create and manage open positions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/applications">
            <Card hover>
              <CardContent>
                <div className="flex items-center gap-3">
                  <ClipboardList size={20} className="text-cozy-400" />
                  <div>
                    <h3 className="font-semibold text-warmGray-800">Applications</h3>
                    <p className="text-sm text-warmGray-500">Review and manage incoming applications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </PageContainer>
    </AnimatedPage>
  );
}
