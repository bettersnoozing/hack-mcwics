import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AnimatedPage } from '../components/motion/AnimatedPage';
import { PageContainer } from '../components/layout/PageContainer';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TabsSegmented } from '../components/ui/TabsSegmented';
import { AnimatedTabContent } from '../components/motion/AnimatedTabContent';

const authTabs = [
  { key: 'signin', label: 'Sign In' },
  { key: 'signup', label: 'Sign Up' },
];

export function AuthPage() {
  const [mode, setMode] = useState('signin');

  return (
    <AnimatedPage>
      <PageContainer className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cozy-400 to-brand-400 text-2xl shadow-md">
                🤝
              </div>
              <h1 className="text-xl font-bold text-warmGray-800">Welcome to McGill Clubs</h1>
              <p className="mt-1 text-sm text-warmGray-500">Use your McGill email to get started</p>
            </div>

            <div className="mb-6 flex justify-center">
              <TabsSegmented tabs={authTabs} active={mode} onChange={setMode} />
            </div>

            <AnimatedTabContent activeKey={mode}>
              {mode === 'signin' ? (
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <Input label="McGill Email" type="email" placeholder="you@mail.mcgill.ca" />
                  <Input label="Password" type="password" placeholder="Enter your password" />
                  <Button variant="cozyGradient" className="w-full" icon={<ArrowRight size={16} />}>
                    Sign In
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <Input label="Full Name" placeholder="Your full name" />
                  <Input label="McGill Email" type="email" placeholder="you@mail.mcgill.ca" />
                  <Input label="Password" type="password" placeholder="Create a password" />
                  <Input label="Confirm Password" type="password" placeholder="Confirm your password" />
                  <Button variant="cozyGradient" className="w-full" icon={<ArrowRight size={16} />}>
                    Create Account
                  </Button>
                </form>
              )}
            </AnimatedTabContent>

            <p className="mt-6 text-center text-xs text-warmGray-400">
              Only @mail.mcgill.ca and @mcgill.ca emails are accepted.
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    </AnimatedPage>
  );
}
