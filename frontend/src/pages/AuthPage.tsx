import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AnimatedPage } from '../components/motion/AnimatedPage';
import { PageContainer } from '../components/layout/PageContainer';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { TabsSegmented } from '../components/ui/TabsSegmented';
import { AnimatedTabContent } from '../components/motion/AnimatedTabContent';
import { useAuth } from '../contexts/AuthContext';

const useRealAuth = import.meta.env.VITE_USE_REAL_AUTH === 'true';

const authTabs = [
  { key: 'signin', label: 'Sign In' },
  { key: 'signup', label: 'Sign Up' },
];

export function AuthPage() {
  const [mode, setMode] = useState('signin');
  const navigate = useNavigate();

  // Sign-in form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Sign-up form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Only use auth context when real auth is enabled
  const auth = useRealAuth ? useAuth() : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoginError('');
    setLoginLoading(true);
    try {
      const user = await auth.login(loginEmail, loginPassword);
      const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('CLUB_LEADER');
      navigate(isAdmin ? '/admin' : '/app');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setRegError('');

    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }

    setRegLoading(true);
    try {
      await auth.register(regEmail, regPassword, regName || undefined);
      navigate('/app');
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <PageContainer className="flex items-center justify-center min-h-[calc(100dvh-10rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl shadow-sm">
                🤝
              </div>
              <h1 className="text-xl font-bold text-warmGray-800">Welcome to McGill Clubs</h1>
              <p className="mt-1 text-sm text-warmGray-500">
                {useRealAuth
                  ? 'Use your McGill email to get started'
                  : 'Real auth is disabled — use Demo Mode to explore'}
              </p>
            </div>

            {!useRealAuth ? (
              <p className="text-center text-sm text-warmGray-500">
                Set <code className="rounded bg-warmGray-100 px-1 py-0.5 text-xs">VITE_USE_REAL_AUTH=true</code> to enable login.
              </p>
            ) : (
              <>
                <div className="mb-6 flex justify-center">
                  <TabsSegmented tabs={authTabs} active={mode} onChange={setMode} />
                </div>

                <AnimatedTabContent activeKey={mode}>
                  {mode === 'signin' ? (
                    <form className="space-y-4" onSubmit={handleLogin}>
                      <Input
                        label="McGill Email"
                        type="email"
                        placeholder="you@mail.mcgill.ca"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                      <Input
                        label="Password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      {loginError && <p className="text-sm text-cozy-500">{loginError}</p>}
                      <Button
                        variant="cozyGradient"
                        className="w-full"
                        icon={<ArrowRight size={16} />}
                        disabled={loginLoading}
                      >
                        {loginLoading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </form>
                  ) : (
                    <form className="space-y-4" onSubmit={handleRegister}>
                      <Input
                        label="Full Name"
                        placeholder="Your full name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                      />
                      <Input
                        label="McGill Email"
                        type="email"
                        placeholder="you@mail.mcgill.ca"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                      <Input
                        label="Password"
                        type="password"
                        placeholder="Create a password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                      <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="Confirm your password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        required
                      />
                      {regError && <p className="text-sm text-cozy-500">{regError}</p>}
                      <Button
                        variant="cozyGradient"
                        className="w-full"
                        icon={<ArrowRight size={16} />}
                        disabled={regLoading}
                      >
                        {regLoading ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </form>
                  )}
                </AnimatedTabContent>

                <p className="mt-6 text-center text-xs text-warmGray-400">
                  Only @mail.mcgill.ca and @mcgill.ca emails are accepted.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </AnimatedPage>
  );
}
