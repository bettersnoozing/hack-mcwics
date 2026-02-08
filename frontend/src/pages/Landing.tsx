import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowDown, Terminal } from 'lucide-react';
import { AnimatedPage } from '../components/motion/AnimatedPage';
import { PageContainer } from '../components/layout/PageContainer';
import { SectionHeader } from '../components/layout/SectionHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { TabsSegmented } from '../components/ui/TabsSegmented';
import { AnimatedTabContent } from '../components/motion/AnimatedTabContent';
import { EmptyStateCard } from '../components/ui/EmptyStateCard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { discoverApi, type DiscoverClub } from '../services/discoverApi';

const filterTabs = [
  { key: 'all', label: 'All Clubs' },
  { key: 'recruiting', label: 'Recruiting' },
  { key: 'popular', label: 'Popular' },
];

function Snowflake({ delay, duration, left, size, drift }: { delay: number; duration: number; left: string; size: number; drift: number }) {
  return (
    <div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{
        left,
        top: '-20px',
        width: `${size}px`,
        height: `${size}px`,
        opacity: 0.6 + (size / 20),
        animation: `snowfall ${duration}s linear ${delay}s infinite`,
        '--drift': `${drift}px`,
      } as React.CSSProperties & { '--drift': string }}
    />
  );
}

function TypingText() {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const fullText = 'tracurriculars';

  useEffect(() => {
    if (isPaused) {
      // Longer pause for full word (3.5s), shorter for "myEx" (1.5s)
      const pauseDuration = text === fullText ? 3500 : text === '' ? 1500 : 0;
      if (pauseDuration > 0) {
        const pauseTimeout = setTimeout(() => {
          setIsPaused(false);
          setIsDeleting(text === fullText);
        }, pauseDuration);
        return () => clearTimeout(pauseTimeout);
      }
    }

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing forward
        if (text.length < fullText.length) {
          setText(fullText.slice(0, text.length + 1));
        } else {
          setIsPaused(true);
        }
      } else {
        // Deleting backward
        if (text.length > 0) {
          setText(fullText.slice(0, text.length - 1));
        } else {
          setIsPaused(true);
        }
      }
    }, isDeleting ? 50 : 100); // Faster when deleting

    return () => clearTimeout(timeout);
  }, [text, isDeleting, isPaused]);

  return (
    <span>
      <span className="text-red-600">my</span>
      <span className="text-blue-950">Ex{text}</span>
      <span className="animate-pulse">|</span>
    </span>
  );
}

export function Landing() {
  const [clubs, setClubs] = useState<DiscoverClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    discoverApi.listClubs()
      .then(setClubs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = clubs
    .filter((club) => {
      const q = search.toLowerCase();
      const matchesSearch =
        club.name.toLowerCase().includes(q) ||
        club.description.toLowerCase().includes(q);
      if (filter === 'recruiting') return matchesSearch && club.isRecruiting;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (filter === 'most_roles') return b.openRoleCount - a.openRoleCount;
      return 0;
    });

  const scrollToClubs = () => {
    document.getElementById('clubs-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Generate snowflakes with varying sizes - dots from 2px to 6px
  const snowflakes = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    delay: Math.random() * 8,
    duration: 3 + Math.random() * 4, // faster fall 3-7 seconds
    left: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 4, // small dots 2-6px
    drift: 50 + Math.random() * 100, // horizontal drift
  }));

  return (
    <AnimatedPage>
      <style>{`
        @keyframes snowfall {
          to {
            transform: translateY(100vh) translateX(var(--drift));
          }
        }
      `}</style>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {snowflakes.map((flake) => (
          <Snowflake
            key={flake.id}
            delay={flake.delay}
            duration={flake.duration}
            left={flake.left}
            size={flake.size}
            drift={flake.drift}
          />
        ))}
      </div>

      <div className="relative z-10">
        <PageContainer>
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center py-24 mb-20">
            <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 border-2 border-blue-400 rounded text-xs font-mono text-blue-900 bg-blue-100">
              <Terminal size={12} />
              <span>$ clubs --status=recruiting</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-950 tracking-tight font-mono leading-tight mb-4">
              winter blues?
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl">
                look no further than <TypingText />
              </span>
            </h1>
            
            <p className="mx-auto mt-12 max-w-2xl text-base text-blue-800 font-mono leading-relaxed">
              // browse mcgill tech clubs, explore positions,
              <br />
              // apply to clubs and fight those rejections!
            </p>
            
            <button
              onClick={scrollToClubs}
              className="mt-16 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-mono text-sm border-2 border-blue-600 hover:bg-cyan-400 hover:border-cyan-400 hover:text-blue-950 hover:scale-105 transition-all shadow-lg hover:shadow-cyan-400/50"
            >
              ./find-clubs
              <ArrowDown size={14} />
            </button>
          </div>

          <div id="clubs-section" className="scroll-mt-8 pt-12">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <Input
                  placeholder="search clubs, tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 font-mono text-sm bg-white border-blue-200 focus:border-brand-400"
                />
              </div>
              <TabsSegmented tabs={filterTabs} active={filter} onChange={setFilter} />
            </div>

            <SectionHeader
              title="Clubs"
              subtitle={loading ? 'loading...' : `${filtered.length} club${filtered.length !== 1 ? 's' : ''} found`}
              className="mb-8"
            />

            <AnimatedTabContent activeKey={filter}>
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyStateCard emoji="🔍" title="No clubs found" description="Try adjusting your search or filters." />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((club) => (
                    <Link key={club._id} to={`/clubs/${club._id}`}>
                      <Card hover className="h-full border-2 border-blue-200 hover:border-brand-400 hover:shadow-lg hover:shadow-brand-100/50 transition-all bg-white">
                        <CardContent className="p-6">
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex h-12 w-12 items-center justify-center border-2 border-blue-600 bg-blue-50 text-xl font-bold font-mono text-blue-900">
                              {club.name.charAt(0)}
                            </div>
                            {club.isRecruiting && <Badge variant="success">recruiting</Badge>}
                          </div>
                          
                          <h3 className="font-bold text-blue-950 font-mono text-lg">{club.name}</h3>
                          <p className="mt-3 text-sm text-blue-800 line-clamp-2 leading-relaxed">{club.description}</p>
                          
                          <div className="mt-4 flex flex-wrap gap-2">
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </AnimatedTabContent>
          </div>
        </PageContainer>
      </div>
    </AnimatedPage>
  );
}