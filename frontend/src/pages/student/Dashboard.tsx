import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Briefcase } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TabsSegmented } from '../../components/ui/TabsSegmented';
import { AnimatedTabContent } from '../../components/motion/AnimatedTabContent';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useAuth } from '../../contexts/AuthContext';
import { applicationApi, type MyApplicationData, type AppStatus } from '../../services/applicationApi';
import { discoverApi, type DiscoverClub } from '../../services/discoverApi';

const statusConfig: Record<AppStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  SUBMITTED: { label: 'Submitted', variant: 'info' },
  UNDER_REVIEW: { label: 'Under Review', variant: 'warning' },
  ACCEPTED: { label: 'Accepted', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'default' },
};

const dashTabs = [
  { key: 'applications', label: 'My Applications' },
  { key: 'recommended', label: 'Recommended' },
  { key: 'forums', label: 'Forums' },
];

export function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('applications');
  const [myApps, setMyApps] = useState<MyApplicationData[]>([]);
  const [clubs, setClubs] = useState<DiscoverClub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      applicationApi.listMine().catch(() => [] as MyApplicationData[]),
      discoverApi.listClubs().catch(() => [] as DiscoverClub[]),
    ]).then(([apps, c]) => {
      setMyApps(apps);
      setClubs(c);
      setLoading(false);
    });
  }, [user]);

  if (!user) {
    return (
      <PageContainer>
        <EmptyStateCard emoji="🔒" title="Sign in required" description="Please sign in to access your dashboard." />
      </PageContainer>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <SectionHeader
          title={`Welcome back, ${user.name.split(' ')[0]}`}
          subtitle="Track applications and discover new opportunities"
          className="mb-6"
        />

        <TabsSegmented tabs={dashTabs} active={tab} onChange={setTab} className="mb-6" />

        <AnimatedTabContent activeKey={tab}>
          {/* ── My Applications ── */}
          {tab === 'applications' && (
            loading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : myApps.length === 0 ? (
              <EmptyStateCard emoji="📝" title="No applications yet" description="Browse clubs and apply to positions that interest you." />
            ) : (
              <div className="space-y-4">
                {myApps.map((app) => {
                  const st = statusConfig[app.status] ?? { label: app.status, variant: 'default' as const };
                  const clubName = typeof app.openRole?.club === 'object' ? app.openRole.club.name : '';
                  return (
                    <Card key={app._id} hover>
                      <CardContent>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-warmGray-800">{app.openRole?.jobTitle ?? 'Unknown Role'}</h3>
                              <Badge variant={st.variant}>{st.label}</Badge>
                            </div>
                            {clubName && <p className="text-sm text-warmGray-500">{clubName}</p>}
                            <div className="mt-1 flex items-center gap-1 text-xs text-warmGray-400">
                              <Clock size={12} />
                              Submitted {new Date(app.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/app/applications/${app._id}`}
                              className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* ── Recommended Clubs ── */}
          {tab === 'recommended' && (
            loading ? (
              <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : clubs.length === 0 ? (
              <EmptyStateCard emoji="🌟" title="No clubs yet" description="Clubs will appear here once they are created." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {clubs.map((club) => (
                  <Link key={club._id} to={`/clubs/${club._id}`}>
                    <Card hover className="h-full">
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-calm-100 text-lg font-bold text-brand-600">
                            {club.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-warmGray-800">{club.name}</h3>
                            {club.isRecruiting && (
                              <p className="text-xs text-calm-500">Recruiting now</p>
                            )}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-warmGray-500 line-clamp-2">{club.description}</p>
                        {club.openRoleCount > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-warmGray-400">
                            <Briefcase size={14} />
                            {club.openRoleCount} open role{club.openRoleCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* ── Forums (unchanged) ── */}
          {tab === 'forums' && (
            <EmptyStateCard emoji="💬" title="No forum groups yet" description="Forums will appear when you apply to positions with group discussions." />
          )}
        </AnimatedTabContent>
      </PageContainer>
    </AnimatedPage>
  );
}
