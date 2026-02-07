import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, ExternalLink } from 'lucide-react';
import { AnimatedPage } from '../components/motion/AnimatedPage';
import { PageContainer } from '../components/layout/PageContainer';
import { SectionHeader } from '../components/layout/SectionHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyStateCard } from '../components/ui/EmptyStateCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { useApi } from '../contexts/ApiContext';
import type { Club, Position } from '../contracts';

export function ClubPage() {
  const { slug } = useParams<{ slug: string }>();
  const api = useApi();
  const [club, setClub] = useState<Club | undefined>();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    Promise.all([api.getClub(slug), api.getClubPositions(slug)]).then(([c, p]) => {
      setClub(c);
      setPositions(p);
      setLoading(false);
    });
  }, [api, slug]);

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

  return (
    <AnimatedPage>
      <PageContainer>
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to clubs
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-calm-100 text-2xl shadow-sm">
            {club.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-warmGray-800">{club.name}</h1>
              {club.isRecruiting && <Badge variant="success">Recruiting</Badge>}
            </div>
            <p className="mt-2 text-warmGray-500">{club.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {club.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-warmGray-400">
              <span className="flex items-center gap-1"><Users size={14} />{club.memberCount} members</span>
              <span className="flex items-center gap-1"><Calendar size={14} />Since {club.createdAt}</span>
            </div>
          </div>
        </div>

        <SectionHeader
          title="Open Positions"
          subtitle={`${positions.length} position${positions.length !== 1 ? 's' : ''} available`}
          className="mb-6"
        />

        {positions.length === 0 ? (
          <EmptyStateCard emoji="📋" title="No open positions" description="This club isn't recruiting at the moment. Check back later!" />
        ) : (
          <div className="space-y-4">
            {positions.map((pos) => (
              <Card key={pos.id} hover>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-warmGray-800">{pos.title}</h3>
                      <p className="mt-1 text-sm text-warmGray-500">{pos.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pos.requirements.map((req) => <Badge key={req} variant="info">{req}</Badge>)}
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-warmGray-400">
                        <span>Deadline: {pos.deadline}</span>
                        <span>{pos.applicantCount} applicants</span>
                      </div>
                    </div>
                    <Link to={`/app/apply/${club.slug}/${pos.id}`}>
                      <Button variant="cozyGradient" icon={<ExternalLink size={16} />}>
                        Apply Now
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
