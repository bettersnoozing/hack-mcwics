import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { AnimatedPage } from '../components/motion/AnimatedPage';
import { PageContainer } from '../components/layout/PageContainer';
import { Chatbot } from '../components/Chatbot';

export function ChatPage() {
  return (
    <AnimatedPage>
      <PageContainer>
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-calm-400 shadow-lg">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-warmGray-800">Club Finder Chat</h1>
              <p className="text-warmGray-500">
                Ask our AI assistant to help you discover clubs and opportunities
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl">
          <Chatbot />
        </div>
      </PageContainer>
    </AnimatedPage>
  );
}
