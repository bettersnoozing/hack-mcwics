import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Pencil, Save, Users, Settings, UserPlus } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { clubApi, type ClubInfo, type RosterMember, type JoinRequestEntry } from '../../services/clubApi';

export function ClubDashboard() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user, refreshUser } = useAuth();

  const [club, setClub] = useState<ClubInfo | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [requests, setRequests] = useState<JoinRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = club?.admins?.[0] === user?.id;
  const isApprovedExec = club?.execs?.includes(user?.id ?? '');

  const loadData = useCallback(async () => {
    if (!clubId) return;
    try {
      const [clubs, r] = await Promise.all([
        clubApi.listClubs(),
        clubApi.getRoster(clubId),
      ]);
      const c = clubs.find((cl) => cl._id === clubId) ?? null;
      setClub(c);
      setRoster(r);

      // Only superadmin can fetch join requests
      if (c && c.admins[0] === user?.id) {
        const reqs = await clubApi.listJoinRequests(clubId);
        setRequests(reqs);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clubId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Club edit state
  const [editClub, setEditClub] = useState(false);
  const [desc, setDesc] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [clubSaving, setClubSaving] = useState(false);

  useEffect(() => {
    if (club) {
      setDesc(club.description || '');
      setEmail(club.email || '');
      setWebsite(club.website || '');
      setTagsInput((club.tags ?? []).join(', '));
    }
  }, [club]);

  const saveClub = async () => {
    if (!clubId) return;
    setClubSaving(true);
    try {
      const cleanedTags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const updated = await clubApi.updateClub(clubId, {
        description: desc,
        email,
        website,
        tags: cleanedTags.length ? cleanedTags : undefined,
      });
      setClub(updated);
      setEditClub(false);
    } catch { /* ignore */ } finally { setClubSaving(false); }
  };

  // Profile edit state
  const [editProfile, setEditProfile] = useState(false);
  const [myPosition, setMyPosition] = useState(user?.execPosition || '');
  const [myBio, setMyBio] = useState(user?.bio || '');
  const [myPhoto, setMyPhoto] = useState(user?.profilePhotoUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    setMyPosition(user?.execPosition || '');
    setMyBio(user?.bio || '');
    setMyPhoto(user?.profilePhotoUrl || '');
  }, [user]);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await clubApi.updateExecProfile({ execPosition: myPosition, bio: myBio, profilePhotoUrl: myPhoto });
      await refreshUser();
      await loadData();
      setEditProfile(false);
    } catch { /* ignore */ } finally { setProfileSaving(false); }
  };

  // Approve / Reject
  const handleApprove = async (userId: string) => {
    if (!clubId) return;
    await clubApi.approveJoin(clubId, userId);
    await loadData();
  };
  const handleReject = async (userId: string) => {
    if (!clubId) return;
    await clubApi.rejectJoin(clubId, userId);
    await loadData();
  };

  if (loading) {
    return (
      <AnimatedPage>
        <PageContainer>
          <p className="text-warmGray-400 text-sm py-20 text-center">Loading club dashboard...</p>
        </PageContainer>
      </AnimatedPage>
    );
  }

  if (!club) {
    return (
      <AnimatedPage>
        <PageContainer>
          <p className="text-warmGray-400 text-sm py-20 text-center">Club not found.</p>
        </PageContainer>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer className="py-8 space-y-6">
        {/* Club Header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-warmGray-800">{club.name}</h1>
                {!editClub && (
                  <>
                    <p className="mt-1 text-sm text-warmGray-500">{club.description || 'No description'}</p>
                    {(club.tags ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {club.tags!.map((tag) => (
                          <Badge key={tag} variant="info">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex gap-4 text-xs text-warmGray-400">
                      {club.email && <span>{club.email}</span>}
                      {club.website && <a href={club.website} target="_blank" rel="noreferrer" className="underline">{club.website}</a>}
                    </div>
                  </>
                )}
              </div>
              {isApprovedExec && !editClub && (
                <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => setEditClub(true)}>Edit</Button>
              )}
            </div>
            {editClub && (
              <div className="mt-4 space-y-3">
                <Textarea label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
                <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
                <Input
                  label="Tags"
                  placeholder="e.g. AI, Robotics, Community"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="cozyGradient" icon={<Save size={14} />} onClick={saveClub} disabled={clubSaving}>
                    {clubSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditClub(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Profile */}
        {isApprovedExec && (
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-warmGray-500 flex items-center gap-1.5">
                  <Settings size={14} /> My Exec Profile
                </h2>
                {!editProfile && (
                  <Button variant="ghost" icon={<Pencil size={14} />} onClick={() => setEditProfile(true)}>Edit</Button>
                )}
              </div>
              {!editProfile ? (
                <div className="flex items-center gap-4">
                  {user?.profilePhotoUrl && (
                    <img src={user.profilePhotoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-medium text-warmGray-800">{user?.name}</p>
                    <p className="text-sm text-brand-500">{user?.execPosition || 'No position set'}</p>
                    <p className="text-xs text-warmGray-500 mt-1">{user?.bio || 'No bio'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input label="Position" value={myPosition} onChange={(e) => setMyPosition(e.target.value)} />
                  <Textarea label="Bio" value={myBio} onChange={(e) => setMyBio(e.target.value)} />
                  <Input label="Profile Photo URL" value={myPhoto} onChange={(e) => setMyPhoto(e.target.value)} />
                  <div className="flex gap-2">
                    <Button variant="cozyGradient" icon={<Save size={14} />} onClick={saveProfile} disabled={profileSaving}>
                      {profileSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditProfile(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Join Requests (superadmin only) */}
        {isSuperAdmin && requests.length > 0 && (
          <Card>
            <CardContent className="py-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-warmGray-500 flex items-center gap-1.5 mb-4">
                <UserPlus size={14} /> Join Requests ({requests.length})
              </h2>
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between rounded-xl border border-warmGray-200 p-4">
                    <div className="flex items-center gap-3">
                      {r.profilePhotoUrl ? (
                        <img src={r.profilePhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-500 text-sm font-bold">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-warmGray-800">{r.name}</p>
                        <p className="text-xs text-brand-500">{r.position}</p>
                        {r.bio && <p className="text-xs text-warmGray-500 mt-0.5">{r.bio}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r.userId)}
                        className="rounded-lg bg-calm-100 p-2 text-calm-600 hover:bg-calm-200 transition-colors cursor-pointer"
                        title="Approve"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleReject(r.userId)}
                        className="rounded-lg bg-cozy-100 p-2 text-cozy-600 hover:bg-cozy-200 transition-colors cursor-pointer"
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roster */}
        <Card>
          <CardContent className="py-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-warmGray-500 flex items-center gap-1.5 mb-4">
              <Users size={14} /> Executive Team ({roster.length})
            </h2>
            {roster.length === 0 ? (
              <p className="text-sm text-warmGray-400">No approved executives yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {roster.map((m) => (
                  <div key={m.userId} className="rounded-xl border border-warmGray-200 p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      {m.profilePhotoUrl ? (
                        <img src={m.profilePhotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-500 font-bold">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-warmGray-800 truncate">{m.name}</p>
                        <p className="text-xs text-brand-500">{m.position}</p>
                      </div>
                    </div>
                    {m.bio && <p className="text-xs text-warmGray-500 line-clamp-3">{m.bio}</p>}
                    {m.isSuperAdmin && <Badge variant="info">Admin</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </AnimatedPage>
  );
}
