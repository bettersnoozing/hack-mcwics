import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Badge } from '../../components/ui/Badge';
import { TabsSegmented } from '../../components/ui/TabsSegmented';
import { AnimatedTabContent } from '../../components/motion/AnimatedTabContent';
import { SoftTable } from '../../components/ui/SoftTable';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useApi } from '../../contexts/ApiContext';
import { useDevSession } from '../../contexts/DevSessionContext';
import type { Application, ApplicationStatus } from '../../contracts';

const statusVariant: Record<ApplicationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default', submitted: 'info', under_review: 'warning', interview: 'info', accepted: 'success', rejected: 'danger',
};
const statusLabel: Record<ApplicationStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', interview: 'Interview', accepted: 'Accepted', rejected: 'Rejected',
};

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'interview', label: 'Interview' },
  { key: 'accepted', label: 'Accepted' },
];

export function Applications() {
  const api = useApi();
  const { session } = useDevSession();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [allApps, setAllApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const clubId = session?.role === 'admin' ? session.clubId : '';

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    api.listApplicationsForClub(clubId).then((a) => { setAllApps(a); setLoading(false); });
  }, [api, clubId]);

  const filtered = filter === 'all' ? allApps : allApps.filter((a) => a.status === filter);

  const columns = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (row: Application) => (
        <div>
          <p className="font-medium text-warmGray-800">{row.applicantName}</p>
          <p className="text-xs text-warmGray-400">{row.applicantEmail}</p>
        </div>
      ),
    },
    { key: 'position', header: 'Position', render: (row: Application) => <span className="text-warmGray-700">{row.positionTitle}</span> },
    { key: 'status', header: 'Status', render: (row: Application) => <Badge variant={statusVariant[row.status]}>{statusLabel[row.status]}</Badge> },
    { key: 'date', header: 'Submitted', render: (row: Application) => <span className="text-warmGray-500">{row.submittedAt}</span> },
  ];

  return (
    <AnimatedPage>
      <PageContainer>
        <Link to="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to Admin
        </Link>

        <SectionHeader title="Applications" subtitle={loading ? 'Loading...' : `${filtered.length} application${filtered.length !== 1 ? 's' : ''}`} className="mb-6" />

        <TabsSegmented tabs={filterTabs} active={filter} onChange={setFilter} className="mb-6" />

        <AnimatedTabContent activeKey={filter}>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyStateCard emoji="📋" title="No applications" description="No applications match the current filter." />
          ) : (
            <SoftTable
              columns={columns}
              data={filtered}
              keyExtractor={(row) => row.id}
              stickyHeader
              onRowClick={(row) => navigate(`/admin/applications/${row.id}`)}
            />
          )}
        </AnimatedTabContent>
      </PageContainer>
    </AnimatedPage>
  );
}
