import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, CheckCircle, ExternalLink, Globe, Mail } from 'lucide-react';
import { AnimatedPage } from '../components/motion/AnimatedPage';
import { PageContainer } from '../components/layout/PageContainer';
import { SectionHeader } from '../components/layout/SectionHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyStateCard } from '../components/ui/EmptyStateCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { discoverApi, type DiscoverClubDetail } from '../services/discoverApi';
import { applicationApi } from '../services/applicationApi';
import { getStoredToken } from '../services/authApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ClubPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [club, setClub] = useState<DiscoverClubDetail | null>(null);
  const [appliedRoleIds, setAppliedRoleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    const promises: [Promise<DiscoverClubDetail>, Promise<string[]>] = [
      discoverApi.getClubDetail(clubId),
      getStoredToken()
        ? applicationApi.listMyAppliedRoleIds().catch(() => [] as string[])
        : Promise.resolve([] as string[]),
    ];
    Promise.all(promises)
      .then(([c, roleIds]) => {
        setClub(c);
        setAppliedRoleIds(new Set(roleIds));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clubId]);

  if (loading) {
    return (
      <PageContainer>
        <SkeletonCard className="mb-4" />
        <SkeletonCard />
      </PageContainer>
    );
  }

  if (!club) {
    return (
      <PageContainer>
        <EmptyStateCard emoji="😕" title="Club not found" description="The club you're looking for doesn't exist." />
      </PageContainer>
    );
  }

  const roles = club.openRoles ?? [];

  return (
    <AnimatedPage>
      <PageContainer>
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to clubs
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-calm-100 text-2xl font-bold text-brand-600 shadow-sm">
            {club.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-warmGray-800">{club.name}</h1>
              {club.isRecruiting && <Badge variant="success">Recruiting</Badge>}
            </div>
            <p className="mt-2 text-warmGray-500">{club.description}</p>
            {(club.tags ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {club.tags!.map((tag) => (
                  <Badge key={tag} variant="info">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-warmGray-400">
              {club.email && (
                <a href={`mailto:${club.email}`} className="flex items-center gap-1 hover:text-warmGray-600 transition-colors">
                  <Mail size={14} />{club.email}
                </a>
              )}
              {club.website && (
                <a href={club.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-warmGray-600 transition-colors">
                  <Globe size={14} />{club.website}
                </a>
              )}
            </div>
          </div>
        </div>

        <SectionHeader
          title="Open Roles"
          subtitle={`${roles.length} role${roles.length !== 1 ? 's' : ''} available`}
          className="mb-6"
        />

        {roles.length === 0 ? (
          <EmptyStateCard emoji="📋" title="No open roles" description="This club isn't recruiting at the moment. Check back later!" />
        ) : (
          <div className="space-y-4">
            {roles.map((role) => {
              const alreadyApplied = appliedRoleIds.has(role._id);
              return (
                <Card key={role._id} hover>
                  <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-warmGray-800">{role.jobTitle}</h3>
                        <p className="mt-1 text-sm text-warmGray-500">{role.description}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-warmGray-400">
                          <span className="flex items-center gap-1"><Calendar size={12} />Deadline: {formatDate(role.deadline)}</span>
                          {role.applicationQuestions.length > 0 && (
                            <span>{role.applicationQuestions.length} question{role.applicationQuestions.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      {alreadyApplied ? (
                        <Button variant="outline" icon={<CheckCircle size={16} />} disabled>
                          Applied
                        </Button>
                      ) : (
                        <Link to={`/app/apply/${club._id}/${role._id}`}>
                          <Button variant="cozyGradient" icon={<ExternalLink size={16} />}>
                            Apply Now
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
