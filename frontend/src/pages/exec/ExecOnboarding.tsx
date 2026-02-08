import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserPlus, ArrowRight, Building } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { clubApi, type ClubInfo } from '../../services/clubApi';

type Step = 'choose' | 'create' | 'join';

export function ExecOnboarding() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<Step>('choose');
  const [clubs, setClubs] = useState<ClubInfo[]>([]);

  // Create form
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubEmail, setClubEmail] = useState('');
  const [clubWebsite, setClubWebsite] = useState('');

  // Shared exec profile fields
  const [position, setPosition] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Join
  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If user already has an adminClub, redirect
  useEffect(() => {
    if (user?.adminClub && user.roles.includes('CLUB_LEADER')) {
      navigate(`/exec/club/${user.adminClub}`, { replace: true });
    } else if (user?.adminClub) {
      // Pending state - show waiting message
    }
  }, [user, navigate]);

  useEffect(() => {
    clubApi.listClubs().then(setClubs).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!clubName.trim()) { setError('Club name is required'); return; }
    if (!position.trim()) { setError('Your position is required'); return; }
    setLoading(true);
    try {
      const club = await clubApi.createClub({
        name: clubName,
        description: clubDesc,
        email: clubEmail || undefined,
        website: clubWebsite || undefined,
        execPosition: position,
        bio: bio || undefined,
        profilePhotoUrl: photoUrl || undefined,
      });
      await refreshUser();
      navigate(`/exec/club/${club._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedClub) { setError('Select a club'); return; }
    if (!position.trim()) { setError('Your position is required'); return; }
    setLoading(true);
    try {
      await clubApi.requestJoin(selectedClub, {
        execPosition: position,
        bio: bio || undefined,
        profilePhotoUrl: photoUrl || undefined,
      });
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  // Pending state
  if (user?.adminClub && !user.roles.includes('CLUB_LEADER')) {
    return (
      <AnimatedPage>
        <PageContainer className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-calm-100 text-calm-500">
                <UserPlus size={28} />
              </div>
              <h2 className="text-lg font-bold text-warmGray-800">Request Pending</h2>
              <p className="mt-2 text-sm text-warmGray-500">
                Your request to join has been submitted. A club admin will review it soon.
              </p>
            </CardContent>
          </Card>
        </PageContainer>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
        {step === 'choose' && (
          <div className="w-full max-w-lg space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-warmGray-800">Executive Onboarding</h1>
              <p className="mt-1 text-sm text-warmGray-500">Create a new club or join an existing one</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStep('create')}>
                <CardContent className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-500">
                    <Plus size={24} />
                  </div>
                  <h3 className="font-semibold text-warmGray-800">Create a Club</h3>
                  <p className="mt-1 text-xs text-warmGray-500">Start a new club and become the admin</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStep('join')}>
                <CardContent className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-calm-100 text-calm-500">
                    <UserPlus size={24} />
                  </div>
                  <h3 className="font-semibold text-warmGray-800">Join a Club</h3>
                  <p className="mt-1 text-xs text-warmGray-500">Request to join an existing club's exec team</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {step === 'create' && (
          <Card className="w-full max-w-lg">
            <CardContent className="py-8">
              <button onClick={() => setStep('choose')} className="text-xs text-warmGray-400 hover:text-warmGray-600 mb-4 cursor-pointer">&larr; Back</button>
              <h2 className="text-lg font-bold text-warmGray-800 mb-1">Create Your Club</h2>
              <p className="text-sm text-warmGray-500 mb-6">Fill in your club details and your exec profile.</p>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="rounded-xl bg-warmGray-50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warmGray-500 flex items-center gap-1.5"><Building size={12} /> Club Info</p>
                  <Input label="Club Name" placeholder="e.g. McGill AI Society" value={clubName} onChange={(e) => setClubName(e.target.value)} required />
                  <Textarea label="Description" placeholder="What does your club do?" value={clubDesc} onChange={(e) => setClubDesc(e.target.value)} />
                  <Input label="Contact Email" type="email" placeholder="club@mcgill.ca" value={clubEmail} onChange={(e) => setClubEmail(e.target.value)} />
                  <Input label="Website" placeholder="https://..." value={clubWebsite} onChange={(e) => setClubWebsite(e.target.value)} />
                </div>
                <div className="rounded-xl bg-brand-50/50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Your Exec Profile</p>
                  <Input label="Your Position" placeholder="e.g. President" value={position} onChange={(e) => setPosition(e.target.value)} required />
                  <Textarea label="Bio" placeholder="Short bio about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
                  <Input label="Profile Photo URL" placeholder="https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                </div>
                {error && <p className="text-sm text-cozy-500">{error}</p>}
                <Button variant="cozyGradient" className="w-full" icon={<ArrowRight size={16} />} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Club'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'join' && (
          <Card className="w-full max-w-lg">
            <CardContent className="py-8">
              <button onClick={() => setStep('choose')} className="text-xs text-warmGray-400 hover:text-warmGray-600 mb-4 cursor-pointer">&larr; Back</button>
              <h2 className="text-lg font-bold text-warmGray-800 mb-1">Join a Club</h2>
              <p className="text-sm text-warmGray-500 mb-6">Select a club and provide your exec profile.</p>
              <form className="space-y-4" onSubmit={handleJoin}>
                <div className="rounded-xl bg-warmGray-50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-warmGray-500 mb-2">Select Club</p>
                  {clubs.length === 0 ? (
                    <p className="text-sm text-warmGray-400">No clubs yet. Ask an admin to create one, or create your own.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {clubs.map((c) => (
                        <label
                          key={c._id}
                          className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                            selectedClub === c._id ? 'border-brand-400 bg-brand-50' : 'border-warmGray-200 hover:bg-warmGray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="club"
                            value={c._id}
                            checked={selectedClub === c._id}
                            onChange={() => setSelectedClub(c._id)}
                            className="accent-brand-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-warmGray-800">{c.name}</p>
                            {c.description && <p className="text-xs text-warmGray-500 line-clamp-1">{c.description}</p>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl bg-brand-50/50 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Your Exec Profile</p>
                  <Input label="Your Position" placeholder="e.g. VP Finance" value={position} onChange={(e) => setPosition(e.target.value)} required />
                  <Textarea label="Bio" placeholder="Short bio about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
                  <Input label="Profile Photo URL" placeholder="https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                </div>
                {error && <p className="text-sm text-cozy-500">{error}</p>}
                <Button variant="cozyGradient" className="w-full" icon={<ArrowRight size={16} />} disabled={loading || !selectedClub}>
                  {loading ? 'Sending...' : 'Request to Join'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </AnimatedPage>
  );
}
