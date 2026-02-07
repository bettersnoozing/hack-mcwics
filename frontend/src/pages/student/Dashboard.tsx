import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Clock, Calendar } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TabsSegmented } from '../../components/ui/TabsSegmented';
import { AnimatedTabContent } from '../../components/motion/AnimatedTabContent';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { InterviewSlotPicker } from '../../components/InterviewSlotPicker';
import { useApi } from '../../contexts/ApiContext';
import { useDevSession } from '../../contexts/DevSessionContext';
import type { Application, ApplicationStatus, Club, ForumChannel } from '../../contracts';

const statusConfig: Record<ApplicationStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  draft: { label: 'Draft', variant: 'default' },
  submitted: { label: 'Submitted', variant: 'info' },
  under_review: { label: 'Under Review', variant: 'warning' },
  interview_invited: { label: 'Interview Invited', variant: 'info' },
  interview_scheduled: { label: 'Interview Scheduled', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const dashTabs = [
  { key: 'applications', label: 'My Applications' },
  { key: 'recommended', label: 'Recommended' },
  { key: 'forums', label: 'Forums' },
];

export function Dashboard() {
  const api = useApi();
  const { session } = useDevSession();
  const [tab, setTab] = useState('applications');
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [forums, setForums] = useState<ForumChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotPickerApp, setSlotPickerApp] = useState<Application | null>(null);

  const userId = session?.id ?? '';

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      api.listMyApplications(userId),
      api.listClubsRecruiting(),
      api.listForumChannels(userId),
    ]).then(([apps, c, f]) => {
      setMyApps(apps);
      setClubs(c);
      setForums(f);
      setLoading(false);
    });
  }, [api, userId]);

  if (!session || session.role !== 'student') {
    return (
      <PageContainer>
        <EmptyStateCard emoji="🔒" title="Student access only" description="Switch to a student identity using the Demo Mode picker." />
      </PageContainer>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <SectionHeader
          title={`Welcome back, ${session.name.split(' ')[0]}`}
          subtitle="Track applications and discover new opportunities"
          className="mb-6"
        />

        <TabsSegmented tabs={dashTabs} active={tab} onChange={setTab} className="mb-6" />

        <AnimatedTabContent activeKey={tab}>
          {tab === 'applications' && (
            loading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : myApps.length === 0 ? (
              <EmptyStateCard emoji="📝" title="No applications yet" description="Browse clubs and apply to positions that interest you." />
            ) : (
              <div className="space-y-4">
                {myApps.map((app) => {
                  const st = statusConfig[app.status];
                  const showPickSlot = app.status === 'interview_invited';
                  return (
                    <Card key={app.id} hover className={showPickSlot ? 'border-brand-200 bg-brand-50/30' : ''}>
                      <CardContent>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-warmGray-800">{app.positionTitle}</h3>
                              <Badge variant={st.variant}>{st.label}</Badge>
                            </div>
                            <p className="text-sm text-warmGray-500">{app.clubName}</p>
                            <div className="mt-1 flex items-center gap-1 text-xs text-warmGray-400">
                              <Clock size={12} />
                              Submitted {app.submittedAt.split('T')[0]}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {showPickSlot && (
                              <Button
                                variant="cozyGradient"
                                icon={<Calendar size={14} />}
                                onClick={() => setSlotPickerApp(app)}
                              >
                                Pick Interview Time
                              </Button>
                            )}
                            <Link
                              to={`/app/apply/${app.clubId}/${app.positionId}`}
                              className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
                            >
                              View →
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

          {tab === 'recommended' && (
            loading ? (
              <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : clubs.length === 0 ? (
              <EmptyStateCard emoji="🌟" title="No recommendations yet" description="We'll suggest clubs based on your interests soon." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {clubs.map((club) => (
                  <Link key={club.id} to={`/clubs/${club.slug}`}>
                    <Card hover className="h-full">
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-calm-100 text-lg">
                            {club.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-warmGray-800">{club.name}</h3>
                            <p className="text-xs text-warmGray-400">{club.memberCount} members</p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-warmGray-500 line-clamp-2">{club.description}</p>
                        <div className="mt-2 flex gap-1.5">
                          {club.tags.slice(0, 2).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )
          )}

          {tab === 'forums' && (
            loading ? (
              <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : forums.length === 0 ? (
              <EmptyStateCard emoji="💬" title="No forum groups yet" description="Forums will appear when you apply to positions with group discussions." />
            ) : (
              <div className="space-y-4">
                {forums.map((channel) => (
                  <Link key={channel.id} to={`/app/forum/${channel.applicationGroupId}`}>
                    <Card hover>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <MessageCircle size={20} className="text-brand-400" />
                          <div>
                            <h3 className="font-semibold text-warmGray-800">
                              {channel.clubName} — {channel.positionTitle}
                            </h3>
                            <p className="text-xs text-warmGray-400">{channel.members.length} members</p>
                          </div>
                        </div>
                        {channel.posts.length > 0 && (
                          <p className="mt-2 text-sm text-warmGray-500 line-clamp-1">
                            <span className="font-medium">{channel.posts[channel.posts.length - 1]!.senderName}:</span>{' '}
                            {channel.posts[channel.posts.length - 1]!.body}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )
          )}
        </AnimatedTabContent>

        {/* Interview Slot Picker Modal */}
        {slotPickerApp && (
          <InterviewSlotPicker
            open={!!slotPickerApp}
            onClose={() => setSlotPickerApp(null)}
            application={slotPickerApp}
            onSlotBooked={() => {
              // Update the application status locally
              setMyApps((prev) =>
                prev.map((a) =>
                  a.id === slotPickerApp.id ? { ...a, status: 'interview_scheduled' } : a
                )
              );
              setSlotPickerApp(null);
            }}
          />
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
