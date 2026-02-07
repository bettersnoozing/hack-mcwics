import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Users } from 'lucide-react';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useApi } from '../../contexts/ApiContext';
import { useDevSession } from '../../contexts/DevSessionContext';
import type { ForumChannel } from '../../contracts';

export function Forum() {
  const { applicationGroupId } = useParams<{ applicationGroupId: string }>();
  const api = useApi();
  const { session } = useDevSession();
  const [channel, setChannel] = useState<ForumChannel | undefined>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!applicationGroupId) return;
    api.getForumChannel(applicationGroupId).then((c) => { setChannel(c); setLoading(false); });
  }, [api, applicationGroupId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel || !session || !message.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const msgToSend = message.trim();
    setMessage('');
    try {
      await api.postForumMessage(channel.applicationGroupId, {
        senderId: session.id,
        senderName: session.name,
        body: msgToSend,
      });
      // Refetch channel to get the updated posts from localStorage
      const updated = await api.getForumChannel(channel.applicationGroupId);
      if (updated) setChannel(updated);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (loading) {
    return <PageContainer><SkeletonCard /><SkeletonCard className="mt-4" /></PageContainer>;
  }

  if (!channel) {
    return <PageContainer><EmptyStateCard emoji="💬" title="Forum not found" description="This discussion group doesn't exist." /></PageContainer>;
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <Link to="/app" className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-warmGray-800">
            {channel.clubName} — {channel.positionTitle}
          </h1>
          <div className="mt-1 flex items-center gap-1 text-sm text-warmGray-500">
            <Users size={14} />
            {channel.members.length} members: {channel.members.map((m) => m.name).join(', ')}
          </div>
        </div>

        <Card className="mb-4">
          <CardContent className="max-h-96 overflow-y-auto space-y-4">
            {channel.posts.length === 0 ? (
              <EmptyStateCard emoji="🗨️" title="No messages yet" description="Start the conversation!" />
            ) : (
              channel.posts.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100 text-xs font-medium text-brand-600">
                    {msg.senderName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-warmGray-700">{msg.senderName}</span>
                      <span className="text-xs text-warmGray-400">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-warmGray-600">{msg.body}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <form className="flex gap-2" onSubmit={handleSend}>
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button variant="cozyGradient" icon={<Send size={16} />} disabled={sending || !message.trim()}>
            Send
          </Button>
        </form>
      </PageContainer>
    </AnimatedPage>
  );
}
